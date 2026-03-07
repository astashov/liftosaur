/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRawHandler, IHandler } from "../lambda";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockLogUtil } from "./utils/mockLogUtil";
import { userTableNames } from "../lambda/dao/userDao";
import { freeUsersTableNames } from "../lambda/dao/freeUserDao";
import { OauthDao } from "../lambda/dao/oauthDao";
import { Storage_getDefault } from "../src/models/storage";
import { MockFetch } from "./utils/mockFetch";
import sinon from "sinon";

function buildMcpEvent(body: unknown, headers?: Record<string, string>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: headers || {},
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/mcp",
    pathParameters: {},
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    stageVariables: {},
    requestContext: {} as any,
    resource: "",
  };
}

function jsonRpc(method: string, params?: Record<string, unknown>): object {
  return { jsonrpc: "2.0", id: 1, method, params };
}

function toolCall(name: string, args?: Record<string, unknown>): object {
  return jsonRpc("tools/call", { name, arguments: args || {} });
}

function parseBody(result: APIGatewayProxyResult): any {
  return JSON.parse(result.body);
}

describe("MCP", () => {
  let sandbox: sinon.SinonSandbox;
  let di: IMockDI;
  let handler: IHandler;
  let userId: string;

  beforeEach(async () => {
    (global as any).__API_HOST__ = "https://www.liftosaur.com";
    (global as any).__HOST__ = "https://www.liftosaur.com";
    (global as any).__ENV__ = "prod";
    (global as any).__FULL_COMMIT_HASH__ = "abc123";
    (global as any).__COMMIT_HASH__ = "abc123";
    (global as any).Rollbar = { configure: () => undefined };

    sandbox = sinon.createSandbox();
    let ts = 1000000;
    sandbox.stub(Date, "now").callsFake(() => {
      ts += 1;
      return ts;
    });

    const storage = Storage_getDefault();
    userId = storage.tempUserId;
    storage.subscription = { apple: [], google: [], key: "test-sub-key" };

    const log = new MockLogUtil();
    const mockFetch = new MockFetch(userId, []);
    di = buildMockDi(log, mockFetch.fetch.bind(mockFetch));
    handler = getRawHandler(() => di);
    mockFetch.handler = handler;

    di.dynamo.addMockData({
      [userTableNames.prod.users]: {
        [JSON.stringify({ id: userId })]: {
          id: userId,
          email: "test@example.com",
          createdAt: Date.now(),
          storage,
        },
      },
      [freeUsersTableNames.prod.freeUsers]: {
        [JSON.stringify({ id: userId })]: {
          id: userId,
          key: "test-sub-key",
          isClaimed: true,
          expires: Date.now() + 999999999,
        },
      },
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  const ctx = { getRemainingTimeInMillis: () => 10000 };

  async function createOauthToken(): Promise<string> {
    const oauthDao = new OauthDao(di);
    const token = await oauthDao.createToken("test-client", userId);
    return token.token;
  }

  function authHeaders(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }

  describe("protocol", () => {
    it("handles initialize", async () => {
      const result = await handler(buildMcpEvent(jsonRpc("initialize")), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.serverInfo.name).to.equal("liftosaur-mcp");
      expect(body.result.protocolVersion).to.be.a("string");
    });

    it("handles notifications/initialized", async () => {
      const result = await handler(buildMcpEvent(jsonRpc("notifications/initialized")), ctx);
      expect(result.statusCode).to.equal(202);
    });

    it("handles ping", async () => {
      const result = await handler(buildMcpEvent(jsonRpc("ping")), ctx);
      expect(result.statusCode).to.equal(200);
      expect(parseBody(result).result).to.deep.equal({});
    });

    it("handles tools/list", async () => {
      const result = await handler(buildMcpEvent(jsonRpc("tools/list")), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      const toolNames = body.result.tools.map((t: any) => t.name);
      expect(toolNames).to.include("list_programs");
      expect(toolNames).to.include("get_history");
      expect(toolNames).to.include("run_playground");
      expect(toolNames).to.include("get_liftoscript_reference");
    });

    it("returns error for unknown method", async () => {
      const result = await handler(buildMcpEvent(jsonRpc("unknown/method")), ctx);
      expect(result.statusCode).to.equal(200);
      expect(parseBody(result).error.code).to.equal(-32601);
    });

    it("rejects invalid JSON-RPC", async () => {
      const result = await handler(buildMcpEvent({ not: "jsonrpc" }), ctx);
      expect(result.statusCode).to.equal(400);
    });
  });

  describe("auth", () => {
    it("rejects tool call without auth token", async () => {
      const result = await handler(buildMcpEvent(toolCall("list_programs")), ctx);
      expect(result.statusCode).to.equal(401);
    });

    it("rejects tool call with invalid token", async () => {
      const result = await handler(
        buildMcpEvent(toolCall("list_programs"), authHeaders("lftot_invalid")),
        ctx
      );
      expect(result.statusCode).to.equal(401);
    });

    it("rejects tool call when user has no subscription", async () => {
      const token = await createOauthToken();
      await di.dynamo.remove({ tableName: freeUsersTableNames.prod.freeUsers, key: { id: userId } });
      const user = await di.dynamo.get<any>({ tableName: userTableNames.prod.users, key: { id: userId } });
      user.storage.subscription = {};
      await di.dynamo.put({ tableName: userTableNames.prod.users, item: user });

      const result = await handler(buildMcpEvent(toolCall("list_programs"), authHeaders(token)), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
      expect(body.result.content[0].text).to.include("subscription required");
    });

    it("returns 401 with WWW-Authenticate header", async () => {
      const result = await handler(buildMcpEvent(toolCall("list_programs")), ctx);
      expect(result.statusCode).to.equal(401);
      expect(result.headers!["www-authenticate"]).to.include("oauth-protected-resource");
    });
  });

  describe("unauthenticated tools", () => {
    it("returns liftoscript reference", async () => {
      const result = await handler(buildMcpEvent(toolCall("get_liftoscript_reference")), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.content[0].text).to.include("Liftoscript");
    });

    it("returns liftohistory reference", async () => {
      const result = await handler(buildMcpEvent(toolCall("get_liftohistory_reference")), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.content[0].text).to.include("Liftohistory");
    });

    it("returns liftoscript examples", async () => {
      const result = await handler(buildMcpEvent(toolCall("get_liftoscript_examples")), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.content[0].text).to.include("Liftoscript");
    });

    it("lists exercises", async () => {
      const result = await handler(buildMcpEvent(toolCall("list_exercises")), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.content[0].text).to.include("Squat");
    });

    it("lists builtin programs", async () => {
      const result = await handler(buildMcpEvent(toolCall("list_builtin_programs")), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.content[0].text.length).to.be.greaterThan(0);
    });

    it("returns error for nonexistent builtin program", async () => {
      const result = await handler(buildMcpEvent(toolCall("get_builtin_program", { id: "nonexistent" })), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
    });
  });

  describe("programs", () => {
    let token: string;

    beforeEach(async () => {
      token = await createOauthToken();
    });

    it("lists empty programs", async () => {
      const result = await handler(buildMcpEvent(toolCall("list_programs"), authHeaders(token)), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.be.undefined;
    });

    it("creates a program", async () => {
      const programText = "# Week 1\n## Day 1\nSquat / 3x5 / 135lb / progress: lp(5lb)";
      const result = await handler(
        buildMcpEvent(toolCall("create_program", { name: "Test Program", text: programText }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.be.undefined;
      const data = JSON.parse(body.result.content[0].text);
      expect(data.id).to.be.a("string");
      expect(data.stats).to.not.be.undefined;
    });

    it("creates and gets a program", async () => {
      const programText = "# Week 1\n## Day 1\nSquat / 3x5 / 135lb / progress: lp(5lb)";
      const createResult = await handler(
        buildMcpEvent(toolCall("create_program", { name: "Test Program", text: programText }), authHeaders(token)),
        ctx
      );
      const createData = JSON.parse(parseBody(createResult).result.content[0].text);

      const getResult = await handler(
        buildMcpEvent(toolCall("get_program", { id: createData.id }), authHeaders(token)),
        ctx
      );
      expect(getResult.statusCode).to.equal(200);
      const getData = JSON.parse(parseBody(getResult).result.content[0].text);
      expect(getData.name).to.equal("Test Program");
      expect(getData.text).to.include("Squat");
    });

    it("updates a program", async () => {
      const programText = "# Week 1\n## Day 1\nSquat / 3x5 / 135lb / progress: lp(5lb)";
      const createResult = await handler(
        buildMcpEvent(toolCall("create_program", { name: "Test Program", text: programText }), authHeaders(token)),
        ctx
      );
      const createData = JSON.parse(parseBody(createResult).result.content[0].text);

      const updatedText = "# Week 1\n## Day 1\nSquat / 5x5 / 185lb / progress: lp(10lb)";
      const updateResult = await handler(
        buildMcpEvent(
          toolCall("update_program", { id: createData.id, text: updatedText, name: "Updated Program" }),
          authHeaders(token)
        ),
        ctx
      );
      expect(updateResult.statusCode).to.equal(200);
      const updateBody = parseBody(updateResult);
      expect(updateBody.result.isError).to.be.undefined;
      const updateData = JSON.parse(updateBody.result.content[0].text);
      expect(updateData.stats).to.not.be.undefined;
    });

    it("deletes a program", async () => {
      const programText = "# Week 1\n## Day 1\nSquat / 3x5 / 135lb / progress: lp(5lb)";
      const createResult = await handler(
        buildMcpEvent(toolCall("create_program", { name: "Test Program", text: programText }), authHeaders(token)),
        ctx
      );
      const createData = JSON.parse(parseBody(createResult).result.content[0].text);

      const deleteResult = await handler(
        buildMcpEvent(toolCall("delete_program", { id: createData.id }), authHeaders(token)),
        ctx
      );
      expect(deleteResult.statusCode).to.equal(200);
      expect(parseBody(deleteResult).result.isError).to.be.undefined;
    });

    it("returns error for invalid program syntax", async () => {
      const result = await handler(
        buildMcpEvent(toolCall("create_program", { name: "Bad", text: "not valid liftoscript" }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
    });

    it("returns error for unknown tool", async () => {
      const result = await handler(
        buildMcpEvent(toolCall("nonexistent_tool"), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      expect(parseBody(result).error.code).to.equal(-32602);
    });
  });

  describe("history", () => {
    let token: string;

    beforeEach(async () => {
      token = await createOauthToken();
    });

    it("returns empty history", async () => {
      const result = await handler(buildMcpEvent(toolCall("get_history"), authHeaders(token)), ctx);
      expect(result.statusCode).to.equal(200);
      expect(parseBody(result).result.isError).to.be.undefined;
    });

    it("creates a history record", async () => {
      const historyText = `2025-03-01 10:00:00 +00:00 / exercises: {\n  Squat / 3x5 100lb\n}`;
      const result = await handler(
        buildMcpEvent(toolCall("create_history_record", { text: historyText }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.be.undefined;
      const data = JSON.parse(body.result.content[0].text);
      expect(data.id).to.be.a("number");
    });

    it("creates and deletes a history record", async () => {
      const historyText = `2025-03-01 10:00:00 +00:00 / exercises: {\n  Squat / 3x5 100lb\n}`;
      const createResult = await handler(
        buildMcpEvent(toolCall("create_history_record", { text: historyText }), authHeaders(token)),
        ctx
      );
      const createData = JSON.parse(parseBody(createResult).result.content[0].text);

      const deleteResult = await handler(
        buildMcpEvent(toolCall("delete_history_record", { id: String(createData.id) }), authHeaders(token)),
        ctx
      );
      expect(deleteResult.statusCode).to.equal(200);
      expect(parseBody(deleteResult).result.isError).to.be.undefined;
    });

    it("returns error for invalid history text", async () => {
      const result = await handler(
        buildMcpEvent(toolCall("create_history_record", { text: "not valid" }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
    });
  });

  describe("playground", () => {
    let token: string;

    beforeEach(async () => {
      token = await createOauthToken();
    });

    it("runs playground with valid program", async () => {
      const programText = "# Week 1\n## Day 1\nSquat / 3x5 / 135lb / progress: lp(5lb)";
      const result = await handler(
        buildMcpEvent(toolCall("run_playground", { programText }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.be.undefined;
      const data = JSON.parse(body.result.content[0].text);
      expect(data.stats).to.not.be.undefined;
    });

    it("runs playground with commands", async () => {
      const programText = "# Week 1\n## Day 1\nSquat / 3x5 / 135lb / progress: lp(5lb)";
      const commands = JSON.stringify(["complete_set(1, 1)", "complete_set(1, 2)", "complete_set(1, 3)"]);
      const result = await handler(
        buildMcpEvent(toolCall("run_playground", { programText, commands }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      expect(parseBody(result).result.isError).to.be.undefined;
    });

    it("runs playground with finish_workout", async () => {
      const programText = "# Week 1\n## Day 1\nSquat / 3x5 / 135lb / progress: lp(5lb)";
      const commands = JSON.stringify([
        "complete_set(1, 1)", "complete_set(1, 2)", "complete_set(1, 3)",
        "finish_workout()",
      ]);
      const result = await handler(
        buildMcpEvent(toolCall("run_playground", { programText, commands }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.be.undefined;
      const data = JSON.parse(body.result.content[0].text);
      expect(data.updatedProgramText).to.include("Squat");
    });

    it("returns error for invalid playground program", async () => {
      const result = await handler(
        buildMcpEvent(toolCall("run_playground", { programText: "invalid" }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
      expect(body.result.content[0].text).to.include("Hint");
    });
  });
});
