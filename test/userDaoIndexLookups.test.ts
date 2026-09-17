import "mocha";
import { expect } from "chai";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockLogUtil } from "./utils/mockLogUtil";
import { ILimitedUserDao, UserDao, UserDao_emailCandidates, userTableNames } from "../lambda/dao/userDao";
import { Storage_getDefault } from "../src/models/storage";

function buildDi(): IMockDI {
  return buildMockDi(new MockLogUtil(), async () => new Response());
}

function user(id: string, overrides: Partial<ILimitedUserDao> = {}): ILimitedUserDao {
  const { history: _history, programs: _programs, stats: _stats, ...storage } = Storage_getDefault();
  return { id, email: "lifter@example.com", createdAt: 1000, storage, ...overrides };
}

async function seed(di: IMockDI, users: ILimitedUserDao[]): Promise<void> {
  for (const u of users) {
    await di.dynamo.put({ tableName: userTableNames.prod.users, item: u });
  }
}

describe("UserDao_emailCandidates", () => {
  it("drops a row whose email no longer matches the lookup", () => {
    const rows = [user("a"), user("b", { email: "renamed@example.com" })];
    expect(UserDao_emailCandidates(rows, "lifter@example.com").map((u) => u.id)).to.eql(["a"]);
  });

  it("sorts by createdAt, then by id", () => {
    const rows = [user("c", { createdAt: 2000 }), user("b", { createdAt: 1000 }), user("a", { createdAt: 1000 })];
    expect(UserDao_emailCandidates(rows, "lifter@example.com").map((u) => u.id)).to.eql(["a", "b", "c"]);
  });
});

describe("UserDao index lookups", () => {
  it("queries on a user index return only the index key and the id", async () => {
    const di = buildDi();
    await seed(di, [user("a", { passwordHash: "hash" })]);
    const rows = await di.dynamo.query<Record<string, unknown>>({
      tableName: userTableNames.prod.users,
      indexName: userTableNames.prod.usersEmailKeys,
      expression: "#email = :email",
      attrs: { "#email": "email" },
      values: { ":email": "lifter@example.com" },
    });
    expect(rows).to.eql([{ id: "a", email: "lifter@example.com" }]);
  });

  it("getAllByEmail returns full rows for every account with that email", async () => {
    const di = buildDi();
    await seed(di, [
      user("oauth", { googleId: "g-1", createdAt: 2000 }),
      user("password", { passwordHash: "hash", createdAt: 1000 }),
      user("other", { email: "someone@example.com", passwordHash: "other-hash" }),
    ]);
    const candidates = await new UserDao(di).getAllByEmail("lifter@example.com");
    expect(candidates.map((u) => u.id)).to.eql(["password", "oauth"]);
    expect(candidates[0].passwordHash).to.equal("hash");
    expect(candidates[1].googleId).to.equal("g-1");
    expect(candidates[0].storage.settings).to.be.an("object");
  });

  it("getAllByEmail returns nothing for an unknown email", async () => {
    const di = buildDi();
    await seed(di, [user("a")]);
    expect(await new UserDao(di).getAllByEmail("nobody@example.com")).to.eql([]);
  });

  it("getByEmail, getByGoogleId and getByAppleId return the full user", async () => {
    const di = buildDi();
    await seed(di, [user("a", { googleId: "g-1", appleId: "a-1", passwordHash: "hash" })]);
    const userDao = new UserDao(di);
    const byEmail = await userDao.getByEmail("lifter@example.com");
    const byGoogleId = await userDao.getByGoogleId("g-1", {});
    const byAppleId = await userDao.getByAppleId("a-1", {});
    for (const found of [byEmail, byGoogleId, byAppleId]) {
      expect(found?.id).to.equal("a");
      expect(found?.passwordHash).to.equal("hash");
      expect(found?.storage.history).to.eql([]);
    }
  });

  it("the single lookups return undefined for an unknown key", async () => {
    const di = buildDi();
    await seed(di, [user("a", { googleId: "g-1" })]);
    const userDao = new UserDao(di);
    expect(await userDao.getByEmail("nobody@example.com")).to.equal(undefined);
    expect(await userDao.getByGoogleId("g-2", {})).to.equal(undefined);
    expect(await userDao.getByAppleId("a-2", {})).to.equal(undefined);
  });
});
