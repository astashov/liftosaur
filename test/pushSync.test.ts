import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { buildMockDi, IMockDI } from "./utils/mockDi";
import { MockLogUtil } from "./utils/mockLogUtil";
import { MockSnsUtil } from "./utils/mockSnsUtil";
import { IPushEndpointDao, PushEndpointDao, pushEndpointTableNames } from "../lambda/dao/pushEndpointDao";
import {
  PushSync_buildMessage,
  PushSync_notify,
  PushSync_register,
  PushSync_removeAllForUser,
  PushSync_targets,
  PushSync_ttl,
  PushSync_TTL_SECONDS,
  PushSync_unregister,
  PushSync_validateRegistration,
} from "../lambda/utils/pushSync";
import { PushPlatforms_arns } from "../lambda/utils/pushPlatforms";

function row(userId: string, deviceId: string, platform: "ios" | "android", endpointArn?: string): IPushEndpointDao {
  return { userId, deviceId, platform, endpointArn: endpointArn || `arn:${deviceId}`, ttl: 0 };
}

function buildDi(): IMockDI {
  return buildMockDi(new MockLogUtil(), async () => new Response());
}

describe("PushSync_buildMessage", () => {
  it("builds a background APNs payload under the sandbox key on dev", () => {
    const { message, attributes } = PushSync_buildMessage("ios", "dev", 123);
    const outer = JSON.parse(message);
    expect(Object.keys(outer)).to.eql(["default", "APNS_SANDBOX"]);
    expect(outer.default).to.be.a("string");
    expect(JSON.parse(outer.APNS_SANDBOX)).to.eql({
      aps: { "content-available": 1 },
      reason: "storage",
      originalId: 123,
    });
    expect(attributes).to.eql({ "AWS.SNS.MOBILE.APNS.PUSH_TYPE": "background", "AWS.SNS.MOBILE.APNS.PRIORITY": "5" });
  });

  it("uses the production APNs key on prod", () => {
    const outer = JSON.parse(PushSync_buildMessage("ios", "prod", 1).message);
    expect(Object.keys(outer)).to.eql(["default", "APNS"]);
  });

  it("builds a high-priority FCM v1 data message for android", () => {
    const { message, attributes } = PushSync_buildMessage("android", "prod", 123);
    const outer = JSON.parse(message);
    expect(Object.keys(outer)).to.eql(["default", "GCM"]);
    expect(outer.default).to.be.a("string");
    expect(JSON.parse(outer.GCM)).to.eql({
      fcmV1Message: { message: { data: { reason: "storage", originalId: "123" }, android: { priority: "high" } } },
    });
    expect(attributes).to.eql({});
  });
});

describe("PushSync_targets", () => {
  const rows = [row("u", "ios_a", "ios"), row("u", "and_b", "android")];

  it("drops the origin device", () => {
    expect(PushSync_targets(rows, "ios_a").map((r) => r.deviceId)).to.eql(["and_b"]);
  });

  it("keeps every device when the origin is unknown", () => {
    expect(PushSync_targets(rows, undefined)).to.have.length(2);
    expect(PushSync_targets(rows, "unk_client")).to.have.length(2);
  });
});

describe("PushSync_validateRegistration", () => {
  it("accepts a well-formed body", () => {
    const result = PushSync_validateRegistration({ deviceId: "ios_abc", platform: "ios", token: "t" });
    expect(result).to.eql({ success: true, data: { deviceId: "ios_abc", platform: "ios", token: "t" } });
  });

  it("rejects unknown platforms, empty tokens and reserved ids", () => {
    expect(PushSync_validateRegistration({ deviceId: "ios_abc", platform: "web", token: "t" }).success).to.equal(false);
    expect(PushSync_validateRegistration({ deviceId: "ios_abc", platform: "ios", token: "" }).success).to.equal(false);
    expect(PushSync_validateRegistration({ deviceId: "unk_client", platform: "ios", token: "t" }).success).to.equal(
      false
    );
    expect(PushSync_validateRegistration({ deviceId: "srv_api", platform: "ios", token: "t" }).success).to.equal(false);
    expect(PushSync_validateRegistration(undefined).success).to.equal(false);
  });

  it("rejects a device id whose prefix does not match the platform", () => {
    expect(PushSync_validateRegistration({ deviceId: "and_abc", platform: "ios", token: "t" }).success).to.equal(false);
    expect(PushSync_validateRegistration({ deviceId: "watch-abc", platform: "ios", token: "t" }).success).to.equal(
      false
    );
    expect(PushSync_validateRegistration({ deviceId: "and_abc", platform: "android", token: "t" }).success).to.equal(
      true
    );
  });
});

