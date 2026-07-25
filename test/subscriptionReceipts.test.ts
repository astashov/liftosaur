import "mocha";
import { expect } from "chai";
import { SubscriptionReceipts_cleanupApple } from "../src/utils/subscriptionReceipts";
import { ISubscriptionReceipt } from "../src/types";

function receipt(id: string, value: string, createdAt: number): ISubscriptionReceipt {
  return { vtype: "subscription_receipt", id, value, createdAt };
}

describe("SubscriptionReceipts_cleanupApple", () => {
  it("collapses multiple valid receipts to the newest one", () => {
    const legacy = receipt("vwaahv", "legacy-blob", 100);
    const jws = receipt("hhqoma", "jws-token", 200);
    const verdicts = new Map([
      ["legacy-blob", true],
      ["jws-token", true],
    ]);
    expect(SubscriptionReceipts_cleanupApple([legacy, jws], verdicts)).to.deep.equal([jws]);
    expect(SubscriptionReceipts_cleanupApple([jws, legacy], verdicts)).to.deep.equal([jws]);
  });

  it("removes receipts that verified as invalid", () => {
    const bad = receipt("aaaaaa", "expired-blob", 100);
    const good = receipt("bbbbbb", "jws-token", 200);
    const verdicts = new Map([
      ["expired-blob", false],
      ["jws-token", true],
    ]);
    expect(SubscriptionReceipts_cleanupApple([bad, good], verdicts)).to.deep.equal([good]);
  });

  it("removes everything when all verified receipts are invalid", () => {
    const bad = receipt("aaaaaa", "expired-blob", 100);
    const verdicts = new Map([["expired-blob", false]]);
    expect(SubscriptionReceipts_cleanupApple([bad], verdicts)).to.deep.equal([]);
  });

  it("keeps receipts that were added after verification started", () => {
    const verified = receipt("aaaaaa", "jws-token", 100);
    const merged = receipt("cccccc", "fresh-restore-token", 300);
    const verdicts = new Map([["jws-token", true]]);
    expect(SubscriptionReceipts_cleanupApple([verified, merged], verdicts)).to.deep.equal([verified, merged]);
  });

  it("keeps an unverified receipt even when every verified one is invalid", () => {
    const bad = receipt("aaaaaa", "expired-blob", 100);
    const merged = receipt("cccccc", "fresh-restore-token", 300);
    const verdicts = new Map([["expired-blob", false]]);
    expect(SubscriptionReceipts_cleanupApple([bad, merged], verdicts)).to.deep.equal([merged]);
  });

  it("returns the same array reference when nothing changes, to avoid version churn", () => {
    const jws = receipt("hhqoma", "jws-token", 200);
    const apple = [jws];
    const verdicts = new Map([["jws-token", true]]);
    expect(SubscriptionReceipts_cleanupApple(apple, verdicts)).to.equal(apple);
  });

  it("does not tombstone the only receipt when verdicts came from a stale array (hanpaclo regression)", () => {
    // Mount-time state had [jws, legacy] (both valid); a concurrent sync merge already removed the
    // legacy one. The old logic picked "last of stale array" (legacy), replaced the whole array with
    // it, and thereby deleted the jws receipt the server actually had.
    const jws = receipt("hhqoma", "jws-token", 200);
    const verdicts = new Map([
      ["jws-token", true],
      ["legacy-blob", true],
    ]);
    const apple = [jws];
    expect(SubscriptionReceipts_cleanupApple(apple, verdicts)).to.equal(apple);
  });

  it("dedupes receipts with identical values keeping the newest", () => {
    const a = receipt("aaaaaa", "jws-token", 100);
    const b = receipt("bbbbbb", "jws-token", 200);
    const verdicts = new Map([["jws-token", true]]);
    expect(SubscriptionReceipts_cleanupApple([a, b], verdicts)).to.deep.equal([b]);
  });
});
