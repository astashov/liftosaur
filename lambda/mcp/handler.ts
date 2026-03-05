import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Endpoint, RouteHandler } from "yatro";
import { IDI } from "../utils/di";
import { Utils_getEnv } from "../utils";
import { UserDao } from "../dao/userDao";
import { OauthDao } from "../dao/oauthDao";
import { mcpTools } from "./tools";
import { McpReference_getLiftoscriptReference, McpReference_getLiftohistoryReference } from "./reference";
import { McpToolExecutor_execute } from "./executor";

const SERVER_NAME = "liftosaur-mcp";
const SERVER_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2025-03-26";

interface IPayload {
  event: APIGatewayProxyEvent;
  di: IDI;
}

interface IJsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
}

function jsonRpcResponse(id: number | string | undefined, result: unknown): object {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: number | string | undefined, code: number, message: string): object {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function mcpJson(status: number, body: object): APIGatewayProxyResult {
  return {
    statusCode: status,
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, authorization, mcp-protocol-version",
      "access-control-allow-methods": "OPTIONS,GET,POST,DELETE",
    },
  };
}

function parseBody(event: APIGatewayProxyEvent): IJsonRpcRequest | undefined {
  try {
    const raw = event.body
      ? event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body
      : "";
    return JSON.parse(raw) as IJsonRpcRequest;
  } catch {
    return undefined;
  }
}

// --- POST /mcp ---

export const postMcpEndpoint = Endpoint.build("/mcp");
export const postMcpHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postMcpEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  const req = parseBody(event);
  if (!req || req.jsonrpc !== "2.0") {
    return mcpJson(400, { error: "Invalid JSON-RPC request" });
  }

  if (req.method === "initialize") {
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      })
    );
  }

  if (req.method === "notifications/initialized") {
    return { statusCode: 202, body: "", headers: mcpJson(202, {}).headers };
  }

  if (req.method === "tools/list") {
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        tools: mcpTools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      })
    );
  }

  if (req.method === "tools/call") {
    return handleToolCall(req, event, di);
  }

  if (req.method === "ping") {
    return mcpJson(200, jsonRpcResponse(req.id, {}));
  }

  return mcpJson(200, jsonRpcError(req.id, -32601, `Method not found: ${req.method}`));
};

async function handleToolCall(
  req: IJsonRpcRequest,
  event: APIGatewayProxyEvent,
  di: IDI
): Promise<APIGatewayProxyResult> {
  const toolName = (req.params?.name as string) || "";
  const args = (req.params?.arguments as Record<string, unknown>) || {};

  di.log.log(`[MCP] tools/call: ${toolName}`, JSON.stringify(args));

  if (toolName === "get_liftoscript_reference") {
    di.log.log(`[MCP] ${toolName} -> ok (reference)`);
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text: McpReference_getLiftoscriptReference() }],
      })
    );
  }

  if (toolName === "get_liftohistory_reference") {
    di.log.log(`[MCP] ${toolName} -> ok (reference)`);
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text: McpReference_getLiftohistoryReference() }],
      })
    );
  }

  const tool = mcpTools.find((t) => t.name === toolName);
  if (!tool) {
    di.log.log(`[MCP] ${toolName} -> error: unknown tool`);
    return mcpJson(200, jsonRpcError(req.id, -32602, `Unknown tool: ${toolName}`));
  }

  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    di.log.log(`[MCP] ${toolName} -> 401: no bearer token`);
    const baseUrl = Utils_getEnv() === "dev" ? "https://stage.liftosaur.com" : "https://www.liftosaur.com";
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "unauthorized" }),
      headers: {
        "content-type": "application/json",
        "www-authenticate": `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
      },
    };
  }

  const accessToken = authHeader.substring(7);
  const oauthDao = new OauthDao(di);
  const tokenRecord = await oauthDao.getByToken(accessToken);
  if (!tokenRecord || tokenRecord.expiresAt < Date.now()) {
    di.log.log(`[MCP] ${toolName} -> error: invalid/expired token`);
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text: "Invalid or expired access token" }],
        isError: true,
      })
    );
  }

  const userId = tokenRecord.userId;
  di.log.log(`[MCP] ${toolName} user=${userId}`);
  const userDao = new UserDao(di);
  const user = await userDao.getLimitedById(userId);
  if (!user) {
    di.log.log(`[MCP] ${toolName} -> error: user not found`);
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text: "User not found" }],
        isError: true,
      })
    );
  }

  const result = await McpToolExecutor_execute(toolName, args, userId, user, di);
  if (!result.success) {
    di.log.log(`[MCP] ${toolName} -> error: ${result.error.message}`);
    const hint =
      toolName === "create_program" || toolName === "update_program" || toolName === "run_playground"
        ? "\n\nHint: If you haven't read the Liftoscript reference yet, call get_liftoscript_reference first."
        : "";
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text: `${result.error.message}${hint}` }],
        isError: true,
      })
    );
  }

  const text = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
  di.log.log(`[MCP] ${toolName} -> ok (${text.length} chars)`);
  return mcpJson(200, jsonRpcResponse(req.id, { content: [{ type: "text", text }] }));
}