describe("PushSync_ttl", () => {
  it("is epoch seconds 90 days out", () => {
    expect(PushSync_ttl(10_000)).to.equal(10 + PushSync_TTL_SECONDS);
    expect(PushSync_TTL_SECONDS).to.equal(90 * 86400);
  });
});

describe("PushSync_register", () => {
  it("creates an endpoint and stores the row with a ttl on first registration", async () => {
    const di = buildDi();
    const clock = sinon.useFakeTimers({ now: 1_000_000, toFake: ["Date"] });
    try {
      await PushSync_register(di, "u1", { deviceId: "ios_a", platform: "ios", token: "tok" });
    } finally {
      clock.restore();
    }
    expect(di.sns.created).to.eql([{ platformApplicationArn: PushPlatforms_arns.prod.ios, token: "tok" }]);
    expect(di.sns.updated).to.eql([
      { endpointArn: MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "tok"), token: "tok" },
    ]);
    const stored = await new PushEndpointDao(di).get("u1", "ios_a");
    expect(stored).to.eql({
      userId: "u1",
      deviceId: "ios_a",
      platform: "ios",
      endpointArn: MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "tok"),
      ttl: 1000 + PushSync_TTL_SECONDS,
    });
  });

  it("updates the stored endpoint instead of creating a second one", async () => {
    const di = buildDi();
    await PushSync_register(di, "u1", { deviceId: "ios_a", platform: "ios", token: "tok1" });
    await PushSync_register(di, "u1", { deviceId: "ios_a", platform: "ios", token: "tok2" });
    expect(di.sns.created).to.have.length(1);
    expect(di.sns.updated.map((u) => u.token)).to.eql(["tok1", "tok2"]);
    expect(di.sns.updated[1].endpointArn).to.equal(MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "tok1"));
  });

  it("re-enables an endpoint SNS still holds for the token when the row is gone", async () => {
    const di = buildDi();
    const arn = MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "tok");
    di.sns.disabled.add(arn);
    await PushSync_register(di, "u1", { deviceId: "ios_a", platform: "ios", token: "tok" });
    await PushSync_notify(di, "u1", undefined, 1);
    expect(di.sns.published.map((p) => p.endpointArn)).to.eql([arn]);
    expect((await new PushEndpointDao(di).get("u1", "ios_a"))?.endpointArn).to.equal(arn);
  });

  it("creates a new endpoint when the stored one is gone", async () => {
    const di = buildDi();
    await PushSync_register(di, "u1", { deviceId: "ios_a", platform: "ios", token: "tok1" });
    di.sns.gone.add(MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "tok1"));
    await PushSync_register(di, "u1", { deviceId: "ios_a", platform: "ios", token: "tok2" });
    expect(di.sns.created.map((c) => c.token)).to.eql(["tok1", "tok2"]);
    const stored = await new PushEndpointDao(di).get("u1", "ios_a");
    expect(stored?.endpointArn).to.equal(MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "tok2"));
  });

  it("drops another user's row that points at the same endpoint", async () => {
    const di = buildDi();
    await PushSync_register(di, "old-user", { deviceId: "ios_a", platform: "ios", token: "tok" });
    await PushSync_register(di, "new-user", { deviceId: "ios_a", platform: "ios", token: "tok" });
    const dao = new PushEndpointDao(di);
    expect(await dao.get("old-user", "ios_a")).to.equal(undefined);
    expect((await dao.get("new-user", "ios_a"))?.userId).to.equal("new-user");
  });
});

describe("PushSync_unregister", () => {
  it("deletes the endpoint and the row", async () => {
    const di = buildDi();
    await PushSync_register(di, "u1", { deviceId: "ios_a", platform: "ios", token: "tok" });
    await PushSync_unregister(di, "u1", "ios_a");
    expect(di.sns.deleted).to.eql([MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "tok")]);
    expect(await new PushEndpointDao(di).get("u1", "ios_a")).to.equal(undefined);
  });

  it("is a no-op without a row", async () => {
    const di = buildDi();
    await PushSync_unregister(di, "u1", "ios_a");
    expect(di.sns.deleted).to.eql([]);
  });
});

