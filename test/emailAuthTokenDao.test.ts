import "mocha";
import { expect } from "chai";
import { EmailAuthTokenDao } from "../lambda/dao/emailAuthTokenDao";
import { MockDynamoUtil } from "./utils/mockDynamoUtil";
import { MockLogUtil } from "./utils/mockLogUtil";
import { IDI } from "../lambda/utils/di";

function buildDao(): { dao: EmailAuthTokenDao; dynamo: MockDynamoUtil } {
  const log = new MockLogUtil();
  const dynamo = new MockDynamoUtil(log);
  const di = { dynamo, log } as unknown as IDI;
  return { dao: new EmailAuthTokenDao(di), dynamo };
}

describe("EmailAuthTokenDao.bumpAttemptsAndCheckLimit", () => {
  it("returns false until the limit is exceeded, then true", async () => {
    const { dao } = buildDao();
    const results: boolean[] = [];
    for (let i = 0; i < 12; i++) {
      results.push(await dao.bumpAttemptsAndCheckLimit("prod", "a@b.com"));
    }
    // First 10 attempts allowed, 11th and 12th blocked (limit is 10)
    expect(results.slice(0, 10)).to.deep.equal(new Array(10).fill(false));
    expect(results.slice(10)).to.deep.equal([true, true]);
  });

  it("decides from the atomically-returned post-increment count", async () => {
    // The DAO must use the count returned by the update (ReturnValues), not a
    // pre-read value, so a burst can't slip past. The mock applies ADD and
    // returns ALL_NEW; if the DAO ignored that, the count would never advance.
    const { dao, dynamo } = buildDao();
    for (let i = 0; i < 5; i++) {
      await dao.bumpAttemptsAndCheckLimit("prod", "burst@b.com");
    }
    const item = await dynamo.get<{ count: number }>({
      tableName: "lftEmailAuthTokens",
      key: { token: "attempts:burst@b.com" },
    });
    expect(item?.count).to.equal(5);
  });

  it("resets a window whose ttl has already passed (TTL deletion can lag)", async () => {
    const { dao, dynamo } = buildDao();
    const past = Math.floor(Date.now() / 1000) - 100;
    await dynamo.put({
      tableName: "lftEmailAuthTokens",
      item: { token: "attempts:stale@b.com", count: 50, ttl: past },
    });
    const blocked = await dao.bumpAttemptsAndCheckLimit("prod", "stale@b.com");
    expect(blocked).to.equal(false);
    const item = await dynamo.get<{ count: number; ttl: number }>({
      tableName: "lftEmailAuthTokens",
      key: { token: "attempts:stale@b.com" },
    });
    expect(item?.count).to.equal(1);
    expect(item?.ttl).to.be.greaterThan(Math.floor(Date.now() / 1000));
  });

  it("clearAttempts removes the counter", async () => {
    const { dao, dynamo } = buildDao();
    await dao.bumpAttemptsAndCheckLimit("prod", "clear@b.com");
    await dao.clearAttempts("prod", "clear@b.com");
    const item = await dynamo.get({
      tableName: "lftEmailAuthTokens",
      key: { token: "attempts:clear@b.com" },
    });
    expect(item).to.equal(undefined);
  });
});
