/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import JWT from "jsonwebtoken";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getRawHandler, IHandler } from "../lambda";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockLogUtil } from "./utils/mockLogUtil";
import { MockReducer } from "./utils/mockReducer";
import { MockSnsUtil } from "./utils/mockSnsUtil";
import { userTableNames, UserDao } from "../lambda/dao/userDao";
import { freeUsersTableNames } from "../lambda/dao/freeUserDao";
import { PushEndpointDao } from "../lambda/dao/pushEndpointDao";
import { PushPlatforms_arns } from "../lambda/utils/pushPlatforms";
import { Storage_getDefault } from "../src/models/storage";
import { Program_exportProgram } from "../src/models/program";
import { basicBeginnerProgram } from "../src/programs/basicBeginnerProgram";
import { Thunk_sync2 } from "../src/ducks/thunks";
import { SyncTestUtils_initTheAppAndRecordWorkout, SyncTestUtils_logStat } from "./utils/syncTestUtils";

function buildEvent(
  method: string,
  path: string,
  opts?: { body?: unknown; userId?: string; headers?: Record<string, string> }
): APIGatewayProxyEvent {
  const headers: Record<string, string> = { ...opts?.headers };
  if (opts?.userId) {
    headers.Cookie = `session=${JWT.sign({ userId: opts.userId }, "cookieSecret")}`;
  }
  return {
    body: opts?.body ? JSON.stringify(opts.body) : null,
    headers,
    multiValueHeaders: {},
    httpMethod: method,
    isBase64Encoded: false,
    path,
    pathParameters: {},
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    stageVariables: {},
    requestContext: {} as any,
    resource: "",
  };
}

function parseBody(result: APIGatewayProxyResult): any {
  return JSON.parse(result.body);
}

describe("/api/pushtoken", () => {
  let di: IMockDI;
  let handler: IHandler;
  let userId: string;

  beforeEach(() => {
    (global as any).__API_HOST__ = "https://www.liftosaur.com";
    (global as any).__HOST__ = "https://www.liftosaur.com";
    (global as any).__ENV__ = "prod";
    (global as any).__FULL_COMMIT_HASH__ = "abc123";
    (global as any).__COMMIT_HASH__ = "abc123";
    (global as any).Rollbar = { configure: () => undefined };
    const storage = Storage_getDefault();
    storage.subscription = { apple: [], google: [], key: "test-sub-key" };
    userId = storage.tempUserId;
    di = buildMockDi(new MockLogUtil(), async () => new Response());
    handler = getRawHandler(() => di);
    di.dynamo.addMockData({
      [userTableNames.prod.users]: {
        [JSON.stringify({ id: userId })]: { id: userId, email: "test@example.com", createdAt: Date.now(), storage },
      },
      [freeUsersTableNames.prod.freeUsers]: {
        [JSON.stringify({ id: userId })]: {
          id: userId,
          key: "test-sub-key",
          isClaimed: true,
          expires: Date.now() + 1e9,
        },
      },
    });
  });

  async function registerBoth(): Promise<{ iosArn: string; androidArn: string }> {
    await handler(
      buildEvent("POST", "/api/pushtoken", { userId, body: { deviceId: "ios_a", platform: "ios", token: "t1" } }),
      {}
    );
    await handler(
      buildEvent("POST", "/api/pushtoken", { userId, body: { deviceId: "and_b", platform: "android", token: "t2" } }),
      {}
    );
    di.sns.published = [];
    return {
      iosArn: MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "t1"),
      androidArn: MockSnsUtil.endpointArn(PushPlatforms_arns.prod.android, "t2"),
    };
  }

  it("rejects an unauthenticated registration", async () => {
    const result = await handler(
      buildEvent("POST", "/api/pushtoken", { body: { deviceId: "ios_a", platform: "ios", token: "t" } }),
      {}
    );
    expect(result.statusCode).to.equal(401);
    expect(di.sns.created).to.eql([]);
  });

  it("rejects a malformed registration", async () => {
    const result = await handler(
      buildEvent("POST", "/api/pushtoken", { userId, body: { deviceId: "web_a", platform: "ios", token: "t" } }),
      {}
    );
    expect(result.statusCode).to.equal(400);
    expect(parseBody(result).error).to.be.a("string");
    expect(di.sns.created).to.eql([]);
  });

  it("registers and unregisters a device", async () => {
    const post = await handler(
      buildEvent("POST", "/api/pushtoken", { userId, body: { deviceId: "ios_a", platform: "ios", token: "t" } }),
      {}
    );
    expect(post.statusCode).to.equal(200);
    const dao = new PushEndpointDao(di);
    expect((await dao.get(userId, "ios_a"))?.endpointArn).to.equal(
      MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "t")
    );

    const del = await handler(buildEvent("DELETE", "/api/pushtoken/ios_a", { userId }), {});
    expect(del.statusCode).to.equal(200);
    expect(parseBody(del)).to.eql({ data: { deleted: true } });
    expect(await dao.get(userId, "ios_a")).to.equal(undefined);
    expect(di.sns.deleted).to.have.length(1);
  });

  it("removes rows and endpoints when the account is deleted", async () => {
    await handler(
      buildEvent("POST", "/api/pushtoken", { userId, body: { deviceId: "ios_a", platform: "ios", token: "t1" } }),
      {}
    );
    await handler(
      buildEvent("POST", "/api/pushtoken", { userId, body: { deviceId: "and_b", platform: "android", token: "t2" } }),
      {}
    );
    await new UserDao(di).removeUser(userId);
    expect(await new PushEndpointDao(di).listByUserId(userId)).to.eql([]);
    expect(di.sns.deleted).to.have.length(2);
  });

  it("pushes the other device after a web editor program save", async () => {
    const { androidArn } = await registerBoth();
    const user = (await new UserDao(di).getLimitedById(userId))!;
    const program = { ...basicBeginnerProgram, clonedAt: Date.now() };
    const exported = Program_exportProgram(program, user.storage.settings, user.storage.version);
    const result = await handler(
      buildEvent("POST", "/api/program", { userId, body: { program: exported, deviceId: "ios_a" } }),
      {}
    );
    expect(result.statusCode).to.equal(200);
    expect(di.sns.published.map((p) => p.endpointArn)).to.eql([androidArn]);
  });

  it("pushes every device after a web editor program delete", async () => {
    const { iosArn, androidArn } = await registerBoth();
    const program = { ...basicBeginnerProgram, clonedAt: Date.now() };
    await new UserDao(di).saveProgram(userId, program);
    const result = await handler(buildEvent("DELETE", `/api/program/${program.id}`, { userId }), {});
    expect(result.statusCode).to.equal(200);
    expect(di.sns.published.map((p) => p.endpointArn).sort()).to.eql([androidArn, iosArn].sort());
  });

  it("pushes every device after an API v1 write", async () => {
    const { iosArn, androidArn } = await registerBoth();
    const keyResult = await handler(buildEvent("POST", "/api/apikeys", { userId, body: { name: "k" } }), {});
    const apiKey: string = parseBody(keyResult).data.key;
    const result = await handler(
      buildEvent("POST", "/api/v1/history", {
        headers: { Authorization: `Bearer ${apiKey}` },
        body: { text: "2025-03-01 10:00:00 +00:00 / exercises: {\n  Squat / 3x5 100lb\n}" },
      }),
      {}
    );
    expect(result.statusCode).to.equal(201);
    expect(di.sns.published.map((p) => p.endpointArn).sort()).to.eql([androidArn, iosArn].sort());
  });
});

