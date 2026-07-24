/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { getRawHandler } from "../lambda";
import { Service } from "../src/api/service";
import { Storage_getDefault } from "../src/models/storage";
import { getInitialState } from "../src/ducks/reducer";
import { AdminDebug_fetchStorage, AdminDebug_scrambledTempUserId } from "../src/models/adminDebug";
import { StorageDao } from "../lambda/dao/storageDao";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockFetch, IMockFetchLog } from "./utils/mockFetch";
import { MockLogUtil } from "./utils/mockLogUtil";
import { ILocalStorage } from "../src/models/state";
import { IStorage } from "../src/types";
import { userTableNames } from "../lambda/dao/userDao";
import { APIGatewayProxyEvent } from "aws-lambda";
import { lg } from "../src/utils/posthog";

const ADMIN_KEY = "SECRET_KEY";

function buildGetEvent(path: string, qs: Record<string, string>): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path,
    pathParameters: {},
    queryStringParameters: qs,
    multiValueQueryStringParameters: {},
    stageVariables: {},
    requestContext: {} as any,
    resource: "",
  };
}

function setupAdmin(targetStorage: IStorage): { di: IMockDI; service: Service } {
  const log = new MockLogUtil();
  const fetchLogs: IMockFetchLog[] = [];
  const mockFetch = new MockFetch("admin_caller", fetchLogs);
  const fetch = mockFetch.fetch.bind(mockFetch);
  const di = buildMockDi(log, fetch);
  sinon.stub(di.secrets, "getApiKey").resolves(ADMIN_KEY);
  di.dynamo.addMockData({
    lftUsers: {
      [JSON.stringify({ id: targetStorage.tempUserId })]: {
        id: targetStorage.tempUserId,
        email: targetStorage.email,
        createdAt: 1,
        storage: targetStorage,
      },
    },
  });
  mockFetch.handler = getRawHandler(() => di);
  const service = new Service(fetch);
  return { di, service };
}

function buildTargetStorage(nickname: string): IStorage {
  const storage = { ...Storage_getDefault(), email: "target@example.com" };
  storage.settings = { ...storage.settings, nickname };
  return storage;
}

