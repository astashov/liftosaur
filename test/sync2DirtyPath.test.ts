/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import JWT from "jsonwebtoken";
import { APIGatewayProxyEvent } from "aws-lambda";
import { getRawHandler, IHandler } from "../lambda";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockLogUtil } from "./utils/mockLogUtil";
import { userTableNames } from "../lambda/dao/userDao";
import { eventsTableNames } from "../lambda/dao/eventDao";
import { freeUsersTableNames } from "../lambda/dao/freeUserDao";
import { LftS3Buckets } from "../lambda/dao/buckets";
import { Storage_getDefault } from "../src/models/storage";
import { basicBeginnerProgram } from "../src/programs/basicBeginnerProgram";
import { getLatestMigrationVersion } from "../src/migrations/migrations";
import { IStorage } from "../src/types";

const STORED_WORKOUTS = 25;
const HISTORY_LIMIT = 20;
const STALE_ORIGINAL_ID = 1;

function syncEvent(userId: string, body: Record<string, unknown>): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: { Cookie: `session=${JWT.sign({ userId }, "cookieSecret")}` },
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/api/sync2",
    pathParameters: {},
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    stageVariables: {},
    requestContext: {} as any,
    resource: "",
  };
}

describe("/api/sync2 dirty branch", () => {
  let di: IMockDI;
  let handler: IHandler;
  let userId: string;
  let storage: IStorage;

  beforeEach(() => {
    (global as any).__API_HOST__ = "https://www.liftosaur.com";
    (global as any).__HOST__ = "https://www.liftosaur.com";
    (global as any).__ENV__ = "prod";
    (global as any).__FULL_COMMIT_HASH__ = "abc123";
    (global as any).__COMMIT_HASH__ = "abc123";
    (global as any).Rollbar = { configure: () => undefined };
    storage = { ...Storage_getDefault(), originalId: 999, currentProgramId: "current" };
    userId = storage.tempUserId;
    di = buildMockDi(new MockLogUtil(), async () => new Response());
    handler = getRawHandler(() => di);
  });

  async function seed(args: { workouts: number; version?: string }): Promise<void> {
    const { history: _history, programs: _programs, stats: _stats, ...partial } = storage;
    await di.dynamo.put({
      tableName: userTableNames.prod.users,
      item: {
        id: userId,
        email: "test@example.com",
        createdAt: 1,
        storage: { ...partial, version: args.version ?? partial.version },
      },
    });
    await di.dynamo.put({
      tableName: freeUsersTableNames.prod.freeUsers,
      item: { id: userId, key: "test-sub-key", isClaimed: true, expires: Date.now() + 1e9 },
    });
    await di.dynamo.put({
      tableName: userTableNames.prod.programs,
      item: { ...basicBeginnerProgram, id: "current", userId },
    });
    for (let id = 1; id <= args.workouts; id += 1) {
      await di.dynamo.put({ tableName: userTableNames.prod.historyRecords, item: { id, userId, entries: [] } });
    }
  }

  async function pull(body: Record<string, unknown>): Promise<any> {
    const result = await handler(
      syncEvent(userId, { deviceId: "ios_b", historylimit: HISTORY_LIMIT, timestamp: 5, ...body }),
      {}
    );
    return JSON.parse(result.body);
  }

  function emptyUpdate(): Record<string, unknown> {
    return { version: getLatestMigrationVersion(), originalId: STALE_ORIGINAL_ID };
  }

  async function snapshots(): Promise<IStorage[]> {
    const bucket = LftS3Buckets.storages;
    const keys = await di.s3.listObjects({ bucket, prefix: `storages/${userId}/` });
    const objects = await Promise.all(keys.map((key) => di.s3.getObject({ bucket, key })));
    return objects.map((o) => JSON.parse(o!.toString()));
  }

  function mergeSnapshotEvents(): unknown[] {
    const events = Object.values(di.dynamo.data[eventsTableNames.prod.events] || {}) as { type?: string }[];
    return events.filter((e) => e.type === "mergesnapshot");
  }

  it("an empty pull reads only the newest records and leaves no snapshot", async () => {
    await seed({ workouts: STORED_WORKOUTS });
    const query = sinon.spy(di.dynamo, "query");
    const json = await pull({ storageUpdate: emptyUpdate() });
    const historyQueries = query.getCalls().filter((c) => c.args[0].tableName === userTableNames.prod.historyRecords);
    expect(historyQueries.map((c) => c.args[0].limit)).to.eql([HISTORY_LIMIT]);
    expect(json.type).to.equal("dirty");
    const newestIds = Array.from({ length: HISTORY_LIMIT }, (_, i) => STORED_WORKOUTS - i);
    expect(json.storage.history.map((r: { id: number }) => r.id)).to.eql(newestIds);
    expect(await snapshots()).to.eql([]);
    expect(mergeSnapshotEvents()).to.eql([]);
  });

  it("an empty pull from a watch returns the current program and no history or stats", async () => {
    await seed({ workouts: STORED_WORKOUTS });
    const json = await pull({ storageUpdate: emptyUpdate(), isWatch: true });
    expect(json.type).to.equal("dirty");
    expect(json.storage.history).to.eql([]);
    expect(json.storage.stats).to.eql({ weight: {}, length: {}, percentage: {} });
    expect(json.storage.programs.map((p: { id: string }) => p.id)).to.eql(["current"]);
    expect(await snapshots()).to.eql([]);
  });

  it("a pull that carries a change still snapshots the whole history", async () => {
    await seed({ workouts: STORED_WORKOUTS });
    const json = await pull({
      storageUpdate: {
        ...emptyUpdate(),
        storage: { settings: { volume: 0.25 } },
        versions: { settings: { volume: Date.now() } },
      },
    });
    expect(json.type).to.equal("dirty");
    expect(json.storage.settings.volume).to.equal(0.25);
    expect(json.storage.history.length).to.equal(HISTORY_LIMIT);
    const stored = await snapshots();
    expect(stored.length).to.equal(1);
    expect(stored[0].history.length).to.equal(STORED_WORKOUTS);
    expect(mergeSnapshotEvents().length).to.equal(1);
  });

  it("/api/history?ids returns only the caller's own records", async () => {
    await seed({ workouts: 3 });
    await di.dynamo.put({ tableName: userTableNames.prod.historyRecords, item: { id: 7, userId: "someone-else" } });
    const result = await handler(
      {
        ...syncEvent(userId, {}),
        httpMethod: "GET",
        path: "/api/history",
        body: null,
        queryStringParameters: { ids: "3,7,1" },
      },
      {}
    );
    expect(result.statusCode).to.equal(200);
    expect(
      JSON.parse(result.body)
        .history.map((r: { id: number }) => r.id)
        .sort()
    ).to.eql([1, 3]);
  });

  it("/api/history?ids rejects an admin userid with a wrong key", async () => {
    await seed({ workouts: 1 });
    const result = await handler(
      {
        ...syncEvent(userId, {}),
        httpMethod: "GET",
        path: "/api/history",
        body: null,
        queryStringParameters: { ids: "1", userid: "someone-else", key: "wrong" },
      },
      {}
    );
    expect(result.statusCode).to.equal(401);
  });

  it("an empty pull that triggers a migration still snapshots", async () => {
    await seed({ workouts: 0, version: "20260903120000" });
    const json = await pull({ storageUpdate: emptyUpdate() });
    expect(json.type).to.equal("dirty");
    expect(json.storage.version).to.equal(getLatestMigrationVersion());
    expect((await snapshots()).length).to.equal(1);
    expect(mergeSnapshotEvents().length).to.equal(1);
  });
});
