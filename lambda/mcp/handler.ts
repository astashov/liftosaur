import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Endpoint, RouteHandler } from "yatro";
import { IDI } from "../utils/di";
import { Utils_getEnv, Utils_isLocal } from "../utils";
import { UserDao } from "../dao/userDao";
import { OauthDao } from "../dao/oauthDao";
import { mcpTools } from "./tools";
import {
  McpReference_getLiftoscriptReference,
  McpReference_getLiftoscriptExamples,
  McpReference_getLiftohistoryReference,
  McpReference_listBuiltinPrograms,
  McpReference_getBuiltinProgram,
  McpReference_listExercises,
} from "./reference";
import { McpToolExecutor_execute } from "./executor";
import { Subscriptions } from "../utils/subscriptions";
import { EventDao } from "../dao/eventDao";

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

// --- GET /mcp (SSE not supported on serverless) ---

export const getMcpEndpoint = Endpoint.build("/mcp");
export const getMcpHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getMcpEndpoint> = async () => {
  return {
    statusCode: 405,
    body: "",
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, authorization, mcp-protocol-version",
      "access-control-allow-methods": "OPTIONS,GET,POST,DELETE",
    },
  };
};

// --- DELETE /mcp (session termination) ---

export const deleteMcpEndpoint = Endpoint.build("/mcp");
export const deleteMcpHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof deleteMcpEndpoint> = async () => {
  return {
    statusCode: 200,
    body: "",
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, authorization, mcp-protocol-version",
      "access-control-allow-methods": "OPTIONS,GET,POST,DELETE",
    },
  };
};

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
          annotations: t.annotations,
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

  function fireEvent(userId?: string): void {
    new EventDao(di).post({
      type: "event",
      userId,
      timestamp: Date.now(),
      name: `mcp-${toolName}`,
      commithash: process.env.COMMIT_HASH ?? "",
    });
  }

  if (toolName === "get_liftoscript_reference") {
    fireEvent();
    di.log.log(`[MCP] ${toolName} -> ok (reference)`);
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text: McpReference_getLiftoscriptReference() }],
      })
    );
  }

  if (toolName === "get_liftoscript_examples") {
    fireEvent();
    di.log.log(`[MCP] ${toolName} -> ok (examples)`);
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text: McpReference_getLiftoscriptExamples() }],
      })
    );
  }

  if (toolName === "get_liftohistory_reference") {
    fireEvent();
    di.log.log(`[MCP] ${toolName} -> ok (reference)`);
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text: McpReference_getLiftohistoryReference() }],
      })
    );
  }

  if (toolName === "list_builtin_programs") {
    fireEvent();
    const programs = McpReference_listBuiltinPrograms();
    const text = programs.map((p) => `${p.id}: ${p.name}`).join("\n");
    di.log.log(`[MCP] ${toolName} -> ok (${programs.length} programs)`);
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text }],
      })
    );
  }

  if (toolName === "get_builtin_program") {
    fireEvent();
    const id = (args.id as string) || "";
    const content = McpReference_getBuiltinProgram(id);
    if (!content) {
      di.log.log(`[MCP] ${toolName} -> error: not found`);
      return mcpJson(
        200,
        jsonRpcResponse(req.id, {
          content: [{ type: "text", text: `Built-in program not found: ${id}` }],
          isError: true,
        })
      );
    }
    di.log.log(`[MCP] ${toolName} -> ok`);
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text: content }],
      })
    );
  }

  if (toolName === "list_exercises") {
    fireEvent();
    const exercises = McpReference_listExercises();
    const text = exercises.join("\n");
    di.log.log(`[MCP] ${toolName} -> ok (${exercises.length} exercises)`);
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text }],
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
    const baseUrl = Utils_isLocal()
      ? "https://local.liftosaur.com:8080"
      : Utils_getEnv() === "dev"
        ? "https://stage.liftosaur.com"
        : "https://www.liftosaur.com";
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
    di.log.log(`[MCP] ${toolName} -> 401: invalid/expired token`);
    const baseUrl = Utils_isLocal()
      ? "https://local.liftosaur.com:8080"
      : Utils_getEnv() === "dev"
        ? "https://stage.liftosaur.com"
        : "https://www.liftosaur.com";
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "unauthorized" }),
      headers: {
        "content-type": "application/json",
        "www-authenticate": `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
      },
    };
  }

  const userId = tokenRecord.userId;
  fireEvent(userId);
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

  const subscriptions = new Subscriptions(di.log, di.secrets);
  const hasSub = await subscriptions.hasSubscription(di, userId, user.storage.subscription);
  if (!hasSub) {
    di.log.log(`[MCP] ${toolName} -> 403: no subscription`);
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text: "Active subscription required to use MCP tools" }],
        isError: true,
      })
    );
  }

  const result = await McpToolExecutor_execute(toolName, args, userId, user, di);
  if (!result.success) {
    di.log.log(`[MCP] ${toolName} -> error: ${result.error.message}`);
    let errorText = result.error.message;
    if (result.error.details && result.error.details.length > 0) {
      const detailLines = result.error.details.map((d) => `Line ${d.line}, col ${d.offset}: ${d.message}`);
      errorText += "\n\nErrors:\n" + detailLines.join("\n");
    }
    const hint =
      toolName === "create_program" || toolName === "update_program" || toolName === "run_playground"
        ? "\n\nHint: If you haven't read the Liftoscript reference yet, call get_liftoscript_reference first."
        : "";
    return mcpJson(
      200,
      jsonRpcResponse(req.id, {
        content: [{ type: "text", text: `${errorText}${hint}` }],
        isError: true,
      })
    );
  }

  const text = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
  di.log.log(`[MCP] ${toolName} -> ok:\n${text}`);
  return mcpJson(200, jsonRpcResponse(req.id, { content: [{ type: "text", text }] }));
}