describe("adminDebug", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    // @ts-ignore
    global.__API_HOST__ = "https://www.liftosaur.com";
    // @ts-ignore
    global.__HOST__ = "https://www.liftosaur.com";
    // @ts-ignore
    global.__ENV__ = "prod";
    // @ts-ignore
    global.__FULL_COMMIT_HASH__ = "abc123";
    // @ts-ignore
    global.__COMMIT_HASH__ = "abc123";
    // @ts-ignore
    global.Rollbar = { configure: () => undefined };
    sandbox = sinon.createSandbox();
    sandbox.stub(Date, "now").returns(1000);
  });

  afterEach(() => {
    sandbox.restore();
    sinon.restore();
  });

  it("validates the admin key via /api/admin/check", async () => {
    const { service } = setupAdmin(buildTargetStorage("TARGET"));
    expect(await service.checkAdminKey(ADMIN_KEY)).to.equal(true);
    expect(await service.checkAdminKey("wrong-key")).to.equal(false);
  });

  it("loads the target user's storage with a scrambled debug tempUserId", async () => {
    const target = buildTargetStorage("TARGET_NICK");
    const { service } = setupAdmin(target);

    const result = await AdminDebug_fetchStorage(service, "admin_caller", target.tempUserId, ADMIN_KEY);
    expect(result.success).to.equal(true);
    if (result.success) {
      expect(result.data.settings.nickname).to.equal("TARGET_NICK");
      expect(result.data.tempUserId).to.equal(AdminDebug_scrambledTempUserId(target.tempUserId));
      expect(result.data.tempUserId).to.not.equal(target.tempUserId);
    }
  });

  it("loads a specific historical snapshot when storageId is provided", async () => {
    const target = buildTargetStorage("CURRENT_NICK");
    const { di, service } = setupAdmin(target);
    const snapshot = { ...target, settings: { ...target.settings, nickname: "SNAPSHOT_NICK" } };
    const storageId = await new StorageDao(di).store(target.tempUserId, snapshot, undefined);
    expect(storageId).to.be.a("string");

    const result = await AdminDebug_fetchStorage(service, "admin_caller", target.tempUserId, ADMIN_KEY, storageId);
    expect(result.success).to.equal(true);
    if (result.success) {
      expect(result.data.settings.nickname).to.equal("SNAPSHOT_NICK");
      expect(result.data.tempUserId).to.equal(AdminDebug_scrambledTempUserId(target.tempUserId));
    }
  });

  it("does not mint a target-user session cookie on an admin storage read", async () => {
    const target = buildTargetStorage("TARGET");
    const { di } = setupAdmin(target);
    const handler = getRawHandler(() => di);
    const res = await handler(
      buildGetEvent("/api/storage", {
        tempuserid: "admin_caller",
        userid: target.tempUserId,
        key: ADMIN_KEY,
        historylimit: "20",
      }),
      { getRemainingTimeInMillis: () => 10000 } as any
    );
    expect(res.statusCode).to.equal(200);
    const headers = (res.headers || {}) as Record<string, unknown>;
    expect(headers["set-cookie"] ?? headers["Set-Cookie"]).to.equal(undefined);
  });

  it("serves the target's history on /api/history with a valid admin key (no cookie needed)", async () => {
    const target = buildTargetStorage("TARGET");
    const { di, service } = setupAdmin(target);
    di.dynamo.addMockData({
      [userTableNames.prod.historyRecords]: {
        [JSON.stringify({ userId: target.tempUserId, id: 101 })]: {
          userId: target.tempUserId,
          id: 101,
          startTime: 101,
        },
        [JSON.stringify({ userId: target.tempUserId, id: 102 })]: {
          userId: target.tempUserId,
          id: 102,
          startTime: 102,
        },
      },
    });
    const history = await service.getHistory({ userId: target.tempUserId, adminKey: ADMIN_KEY });
    expect(history.map((h) => h.id).sort()).to.eql([101, 102]);
  });

  it("rejects /api/history with a wrong admin key and no session", async () => {
    const target = buildTargetStorage("TARGET");
    const { di, service } = setupAdmin(target);
    di.dynamo.addMockData({
      [userTableNames.prod.historyRecords]: {
        [JSON.stringify({ userId: target.tempUserId, id: 101 })]: {
          userId: target.tempUserId,
          id: 101,
          startTime: 101,
        },
      },
    });
    const history = await service.getHistory({ userId: target.tempUserId, adminKey: "wrong-key" });
    expect(history).to.equal(undefined);
  });

  it("stays analytics-silent for a debug account but posts for a normal account", async () => {
    const posted: string[] = [];
    const fakeService = {
      postEvent: async (e: { userId: string }) => {
        posted.push(e.userId);
      },
    } as any;
    lg("debug-action", undefined, fakeService, AdminDebug_scrambledTempUserId("realtarget"));
    lg("normal-action", undefined, fakeService, "normaluser");
    await new Promise((r) => setTimeout(r, 0));
    expect(posted).to.eql(["normaluser"]);
  });

  it("fails and does not produce a debug storage with a wrong admin key", async () => {
    const target = buildTargetStorage("TARGET");
    const { service } = setupAdmin(target);

    const result = await AdminDebug_fetchStorage(service, "admin_caller", target.tempUserId, "wrong-key");
    expect(result.success).to.equal(false);
  });

  it("hard-fails a bad-key userid read instead of returning the caller's own storage", async () => {
    const target = buildTargetStorage("TARGET");
    const { di, service } = setupAdmin(target);
    // The caller has a valid session and their own data; a bad key must NOT return it mislabeled.
    const callerStorage = buildTargetStorage("ADMIN_OWN");
    di.dynamo.addMockData({
      lftUsers: {
        [JSON.stringify({ id: "admin_caller" })]: {
          id: "admin_caller",
          email: "admin@example.com",
          createdAt: 1,
          storage: callerStorage,
        },
      },
    });
    const result = await AdminDebug_fetchStorage(service, "admin_caller", target.tempUserId, "wrong-key");
    expect(result.success).to.equal(false);
  });

  it("forces nosync when loading a debug account (durable across reloads)", async () => {
    const target = buildTargetStorage("TARGET");
    const { service } = setupAdmin(target);
    const result = await AdminDebug_fetchStorage(service, "admin_caller", target.tempUserId, ADMIN_KEY);
    expect(result.success).to.equal(true);
    if (!result.success) {
      return;
    }

    const debugLocalStorage: ILocalStorage = { storage: result.data };
    const debugState = await getInitialState((() => undefined) as any, {
      rawStorage: JSON.stringify(debugLocalStorage),
    });
    expect(debugState.nosync).to.equal(true);

    const normalLocalStorage: ILocalStorage = { storage: target };
    const normalState = await getInitialState((() => undefined) as any, {
      rawStorage: JSON.stringify(normalLocalStorage),
    });
    expect(normalState.nosync).to.equal(false);
  });
});