describe("PushSync_removeAllForUser", () => {
  it("removes every row and endpoint of the user and nobody else's", async () => {
    const di = buildDi();
    await PushSync_register(di, "u1", { deviceId: "ios_a", platform: "ios", token: "t1" });
    await PushSync_register(di, "u1", { deviceId: "and_b", platform: "android", token: "t2" });
    await PushSync_register(di, "u2", { deviceId: "ios_c", platform: "ios", token: "t3" });
    await PushSync_removeAllForUser(di, "u1");
    expect(di.sns.deleted).to.have.length(2);
    expect(await new PushEndpointDao(di).listByUserId("u1")).to.eql([]);
    expect(await new PushEndpointDao(di).listByUserId("u2")).to.have.length(1);
  });

  it("still removes the rows when SNS refuses to delete an endpoint", async () => {
    const di = buildDi();
    await PushSync_register(di, "u1", { deviceId: "ios_a", platform: "ios", token: "t1" });
    await PushSync_register(di, "u1", { deviceId: "and_b", platform: "android", token: "t2" });
    di.sns.deleteFailing.add(MockSnsUtil.endpointArn(PushPlatforms_arns.prod.ios, "t1"));
    await PushSync_removeAllForUser(di, "u1");
    expect(di.sns.deleted).to.eql([MockSnsUtil.endpointArn(PushPlatforms_arns.prod.android, "t2")]);
    expect(await new PushEndpointDao(di).listByUserId("u1")).to.eql([]);
  });
});

describe("PushSync_notify", () => {
  async function seed(di: IMockDI): Promise<PushEndpointDao> {
    const dao = new PushEndpointDao(di);
    await dao.put(row("u1", "ios_a", "ios"));
    await dao.put(row("u1", "and_b", "android"));
    await dao.put(row("u2", "ios_c", "ios"));
    return dao;
  }

  it("publishes to the user's other devices only", async () => {
    const di = buildDi();
    await seed(di);
    await PushSync_notify(di, "u1", "ios_a", 42);
    expect(di.sns.published.map((p) => p.endpointArn)).to.eql(["arn:and_b"]);
    expect(JSON.parse(JSON.parse(di.sns.published[0].message).GCM).fcmV1Message.message.data.originalId).to.equal("42");
  });

  it("publishes to every device when the origin is unknown", async () => {
    const di = buildDi();
    await seed(di);
    await PushSync_notify(di, "u1", undefined, 42);
    expect(di.sns.published.map((p) => p.endpointArn).sort()).to.eql(["arn:and_b", "arn:ios_a"]);
  });

  it("removes the row of a disabled or gone endpoint", async () => {
    const di = buildDi();
    const dao = await seed(di);
    di.sns.disabled.add("arn:and_b");
    di.sns.gone.add("arn:ios_a");
    await PushSync_notify(di, "u1", undefined, 42);
    expect(await dao.listByUserId("u1")).to.eql([]);
  });

  it("keeps a row that was re-registered while its old endpoint was reported dead", async () => {
    const di = buildDi();
    const dao = await seed(di);
    di.sns.disabled.add("arn:and_b");
    di.sns.onPublish = async (endpointArn) => {
      if (endpointArn === "arn:and_b") {
        await dao.put(row("u1", "and_b", "android", "arn:and_b_new"));
      }
    };
    await PushSync_notify(di, "u1", "ios_a", 42);
    expect((await dao.get("u1", "and_b"))?.endpointArn).to.equal("arn:and_b_new");
  });

  it("reports whether a conditional remove deleted the row", async () => {
    const di = buildDi();
    const dao = await seed(di);
    expect(await dao.remove("u1", "and_b", "arn:something-else")).to.equal(false);
    expect(await dao.remove("u1", "and_b", "arn:and_b")).to.equal(true);
    expect(await dao.get("u1", "and_b")).to.equal(undefined);
  });

  it("does not let one failing endpoint stop the others", async () => {
    const di = buildDi();
    await seed(di);
    di.sns.failing.add("arn:ios_a");
    await PushSync_notify(di, "u1", undefined, 42);
    expect(di.sns.published.map((p) => p.endpointArn)).to.eql(["arn:and_b"]);
  });

  it("swallows a failed endpoint lookup", async () => {
    const di = buildDi();
    sinon.stub(di.dynamo, "query").rejects(new Error("dynamo down"));
    await PushSync_notify(di, "u1", undefined, 42);
    expect(di.sns.published).to.eql([]);
  });

  it("touches nothing but the endpoint table for a user with no rows", async () => {
    const di = buildDi();
    const query = sinon.spy(di.dynamo, "query");
    const put = sinon.spy(di.dynamo, "put");
    await PushSync_notify(di, "nobody", undefined, 42);
    expect(query.args.map((a) => a[0].tableName)).to.eql([pushEndpointTableNames.prod.pushEndpoints]);
    expect(put.callCount).to.equal(0);
    expect(di.sns.published).to.eql([]);
    expect(di.sns.created).to.eql([]);
  });
});
