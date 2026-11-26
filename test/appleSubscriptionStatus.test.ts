import "mocha";
import { expect } from "chai";
import { AppleSubscriptionStatus_select } from "../lambda/utils/appleSubscriptionStatus";

const mine = { originalTransactionId: "otx1", signedRenewalInfo: "r1" };
const other = { originalTransactionId: "otx2", signedRenewalInfo: "r2" };

describe("AppleSubscriptionStatus_select", () => {
  it("returns nothing for an empty response", () => {
    expect(AppleSubscriptionStatus_select({}, "otx1")).to.equal(undefined);
    expect(AppleSubscriptionStatus_select({ data: [{}] }, "otx1")).to.equal(undefined);
  });

  it("skips another subscription listed before the match", () => {
    expect(AppleSubscriptionStatus_select({ data: [{ lastTransactions: [other, mine] }] }, "otx1")).to.equal(mine);
  });

  it("finds the match in a later group", () => {
    expect(
      AppleSubscriptionStatus_select({ data: [{ lastTransactions: [other] }, { lastTransactions: [mine] }] }, "otx1")
    ).to.equal(mine);
  });

  it("returns nothing when only other subscriptions are listed", () => {
    expect(AppleSubscriptionStatus_select({ data: [{ lastTransactions: [other] }] }, "otx1")).to.equal(undefined);
  });
});
