/* eslint-disable @typescript-eslint/no-explicit-any */
import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import JWT from "jsonwebtoken";
import { APIGatewayProxyEvent } from "aws-lambda";
import { getRawHandler, IHandler } from "../lambda";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockLogUtil } from "./utils/mockLogUtil";
import { UserDao, userTableNames } from "../lambda/dao/userDao";
import { IUserRowItem } from "../lambda/utils/userRow";
import { freeUsersTableNames } from "../lambda/dao/freeUserDao";
import { Storage_getDefault } from "../src/models/storage";
import { basicBeginnerProgram } from "../src/programs/basicBeginnerProgram";
import { getLatestMigrationVersion } from "../src/migrations/migrations";
import { IDashboard, IStorage } from "../src/types";

const LEGACY_VERSION = "20261022120000";

function post(path: string, body: Record<string, unknown>, userId?: string): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: userId != null ? { Cookie: `session=${JWT.sign({ userId }, "cookieSecret")}` } : {},
    multiValueHeaders: {},
    httpMethod: "POST",
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

describe("dashboard persistence", () => {
  let di: IMockDI;
  let handler: IHandler;
  let storage: IStorage;
  let userId: string;

  beforeEach(() => {
    (global as any).__API_HOST__ = "https://www.liftosaur.com";
    (global as any).__HOST__ = "https://www.liftosaur.com";
    (global as any).__ENV__ = "prod";
    (global as any).__FULL_COMMIT_HASH__ = "abc123";
    (global as any).__COMMIT_HASH__ = "abc123";
    (global as any).Rollbar = { configure: () => undefined };
    storage = Storage_getDefault();
    userId = storage.tempUserId;
    di = buildMockDi(new MockLogUtil(), async () => new Response());
    handler = getRawHandler(() => di);
  });

  function dashboardRows(): IDashboard[] {
    return Object.values(di.dynamo.data[userTableNames.prod.dashboards] || {}) as IDashboard[];
  }

  function userRow(id: string = userId): IUserRowItem {
    return di.dynamo.data[userTableNames.prod.users][JSON.stringify({ id })] as IUserRowItem;
  }

  async function seedLegacyUser(): Promise<void> {
    const {
      history: _h,
      programs: _p,
      stats: _s,
      dashboards: _d,
      currentDashboardId: _c,
      ...partial
    } = { ...storage, currentProgramId: "current" };
    await di.dynamo.put({
      tableName: userTableNames.prod.users,
      item: { id: userId, email: "test@example.com", createdAt: 1, storage: { ...partial, version: LEGACY_VERSION } },
    });
    await di.dynamo.put({
      tableName: freeUsersTableNames.prod.freeUsers,
      item: { id: userId, key: "test-sub-key", isClaimed: true, expires: Date.now() + 1e9 },
    });
    await di.dynamo.put({
      tableName: userTableNames.prod.programs,
      item: { ...basicBeginnerProgram, id: "current", clonedAt: 42, userId },
    });
  }

  it("a web program save on a legacy account persists the seeded dashboard", async () => {
    await seedLegacyUser();
    const program = { ...basicBeginnerProgram, id: "current", clonedAt: 42 };
    const result = await handler(
      post(
        "/api/program",
        { program: { program, customExercises: {}, settings: {}, version: getLatestMigrationVersion() } },
        userId
      ),
      {}
    );
    expect(result.statusCode).to.equal(200);
    expect(userRow().storage.version).to.equal(getLatestMigrationVersion());
    expect(userRow().storage.currentDashboardId).to.equal("graphs");
    expect(dashboardRows().map((d) => d.id)).to.eql(["graphs"]);
  });

  it("a failed dashboard write keeps the old version, and the retry seeds the row", async () => {
    await seedLegacyUser();
    const userDao = new UserDao(di);
    const batchPut = di.dynamo.batchPut.bind(di.dynamo);
    const stub = sinon.stub(di.dynamo, "batchPut").callsFake(async (args) => {
      if (args.tableName === userTableNames.prod.dashboards) {
        throw new Error("ProvisionedThroughputExceededException");
      }
      return batchPut(args);
    });
    const limited = (await userDao.getLimitedById(userId))!;
    let failed = false;
    try {
      await userDao.migrateStoredStorage(limited, "server");
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
    expect(userRow().storage.version).to.equal(LEGACY_VERSION);
    stub.restore();
    const retry = await userDao.migrateStoredStorage((await userDao.getLimitedById(userId))!, "server");
    expect(retry.success && retry.data.migrated).to.equal(true);
    expect(dashboardRows().map((d) => d.id)).to.eql(["graphs"]);
  });

  it("an email signup creates the account with its dashboard row and clocks", async () => {
    const result = await handler(
      post("/api/signup/email", { email: "new@example.com", password: "long-enough-password", id: "newuser1" }),
      {}
    );
    expect(result.statusCode).to.equal(200);
    expect(userRow("newuser1").storage.currentDashboardId).to.equal("graphs");
    expect(userRow("newuser1").storage).to.not.have.any.keys("dashboards");
    expect(dashboardRows().map((d) => d.id)).to.eql(["graphs"]);
    const loaded = await new UserDao(di).getById("newuser1");
    expect(loaded?.storage.dashboards?.map((d) => d.id)).to.eql(["graphs"]);
  });
});
