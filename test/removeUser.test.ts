import "mocha";
import { expect } from "chai";
import { UserDao } from "../lambda/dao/userDao";
import { LftS3Buckets } from "../lambda/dao/buckets";
import { apiKeyTableNames } from "../lambda/dao/apiKeyDao";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockLogUtil } from "./utils/mockLogUtil";

const USER = "userToDelete";
const OTHER = "userToKeep";

async function seed(di: IMockDI): Promise<void> {
  for (const userId of [USER, OTHER]) {
    await di.s3.putObject({
      bucket: LftS3Buckets.storages,
      key: `storages/${userId}/abc.json`,
      body: JSON.stringify({ tempUserId: userId }),
    });
    await di.s3.putObject({
      bucket: LftS3Buckets.debugs,
      key: `debuginfo/${userId}/202608301200`,
      body: "{}",
    });
    await di.s3.putObject({
      bucket: LftS3Buckets.debugs,
      key: `errorinfo/${userId}/202608301200`,
      body: "{}",
    });
    await di.dynamo.put({
      tableName: apiKeyTableNames.prod.apiKeys,
      item: { key: `key_${userId}`, userId, name: "cli", createdAt: 1 },
    });
    await di.dynamo.put({
      tableName: "lftPayments",
      item: { userId, timestamp: 1, transactionId: `t_${userId}`, amount: 4.99 },
    });
    await di.dynamo.put({
      tableName: "lftAffiliates",
      item: { affiliateId: "someaffiliate", userId, timestamp: 1 },
    });
  }
}

describe("UserDao.removeUser", () => {
  it("deletes storage, debug and error snapshots for that user only", async () => {
    const di = buildMockDi(new MockLogUtil(), (() => undefined) as unknown as Window["fetch"]);
    await seed(di);

    await new UserDao(di).removeUser(USER);

    expect(await di.s3.listObjects({ bucket: LftS3Buckets.storages, prefix: `storages/${USER}/` })).to.deep.equal([]);
    expect(await di.s3.listObjects({ bucket: LftS3Buckets.debugs, prefix: `debuginfo/${USER}/` })).to.deep.equal([]);
    expect(await di.s3.listObjects({ bucket: LftS3Buckets.debugs, prefix: `errorinfo/${USER}/` })).to.deep.equal([]);

    expect(await di.s3.listObjects({ bucket: LftS3Buckets.storages, prefix: `storages/${OTHER}/` })).to.have.length(1);
    expect(await di.s3.listObjects({ bucket: LftS3Buckets.debugs, prefix: `debuginfo/${OTHER}/` })).to.have.length(1);
    expect(await di.s3.listObjects({ bucket: LftS3Buckets.debugs, prefix: `errorinfo/${OTHER}/` })).to.have.length(1);
  });

  it("revokes the deleted user's api keys and leaves other users' keys alone", async () => {
    const di = buildMockDi(new MockLogUtil(), (() => undefined) as unknown as Window["fetch"]);
    await seed(di);

    await new UserDao(di).removeUser(USER);

    const remaining = await di.dynamo.scan<{ key: string }>({ tableName: apiKeyTableNames.prod.apiKeys });
    expect(remaining.map((k) => k.key)).to.deep.equal([`key_${OTHER}`]);
  });

  // These are deliberately retained (tax records, and the affiliate payout join) - a future change
  // that starts deleting them would break the books, not just tighten privacy.
  it("keeps payment and affiliate records", async () => {
    const di = buildMockDi(new MockLogUtil(), (() => undefined) as unknown as Window["fetch"]);
    await seed(di);

    await new UserDao(di).removeUser(USER);

    expect(await di.dynamo.scan({ tableName: "lftPayments" })).to.have.length(2);
    expect(await di.dynamo.scan({ tableName: "lftAffiliates" })).to.have.length(2);
  });
});
