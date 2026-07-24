/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRawHandler, IHandler } from "../lambda";
import { mcpTools } from "../lambda/mcp/tools";
import { EQUIPMENT_WRITABLE_FIELDS } from "../lambda/utils/apiv1Equipment";
import { EXERCISE_DATA_WRITABLE_FIELDS } from "../lambda/utils/apiv1ExerciseData";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockLogUtil } from "./utils/mockLogUtil";
import { userTableNames } from "../lambda/dao/userDao";
import { freeUsersTableNames } from "../lambda/dao/freeUserDao";
import { OauthDao } from "../lambda/dao/oauthDao";
import { ApiKeyDao } from "../lambda/dao/apiKeyDao";
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

  async function createApiKey(): Promise<string> {
    const apiKeyDao = new ApiKeyDao(di);
    const apiKey = await apiKeyDao.create(userId, "test-key");
    return apiKey.key;
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
      for (const tool of body.result.tools) {
        expect(tool.outputSchema?.type).to.equal("object");
      }
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
      const result = await handler(buildMcpEvent(toolCall("list_programs"), authHeaders("lftot_invalid")), ctx);
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

    it("authenticates a tool call with an API key", async () => {
      const apiKey = await createApiKey();
      const result = await handler(buildMcpEvent(toolCall("list_programs"), authHeaders(apiKey)), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.be.undefined;
    });

    it("rejects tool call with invalid API key", async () => {
      const result = await handler(buildMcpEvent(toolCall("list_programs"), authHeaders("lftsk_invalid")), ctx);
      expect(result.statusCode).to.equal(401);
    });

    it("rejects tool call with API key when user has no subscription", async () => {
      const apiKey = await createApiKey();
      await di.dynamo.remove({ tableName: freeUsersTableNames.prod.freeUsers, key: { id: userId } });
      const user = await di.dynamo.get<any>({ tableName: userTableNames.prod.users, key: { id: userId } });
      user.storage.subscription = {};
      await di.dynamo.put({ tableName: userTableNames.prod.users, item: user });

      const result = await handler(buildMcpEvent(toolCall("list_programs"), authHeaders(apiKey)), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
      expect(body.result.content[0].text).to.include("subscription required");
    });

    // storage.subscription.key is server-derived and never persisted, so a valid free user's server-read storage
    // has no key. Entitlement must still be granted from the lftFreeUsers row via OAuth.
    it("grants access via a valid free-user key when storage.subscription.key is absent", async () => {
      const token = await createOauthToken();
      const user = await di.dynamo.get<any>({ tableName: userTableNames.prod.users, key: { id: userId } });
      user.storage.subscription = { apple: [], google: [] };
      await di.dynamo.put({ tableName: userTableNames.prod.users, item: user });

      const result = await handler(buildMcpEvent(toolCall("list_programs"), authHeaders(token)), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.be.undefined;
    });

    it("grants access via a valid free-user key with an API key when storage.subscription.key is absent", async () => {
      const apiKey = await createApiKey();
      const user = await di.dynamo.get<any>({ tableName: userTableNames.prod.users, key: { id: userId } });
      user.storage.subscription = { apple: [], google: [] };
      await di.dynamo.put({ tableName: userTableNames.prod.users, item: user });

      const result = await handler(buildMcpEvent(toolCall("list_programs"), authHeaders(apiKey)), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.be.undefined;
    });

    // An expired free-user row must NOT grant access, even though the row exists.
    it("rejects when the free-user key is expired and storage has no receipts", async () => {
      const token = await createOauthToken();
      await di.dynamo.put({
        tableName: freeUsersTableNames.prod.freeUsers,
        item: { id: userId, key: "test-sub-key", isClaimed: true, expires: Date.now() - 1 },
      });
      const user = await di.dynamo.get<any>({ tableName: userTableNames.prod.users, key: { id: userId } });
      user.storage.subscription = { apple: [], google: [] };
      await di.dynamo.put({ tableName: userTableNames.prod.users, item: user });

      const result = await handler(buildMcpEvent(toolCall("list_programs"), authHeaders(token)), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
      expect(body.result.content[0].text).to.include("subscription required");
    });
  });

  describe("unauthenticated tools", () => {
    it("returns liftoscript reference", async () => {
      const result = await handler(buildMcpEvent(toolCall("get_liftoscript_reference")), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.content[0].text).to.include("Liftoscript");
      expect(body.result.structuredContent.text).to.include("Liftoscript");
    });

    it("returns program design guide", async () => {
      const result = await handler(buildMcpEvent(toolCall("get_program_design_guide")), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.content[0].text).to.include("Program Design Guide");
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
      expect(body.result.structuredContent.id).to.equal(data.id);
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
      const result = await handler(buildMcpEvent(toolCall("nonexistent_tool"), authHeaders(token)), ctx);
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
      const result = await handler(buildMcpEvent(toolCall("run_playground", { programText }), authHeaders(token)), ctx);
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
        "complete_set(1, 1)",
        "complete_set(1, 2)",
        "complete_set(1, 3)",
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

    it("completes a set with no weight and progresses it (auto-answers the ask-weight modal)", async () => {
      // A bodyweight set has no weight, so completing it opens the ask-weight modal in the app. The playground
      // must auto-answer it, otherwise the set never finalizes and progression can't fire.
      const programText = "# Week 1\n## Day 1\nPull Up / 3x5 / progress: lp(1lb)";
      const commands = JSON.stringify([
        "complete_set(1, 1)",
        "complete_set(1, 2)",
        "complete_set(1, 3)",
        "finish_workout()",
      ]);
      const result = await handler(
        buildMcpEvent(toolCall("run_playground", { programText, commands }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const data = JSON.parse(parseBody(result).result.content[0].text);
      // The completed exercise shows up in the serialized workout (empty before the fix).
      expect(data.workout).to.include("Pull Up");
      // lp(1lb) fired, bumping the weight from empty to 1lb.
      expect(data.updatedProgramText).to.include("Pull Up / 3x5 / 1lb");
    });

    it("completes an AMRAP set and progresses it (auto-answers the AMRAP modal)", async () => {
      const programText = "# Week 1\n## Day 1\nSquat / 2x5 100lb, 1x5+ 100lb / progress: lp(5lb)";
      const commands = JSON.stringify([
        "complete_set(1, 1)",
        "complete_set(1, 2)",
        "complete_set(1, 3)",
        "finish_workout()",
      ]);
      const result = await handler(
        buildMcpEvent(toolCall("run_playground", { programText, commands }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const data = JSON.parse(parseBody(result).result.content[0].text);
      expect(data.workout).to.include("Squat");
      expect(data.updatedProgramText).to.include("105lb");
    });

    it("completes a timed (isometric hold) set and records the held time so progression fires", async () => {
      // Completing a timed set opens the set-timer clock in the app and finishes on a second "Stop & Record"
      // signal. The playground must fire that second signal itself, recording the programmed hold duration -
      // otherwise the set stays uncompleted and the hold progression never runs.
      // The progression graduates once the held time reaches the programmed target (completedSetTime >= setTime),
      // which is the realistic hold pattern used by the Recommended Routine.
      const programText =
        "# Week 1\n## Day 1\nPlank / 3x1 0lb 20s|60s / progress: custom(hold: 0) {~\n  if (completedSetTime >= setTime) {\n    state.hold += 5\n  }\n~}";
      const commands = JSON.stringify([
        "complete_set(1, 1)",
        "complete_set(1, 2)",
        "complete_set(1, 3)",
        "finish_workout()",
      ]);
      const result = await handler(
        buildMcpEvent(toolCall("run_playground", { programText, commands }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const data = JSON.parse(parseBody(result).result.content[0].text);
      expect(data.workout).to.include("Plank");
      // Held the full 20s target, so completedSetTime >= setTime fired and bumped hold from 0 to 5.
      expect(data.updatedProgramText).to.include("hold: 5");
    });

    it("change_set_time overrides only the recorded held time, not the target, so short holds fail progression", async () => {
      const programText =
        "# Week 1\n## Day 1\nPlank / 3x1 0lb 20s|60s / progress: custom(hold: 0) {~\n  if (completedSetTime >= setTime) {\n    state.hold += 5\n  }\n~}";
      const commands = JSON.stringify([
        "complete_set(1, 1)",
        "complete_set(1, 2)",
        "complete_set(1, 3)",
        "change_set_time(1, 1, 10)",
        "change_set_time(1, 2, 10)",
        "change_set_time(1, 3, 10)",
        "finish_workout()",
      ]);
      const result = await handler(
        buildMcpEvent(toolCall("run_playground", { programText, commands }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const data = JSON.parse(parseBody(result).result.content[0].text);
      // change_set_time lowered completedSetTime to 10 but left the 20s target intact, so
      // completedSetTime (10) >= setTime (20) is false and the progression does not fire.
      expect(data.updatedProgramText).to.include("hold: 0");
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

  describe("custom exercises", () => {
    let token: string;

    beforeEach(async () => {
      token = await createOauthToken();
    });

    it("lists empty custom exercises", async () => {
      const result = await handler(buildMcpEvent(toolCall("list_custom_exercises"), authHeaders(token)), ctx);
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.be.undefined;
      const data = JSON.parse(body.result.content[0].text);
      expect(data.exercises).to.deep.equal([]);
      expect(data.hasMore).to.equal(false);
    });

    it("creates a custom exercise with name only", async () => {
      const result = await handler(
        buildMcpEvent(toolCall("create_custom_exercise", { name: "Zercher Carry" }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.be.undefined;
      const data = JSON.parse(body.result.content[0].text);
      expect(data.id).to.be.a("string");
      expect(data.name).to.equal("Zercher Carry");
      expect(data.targetMuscles).to.deep.equal([]);
      expect(data.types).to.deep.equal([]);
    });

    it("creates a custom exercise with muscles and types", async () => {
      const result = await handler(
        buildMcpEvent(
          toolCall("create_custom_exercise", {
            name: "Sled Push",
            targetMuscles: JSON.stringify(["Quadriceps", "Gluteus Maximus"]),
            synergistMuscles: JSON.stringify(["Hamstrings", "Gastrocnemius"]),
            types: JSON.stringify(["push", "legs"]),
          }),
          authHeaders(token)
        ),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const data = JSON.parse(parseBody(result).result.content[0].text);
      expect(data.name).to.equal("Sled Push");
      expect(data.targetMuscles).to.deep.equal(["Quadriceps", "Gluteus Maximus"]);
      expect(data.synergistMuscles).to.deep.equal(["Hamstrings", "Gastrocnemius"]);
      expect(data.types).to.deep.equal(["push", "legs"]);
    });

    it("rejects empty name", async () => {
      const result = await handler(
        buildMcpEvent(toolCall("create_custom_exercise", { name: "  " }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
      expect(body.result.content[0].text).to.include("name");
    });

    it("rejects invalid muscle names", async () => {
      const result = await handler(
        buildMcpEvent(
          toolCall("create_custom_exercise", {
            name: "Sled Push",
            targetMuscles: JSON.stringify(["Quadriceps", "NotARealMuscle"]),
          }),
          authHeaders(token)
        ),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
      expect(body.result.content[0].text).to.include("Invalid muscle");
    });

    it("rejects invalid exercise types", async () => {
      const result = await handler(
        buildMcpEvent(
          toolCall("create_custom_exercise", {
            name: "Sled Push",
            types: JSON.stringify(["push", "flying"]),
          }),
          authHeaders(token)
        ),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
      expect(body.result.content[0].text).to.include("Invalid exercise type");
    });

    it("rejects invalid muscles on update", async () => {
      const createResult = await handler(
        buildMcpEvent(toolCall("create_custom_exercise", { name: "Sled Push" }), authHeaders(token)),
        ctx
      );
      const createData = JSON.parse(parseBody(createResult).result.content[0].text);

      const result = await handler(
        buildMcpEvent(
          toolCall("update_custom_exercise", {
            id: createData.id,
            synergistMuscles: JSON.stringify(["FakeMuscle"]),
          }),
          authHeaders(token)
        ),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
      expect(body.result.content[0].text).to.include("Invalid muscle");
    });

    it("creates and gets a custom exercise", async () => {
      const createResult = await handler(
        buildMcpEvent(toolCall("create_custom_exercise", { name: "Sled Push" }), authHeaders(token)),
        ctx
      );
      const createData = JSON.parse(parseBody(createResult).result.content[0].text);

      const getResult = await handler(
        buildMcpEvent(toolCall("get_custom_exercise", { id: createData.id }), authHeaders(token)),
        ctx
      );
      expect(getResult.statusCode).to.equal(200);
      const getData = JSON.parse(parseBody(getResult).result.content[0].text);
      expect(getData.name).to.equal("Sled Push");
      expect(getData.id).to.equal(createData.id);
    });

    it("returns error for nonexistent custom exercise", async () => {
      const result = await handler(
        buildMcpEvent(toolCall("get_custom_exercise", { id: "nonexistent" }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
      expect(body.result.content[0].text).to.include("not found");
    });

    it("lists created custom exercises", async () => {
      await handler(
        buildMcpEvent(toolCall("create_custom_exercise", { name: "Banana Curl" }), authHeaders(token)),
        ctx
      );
      await handler(
        buildMcpEvent(toolCall("create_custom_exercise", { name: "Axle Deadlift" }), authHeaders(token)),
        ctx
      );

      const result = await handler(buildMcpEvent(toolCall("list_custom_exercises"), authHeaders(token)), ctx);
      const data = JSON.parse(parseBody(result).result.content[0].text);
      expect(data.exercises).to.have.lengthOf(2);
      expect(data.exercises[0].name).to.equal("Axle Deadlift");
      expect(data.exercises[1].name).to.equal("Banana Curl");
    });

    it("paginates custom exercises", async () => {
      await handler(buildMcpEvent(toolCall("create_custom_exercise", { name: "Exercise A" }), authHeaders(token)), ctx);
      await handler(buildMcpEvent(toolCall("create_custom_exercise", { name: "Exercise B" }), authHeaders(token)), ctx);
      await handler(buildMcpEvent(toolCall("create_custom_exercise", { name: "Exercise C" }), authHeaders(token)), ctx);

      const page1 = await handler(
        buildMcpEvent(toolCall("list_custom_exercises", { limit: "2" }), authHeaders(token)),
        ctx
      );
      const page1Data = JSON.parse(parseBody(page1).result.content[0].text);
      expect(page1Data.exercises).to.have.lengthOf(2);
      expect(page1Data.hasMore).to.equal(true);
      expect(page1Data.nextCursor).to.be.a("string");

      const page2 = await handler(
        buildMcpEvent(
          toolCall("list_custom_exercises", { limit: "2", cursor: page1Data.nextCursor }),
          authHeaders(token)
        ),
        ctx
      );
      const page2Data = JSON.parse(parseBody(page2).result.content[0].text);
      expect(page2Data.exercises).to.have.lengthOf(1);
      expect(page2Data.hasMore).to.equal(false);
    });

    it("updates a custom exercise name", async () => {
      const createResult = await handler(
        buildMcpEvent(toolCall("create_custom_exercise", { name: "Old Name" }), authHeaders(token)),
        ctx
      );
      const createData = JSON.parse(parseBody(createResult).result.content[0].text);

      const updateResult = await handler(
        buildMcpEvent(toolCall("update_custom_exercise", { id: createData.id, name: "New Name" }), authHeaders(token)),
        ctx
      );
      expect(updateResult.statusCode).to.equal(200);
      const updateData = JSON.parse(parseBody(updateResult).result.content[0].text);
      expect(updateData.name).to.equal("New Name");
      expect(updateData.id).to.equal(createData.id);
    });

    it("updates custom exercise muscles", async () => {
      const createResult = await handler(
        buildMcpEvent(
          toolCall("create_custom_exercise", {
            name: "Sled Push",
            targetMuscles: JSON.stringify(["Quadriceps"]),
          }),
          authHeaders(token)
        ),
        ctx
      );
      const createData = JSON.parse(parseBody(createResult).result.content[0].text);

      const updateResult = await handler(
        buildMcpEvent(
          toolCall("update_custom_exercise", {
            id: createData.id,
            targetMuscles: JSON.stringify(["Quadriceps", "Gluteus Maximus"]),
            synergistMuscles: JSON.stringify(["Hamstrings"]),
          }),
          authHeaders(token)
        ),
        ctx
      );
      const updateData = JSON.parse(parseBody(updateResult).result.content[0].text);
      expect(updateData.name).to.equal("Sled Push");
      expect(updateData.targetMuscles).to.deep.equal(["Quadriceps", "Gluteus Maximus"]);
      expect(updateData.synergistMuscles).to.deep.equal(["Hamstrings"]);
    });

    it("preserves unchanged fields on update", async () => {
      const createResult = await handler(
        buildMcpEvent(
          toolCall("create_custom_exercise", {
            name: "Sled Push",
            targetMuscles: JSON.stringify(["Quadriceps"]),
            types: JSON.stringify(["push", "legs"]),
          }),
          authHeaders(token)
        ),
        ctx
      );
      const createData = JSON.parse(parseBody(createResult).result.content[0].text);

      const updateResult = await handler(
        buildMcpEvent(
          toolCall("update_custom_exercise", { id: createData.id, name: "Sled Drive" }),
          authHeaders(token)
        ),
        ctx
      );
      const updateData = JSON.parse(parseBody(updateResult).result.content[0].text);
      expect(updateData.name).to.equal("Sled Drive");
      expect(updateData.targetMuscles).to.deep.equal(["Quadriceps"]);
      expect(updateData.types).to.deep.equal(["push", "legs"]);
    });

    it("returns error when updating nonexistent exercise", async () => {
      const result = await handler(
        buildMcpEvent(toolCall("update_custom_exercise", { id: "nonexistent", name: "Foo" }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
      expect(body.result.content[0].text).to.include("not found");
    });

    it("deletes a custom exercise", async () => {
      const createResult = await handler(
        buildMcpEvent(toolCall("create_custom_exercise", { name: "Sled Push" }), authHeaders(token)),
        ctx
      );
      const createData = JSON.parse(parseBody(createResult).result.content[0].text);

      const deleteResult = await handler(
        buildMcpEvent(toolCall("delete_custom_exercise", { id: createData.id }), authHeaders(token)),
        ctx
      );
      expect(deleteResult.statusCode).to.equal(200);
      expect(parseBody(deleteResult).result.isError).to.be.undefined;

      const getResult = await handler(
        buildMcpEvent(toolCall("get_custom_exercise", { id: createData.id }), authHeaders(token)),
        ctx
      );
      expect(parseBody(getResult).result.isError).to.equal(true);
    });

    it("deleted exercises don't appear in list", async () => {
      const createResult = await handler(
        buildMcpEvent(toolCall("create_custom_exercise", { name: "Sled Push" }), authHeaders(token)),
        ctx
      );
      const createData = JSON.parse(parseBody(createResult).result.content[0].text);

      await handler(buildMcpEvent(toolCall("delete_custom_exercise", { id: createData.id }), authHeaders(token)), ctx);

      const listResult = await handler(buildMcpEvent(toolCall("list_custom_exercises"), authHeaders(token)), ctx);
      const listData = JSON.parse(parseBody(listResult).result.content[0].text);
      expect(listData.exercises).to.deep.equal([]);
    });

    it("returns error when deleting nonexistent exercise", async () => {
      const result = await handler(
        buildMcpEvent(toolCall("delete_custom_exercise", { id: "nonexistent" }), authHeaders(token)),
        ctx
      );
      expect(result.statusCode).to.equal(200);
      const body = parseBody(result);
      expect(body.result.isError).to.equal(true);
      expect(body.result.content[0].text).to.include("not found");
    });
  });

  describe("gyms and equipment", () => {
    let token: string;

    beforeEach(async () => {
      token = await createOauthToken();
    });

    async function callTool(name: string, args?: Record<string, unknown>): Promise<any> {
      const result = await handler(buildMcpEvent(toolCall(name, args), authHeaders(token)), ctx);
      expect(result.statusCode).to.equal(200);
      return parseBody(result).result;
    }

    function toolData(res: any): any {
      expect(res.isError, res.content?.[0]?.text).to.be.undefined;
      return JSON.parse(res.content[0].text);
    }

    async function firstGymId(): Promise<string> {
      const data = toolData(await callTool("list_gyms"));
      return data.gyms[0].id;
    }

    it("exposes every writable equipment field in the update and create tool schemas", () => {
      for (const toolName of ["update_equipment", "create_custom_equipment"]) {
        const tool = mcpTools.find((t) => t.name === toolName)!;
        const props = Object.keys(tool.inputSchema.properties);
        for (const field of EQUIPMENT_WRITABLE_FIELDS) {
          expect(props, `${toolName} is missing the '${field}' field`).to.include(field);
        }
      }
    });

    it("lists the default gym", async () => {
      const data = toolData(await callTool("list_gyms"));
      expect(data.gyms).to.have.lengthOf(1);
      expect(data.gyms[0].id).to.be.a("string");
      expect(data.gyms[0].equipmentCount).to.be.greaterThan(0);
    });

    it("lists built-in equipment for a gym", async () => {
      const gymId = await firstGymId();
      const data = toolData(await callTool("list_equipment", { gymId }));
      const ids = data.equipment.map((e: any) => e.id);
      expect(ids).to.include("barbell");
      expect(ids).to.include("dumbbell");
    });

    it("returns 404 for unknown gym", async () => {
      const res = await callTool("list_equipment", { gymId: "nope" });
      expect(res.isError).to.equal(true);
      expect(res.content[0].text).to.include("Gym not found");
    });

    it("updates barbell plates and bar, returns parsed weights", async () => {
      const gymId = await firstGymId();
      const data = toolData(
        await callTool("update_equipment", {
          gymId,
          id: "barbell",
          bar: JSON.stringify({ lb: "45lb", kg: "20kg" }),
          plates: JSON.stringify([
            { weight: "45lb", num: 8 },
            { weight: "25lb", num: 2 },
          ]),
        })
      );
      expect(data.bar.lb).to.equal("45lb");
      expect(data.plates).to.deep.equal([
        { weight: "45lb", num: 8 },
        { weight: "25lb", num: 2 },
      ]);
    });

    it("clamps out-of-range plate counts and weights", async () => {
      const gymId = await firstGymId();
      const data = toolData(
        await callTool("update_equipment", {
          gymId,
          id: "barbell",
          plates: JSON.stringify([{ weight: "999999lb", num: 999999 }]),
          multiplier: "999999",
        })
      );
      expect(data.plates[0].num).to.equal(200);
      expect(data.plates[0].weight).to.equal("5000lb");
      expect(data.multiplier).to.equal(10);
    });

    it("rejects malformed weight strings", async () => {
      const gymId = await firstGymId();
      for (const weight of ["heavy", "...lb", "+.kg", "1.2.3lb", "lb", "45"]) {
        const res = await callTool("update_equipment", {
          gymId,
          id: "barbell",
          plates: JSON.stringify([{ weight, num: 4 }]),
        });
        expect(res.isError, `expected ${weight} to be rejected`).to.equal(true);
        expect(res.content[0].text).to.include("Invalid weight");
      }
    });

    it("does not silently coerce malformed weights into the stored equipment", async () => {
      const gymId = await firstGymId();
      const before = toolData(await callTool("get_equipment", { gymId, id: "barbell" }));
      await callTool("update_equipment", {
        gymId,
        id: "barbell",
        plates: JSON.stringify([{ weight: "...lb", num: 4 }]),
      });
      const after = toolData(await callTool("get_equipment", { gymId, id: "barbell" }));
      expect(after.plates).to.deep.equal(before.plates);
    });

    it("applies similarTo, useBodyweightForBar, and isAssisting", async () => {
      const gymId = await firstGymId();
      const data = toolData(
        await callTool("update_equipment", {
          gymId,
          id: "barbell",
          similarTo: "dumbbell",
          useBodyweightForBar: "true",
          isAssisting: "true",
        })
      );
      expect(data.similarTo).to.equal("dumbbell");
      expect(data.useBodyweightForBar).to.equal(true);
      expect(data.isAssisting).to.equal(true);
    });

    it("rejects similarTo that is not a built-in equipment key", async () => {
      const gymId = await firstGymId();
      const res = await callTool("update_equipment", { gymId, id: "barbell", similarTo: "not-real" });
      expect(res.isError).to.equal(true);
    });

    it("rejects a bar weight whose unit does not match the key", async () => {
      const gymId = await firstGymId();
      const res = await callTool("update_equipment", {
        gymId,
        id: "barbell",
        bar: JSON.stringify({ lb: "20kg" }),
      });
      expect(res.isError).to.equal(true);
      expect(res.content[0].text).to.include("must be expressed in lb");
    });

    it("rejects malformed booleans/numbers instead of silently coercing them", async () => {
      const gymId = await firstGymId();

      const badBool = await callTool("update_equipment", { gymId, id: "barbell", isDeleted: "yes" });
      expect(badBool.isError, "isDeleted: 'yes' should not silently become false").to.equal(true);

      const badNum = await callTool("update_equipment", { gymId, id: "barbell", multiplier: "abc" });
      expect(badNum.isError, "multiplier: 'abc' should not silently become NaN/clamp").to.equal(true);

      // The stringified valid forms still work (backward compat).
      const okBool = toolData(await callTool("update_equipment", { gymId, id: "barbell", isDeleted: "true" }));
      expect(okBool.isDeleted).to.equal(true);
      const okNum = toolData(await callTool("update_equipment", { gymId, id: "barbell", multiplier: "3" }));
      expect(okNum.multiplier).to.equal(3);
    });

    it("rejects an empty/whitespace name on update (no nameless equipment)", async () => {
      const gymId = await firstGymId();
      const created = toolData(await callTool("create_custom_equipment", { gymId, name: "Yoke" }));
      const res = await callTool("update_equipment", { gymId, id: created.id, name: "   " });
      expect(res.isError).to.equal(true);
      expect(res.content[0].text).to.include("empty");
    });

    it("rejects malformed JSON for structured fields", async () => {
      const gymId = await firstGymId();
      const res = await callTool("update_equipment", { gymId, id: "barbell", plates: "{not json" });
      expect(res.isError).to.equal(true);
      expect(res.content[0].text).to.include("valid JSON");
    });

    it("creates and gets custom equipment, soft-deletes it but keeps it in the list", async () => {
      const gymId = await firstGymId();
      const created = toolData(
        await callTool("create_custom_equipment", {
          gymId,
          name: "Resistance Rig",
          plates: JSON.stringify([{ weight: "10kg", num: 4 }]),
        })
      );
      expect(created.id).to.match(/^equipment-/);
      expect(created.isCustom).to.equal(true);
      expect(created.isDeleted).to.equal(false);
      expect(created.name).to.equal("Resistance Rig");

      const got = toolData(await callTool("get_equipment", { gymId, id: created.id }));
      expect(got.name).to.equal("Resistance Rig");

      const del = toolData(await callTool("update_equipment", { gymId, id: created.id, isDeleted: true }));
      expect(del.isDeleted).to.equal(true);

      // Soft-deleted equipment is kept in storage (and the list) so exercises that reference it for rounding don't dangle.
      const afterList = toolData(await callTool("list_equipment", { gymId }));
      const entry = afterList.equipment.find((e: any) => e.id === created.id);
      expect(entry.isDeleted).to.equal(true);
    });

    it("deletes and restores a built-in via update_equipment isDeleted; list always returns it", async () => {
      const gymId = await firstGymId();

      const deleted = toolData(await callTool("update_equipment", { gymId, id: "barbell", isDeleted: true }));
      expect(deleted.isDeleted).to.equal(true);

      const list = toolData(await callTool("list_equipment", { gymId }));
      const barbell = list.equipment.find((e: any) => e.id === "barbell");
      expect(barbell.isDeleted).to.equal(true);

      const got = toolData(await callTool("get_equipment", { gymId, id: "barbell" }));
      expect(got.isDeleted).to.equal(true);

      const restored = toolData(await callTool("update_equipment", { gymId, id: "barbell", isDeleted: false }));
      expect(restored.isDeleted).to.equal(false);
    });

    it("can update a soft-deleted equipment's config without restoring it", async () => {
      const gymId = await firstGymId();
      await callTool("update_equipment", { gymId, id: "barbell", isDeleted: true });
      const updated = toolData(
        await callTool("update_equipment", { gymId, id: "barbell", bar: JSON.stringify({ lb: "33lb" }) })
      );
      expect(updated.bar.lb).to.equal("33lb");
      expect(updated.isDeleted).to.equal(true);
    });

    it("404s when updating a non-existent equipment", async () => {
      const gymId = await firstGymId();
      const res = await callTool("update_equipment", { gymId, id: "band", isDeleted: false });
      expect(res.isError).to.equal(true);
      expect(res.content[0].text).to.include("not found");
    });

    it("accepts native JSON objects/arrays for structured fields (not just strings)", async () => {
      const gymId = await firstGymId();
      const data = toolData(
        await callTool("update_equipment", {
          gymId,
          id: "barbell",
          bar: { lb: "45lb", kg: "20kg" },
          plates: [
            { weight: "45lb", num: 4 },
            { weight: "10lb", num: 2 },
          ],
          fixed: ["10lb", "15lb"],
          multiplier: 2,
          isFixed: false,
        })
      );
      expect(data.bar.lb).to.equal("45lb");
      expect(data.plates).to.deep.equal([
        { weight: "45lb", num: 4 },
        { weight: "10lb", num: 2 },
      ]);
      expect(data.multiplier).to.equal(2);
    });

    it("creates a gym copying current equipment, then renames and deletes it", async () => {
      const created = toolData(await callTool("create_gym", { name: "Home" }));
      expect(created.name).to.equal("Home");
      expect(created.equipmentCount).to.be.greaterThan(0);

      const renamed = toolData(await callTool("update_gym", { gymId: created.id, name: "Garage", setCurrent: "true" }));
      expect(renamed.name).to.equal("Garage");
      expect(renamed.isCurrent).to.equal(true);

      const del = await callTool("delete_gym", { gymId: created.id });
      expect(del.isError).to.be.undefined;

      const list = toolData(await callTool("list_gyms"));
      expect(list.gyms.map((g: any) => g.id)).to.not.include(created.id);
    });

    it("accepts setCurrent as native boolean and rejects invalid forms", async () => {
      const a = toolData(await callTool("create_gym", { name: "Spot A" }));
      const viaBool = toolData(await callTool("update_gym", { gymId: a.id, setCurrent: true }));
      expect(viaBool.isCurrent).to.equal(true);

      const b = toolData(await callTool("create_gym", { name: "Spot B" }));
      const bad = await callTool("update_gym", { gymId: b.id, setCurrent: "yes" });
      expect(bad.isError, "setCurrent: 'yes' should not silently no-op").to.equal(true);

      // It really didn't switch — Spot A is still current.
      const list = toolData(await callTool("list_gyms"));
      expect(list.currentGymId).to.equal(a.id);
    });

    it("refuses to delete the last gym", async () => {
      const gymId = await firstGymId();
      const res = await callTool("delete_gym", { gymId });
      expect(res.isError).to.equal(true);
      expect(res.content[0].text).to.include("last gym");
    });

    it("edits to one gym do not leak into another", async () => {
      const baseGymId = await firstGymId();
      const home = toolData(await callTool("create_gym", { name: "Home" }));

      toolData(
        await callTool("update_equipment", {
          gymId: home.id,
          id: "barbell",
          bar: JSON.stringify({ lb: "33lb" }),
        })
      );

      const baseBarbell = toolData(await callTool("get_equipment", { gymId: baseGymId, id: "barbell" }));
      expect(baseBarbell.bar.lb).to.not.equal("33lb");
    });
  });

  describe("exercise data", () => {
    let token: string;

    beforeEach(async () => {
      token = await createOauthToken();
    });

    async function callTool(name: string, args?: Record<string, unknown>): Promise<any> {
      const result = await handler(buildMcpEvent(toolCall(name, args), authHeaders(token)), ctx);
      expect(result.statusCode).to.equal(200);
      return parseBody(result).result;
    }

    function toolData(res: any): any {
      expect(res.isError, res.content?.[0]?.text).to.be.undefined;
      return JSON.parse(res.content[0].text);
    }

    it("exposes every writable exercise-data field in the set tool schema", () => {
      const tool = mcpTools.find((t) => t.name === "set_exercise_data")!;
      const props = Object.keys(tool.inputSchema.properties);
      for (const field of EXERCISE_DATA_WRITABLE_FIELDS) {
        expect(props, `set_exercise_data is missing the '${field}' field`).to.include(field);
      }
    });

    it("sets, gets, lists and deletes exercise data", async () => {
      const set = toolData(await callTool("set_exercise_data", { key: "squat_barbell", rm1: "315lb", rounding: 5 }));
      expect(set.key).to.equal("squat_barbell");
      expect(set.exerciseName).to.equal("Squat");
      expect(set.rm1).to.equal("315lb");
      expect(set.rounding).to.equal(5);

      const got = toolData(await callTool("get_exercise_data", { key: "squat_barbell" }));
      expect(got.rm1).to.equal("315lb");

      const list = toolData(await callTool("list_exercise_data"));
      expect(list.exerciseData.map((e: any) => e.key)).to.include("squat_barbell");

      const del = toolData(await callTool("delete_exercise_data", { key: "squat_barbell" }));
      expect(del.deleted).to.equal(true);

      const after = await callTool("get_exercise_data", { key: "squat_barbell" });
      expect(after.isError).to.equal(true);
    });

    it("accepts native-JSON and string forms for structured args", async () => {
      const a = toolData(
        await callTool("set_exercise_data", { key: "benchPress", muscleMultipliers: { "Triceps Brachii": 1 } })
      );
      expect(a.muscleMultipliers["Triceps Brachii"]).to.equal(1);

      const b = toolData(
        await callTool("set_exercise_data", { key: "benchPress", muscleMultipliers: '{"Triceps Brachii":0.5}' })
      );
      expect(b.muscleMultipliers["Triceps Brachii"]).to.equal(0.5);
    });

    it("clears a single field when passed null", async () => {
      await callTool("set_exercise_data", { key: "deadlift_barbell", rm1: "405lb", notes: "brace hard" });
      const cleared = toolData(await callTool("set_exercise_data", { key: "deadlift_barbell", notes: null }));
      expect(cleared.notes).to.equal(undefined);
      expect(cleared.rm1).to.equal("405lb");
    });

    it("coerces isUnilateral from string and rejects garbage", async () => {
      const ok = toolData(await callTool("set_exercise_data", { key: "squat_barbell", isUnilateral: "true" }));
      expect(ok.isUnilateral).to.equal(true);

      const bad = await callTool("set_exercise_data", { key: "squat_barbell", isUnilateral: "maybe" });
      expect(bad.isError).to.equal(true);
    });

    it("clamps volumeMultiplier into a sane range and neutralizes garbage", async () => {
      const set = toolData(await callTool("set_exercise_data", { key: "shoulderPress_dumbbell", volumeMultiplier: 2 }));
      expect(set.volumeMultiplier).to.equal(2);

      const huge = toolData(
        await callTool("set_exercise_data", { key: "shoulderPress_dumbbell", volumeMultiplier: 1000 })
      );
      expect(huge.volumeMultiplier).to.equal(10);

      const negative = toolData(
        await callTool("set_exercise_data", { key: "shoulderPress_dumbbell", volumeMultiplier: -5 })
      );
      expect(negative.volumeMultiplier).to.equal(1);
    });

    it("rejects an unknown exercise key", async () => {
      const res = await callTool("set_exercise_data", { key: "notARealExercise", rm1: "100lb" });
      expect(res.isError).to.equal(true);
      expect(res.content[0].text).to.include("Unknown exercise key");
    });

    it("404s getting exercise data that was never set", async () => {
      const res = await callTool("get_exercise_data", { key: "overheadPress_barbell" });
      expect(res.isError).to.equal(true);
    });

    it("hides an entry whose last field was cleared, but allows re-adding it (no tombstone block)", async () => {
      await callTool("set_exercise_data", { key: "squat_barbell", notes: "depth" });
      const cleared = toolData(await callTool("set_exercise_data", { key: "squat_barbell", notes: null }));
      expect(cleared.notes).to.equal(undefined);

      const get = await callTool("get_exercise_data", { key: "squat_barbell" });
      expect(get.isError).to.equal(true);

      const readded = toolData(await callTool("set_exercise_data", { key: "squat_barbell", rm1: "315lb" }));
      expect(readded.rm1).to.equal("315lb");
      const getAgain = toolData(await callTool("get_exercise_data", { key: "squat_barbell" }));
      expect(getAgain.rm1).to.equal("315lb");
    });

    it("rejects an unknown equipment suffix in the key", async () => {
      const res = await callTool("set_exercise_data", { key: "squat_notRealEquipment", rm1: "100lb" });
      expect(res.isError).to.equal(true);
      expect(res.content[0].text).to.include("Unknown equipment");
    });

    it("rejects a non-canonical key with extra underscore segments", async () => {
      const res = await callTool("set_exercise_data", { key: "squat_barbell_extra", rm1: "100lb" });
      expect(res.isError).to.equal(true);
      expect(res.content[0].text).to.include("Malformed exercise key");
    });

    it("advertises null for every clearable field in the set tool schema", () => {
      const tool = mcpTools.find((t) => t.name === "set_exercise_data")!;
      for (const field of EXERCISE_DATA_WRITABLE_FIELDS) {
        expect(tool.inputSchema.properties[field].type, `${field} should allow null`).to.include("null");
      }
    });

    it("treats per-gym null as 'None' (omitted from the returned map) and preserves it across updates", async () => {
      const gyms = toolData(await callTool("list_gyms"));
      const gymId = gyms.gyms[0].id;

      const none = toolData(
        await callTool("set_exercise_data", { key: "squat_barbell", equipment: { [gymId]: null } })
      );
      expect(none.equipment).to.deep.equal({});

      const upd = toolData(await callTool("set_exercise_data", { key: "squat_barbell", notes: "high bar" }));
      expect(upd.notes).to.equal("high bar");
      expect(upd.equipment).to.deep.equal({});
    });

    it("rejects an empty update (only key) with an error", async () => {
      const res = await callTool("set_exercise_data", { key: "squat_barbell" });
      expect(res.isError).to.equal(true);
      expect(res.content[0].text).to.include("At least one field");
    });
  });
});