describe("push after sync", () => {
  it("pushes the other device once per write and never echoes", async () => {
    const { mockReducer, env, di, mockFetch } = await SyncTestUtils_initTheAppAndRecordWorkout("ios_aaa");
    const mockReducer2 = MockReducer.clone(mockReducer, "and_bbb", env);
    const register = (deviceId: string, platform: string, token: string): Promise<Response> =>
      mockFetch.fetch("https://www.liftosaur.com/api/pushtoken", {
        method: "POST",
        body: JSON.stringify({ deviceId, platform, token }),
      });
    await register("ios_aaa", "ios", "tok-ios");
    await register("and_bbb", "android", "tok-and");
    const iosArn = MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "tok-ios");
    const androidArn = MockSnsUtil.endpointArn(PushPlatforms_arns.prod.android, "tok-and");
    di.sns.published = [];

    await SyncTestUtils_logStat(mockReducer, 100);
    await mockReducer.run([Thunk_sync2({ force: true })]);
    expect(di.sns.published.map((p) => p.endpointArn)).to.eql([androidArn]);

    await mockReducer2.run([Thunk_sync2({ force: true })]);
    expect(di.sns.published).to.have.length(1);
    expect((mockReducer2.state.storage.stats.weight.weight || []).map((w) => w.value.value)).to.eql([100]);

    await SyncTestUtils_logStat(mockReducer2, 110);
    await mockReducer2.run([Thunk_sync2({ force: true })]);
    expect(di.sns.published.map((p) => p.endpointArn)).to.eql([androidArn, iosArn]);

    await mockReducer.run([Thunk_sync2({ force: true })]);
    expect(di.sns.published).to.have.length(2);
    expect((mockReducer.state.storage.stats.weight.weight || []).map((w) => w.value.value)).to.eql([100, 110]);
  });
});
