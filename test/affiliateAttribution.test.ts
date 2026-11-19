import "mocha";
import { expect } from "chai";
import {
  AffiliateAttribution_first,
  AffiliateAttribution_isEligiblePayment,
  AffiliateAttribution_merge,
  AffiliateAttribution_ofRows,
  AffiliateAttribution_ofStorage,
} from "../lambda/utils/affiliateAttribution";
import { IPaymentDao } from "../lambda/dao/paymentDao";

function payment(overrides: Partial<IPaymentDao>): IPaymentDao {
  return {
    userId: "u1",
    timestamp: 1000,
    originalTransactionId: "o1",
    transactionId: "t1",
    productId: "com.liftosaur.subscription.ios_yearly",
    amount: 40,
    currency: "USD",
    type: "apple",
    source: "webhook",
    paymentType: "renewal",
    isFreeTrialPayment: false,
    subscriptionStartTimestamp: 500,
    ...overrides,
  };
}

describe("AffiliateAttribution_ofStorage", () => {
  it("reads current and legacy numeric entries", () => {
    expect(
      AffiliateAttribution_ofStorage({
        brick: { id: "brick", timestamp: 10, type: "coupon", vtype: "affiliate" },
        old: 5,
      })
    ).to.deep.equal([
      { affiliateId: "brick", timestamp: 10, type: "coupon" },
      { affiliateId: "old", timestamp: 5, type: "program" },
    ]);
  });

  it("returns nothing for missing storage", () => {
    expect(AffiliateAttribution_ofStorage(undefined)).to.deep.equal([]);
    expect(AffiliateAttribution_ofStorage({ gone: undefined })).to.deep.equal([]);
  });
});

describe("AffiliateAttribution_ofRows", () => {
  it("defaults a missing timestamp to 0 and a missing type to program", () => {
    expect(AffiliateAttribution_ofRows([{ affiliateId: "a", userId: "u1" }])).to.deep.equal([
      { affiliateId: "a", timestamp: 0, type: "program" },
    ]);
  });
});

describe("AffiliateAttribution_merge", () => {
  it("keeps the earliest entry per affiliate", () => {
    const merged = AffiliateAttribution_merge(
      [{ affiliateId: "a", timestamp: 20, type: "program" }],
      [
        { affiliateId: "a", timestamp: 10, type: "coupon" },
        { affiliateId: "b", timestamp: 30, type: "program" },
      ]
    );
    expect(merged).to.deep.equal([
      { affiliateId: "a", timestamp: 10, type: "coupon" },
      { affiliateId: "b", timestamp: 30, type: "program" },
    ]);
  });
});

describe("AffiliateAttribution_first", () => {
  it("picks the earliest entry", () => {
    expect(
      AffiliateAttribution_first([
        { affiliateId: "b", timestamp: 20, type: "program" },
        { affiliateId: "a", timestamp: 10, type: "coupon" },
      ])?.affiliateId
    ).to.equal("a");
  });

  it("breaks a timestamp tie by affiliate id", () => {
    expect(
      AffiliateAttribution_first([
        { affiliateId: "b", timestamp: 10, type: "program" },
        { affiliateId: "a", timestamp: 10, type: "program" },
      ])?.affiliateId
    ).to.equal("a");
  });

  it("returns undefined for no entries", () => {
    expect(AffiliateAttribution_first([])).to.equal(undefined);
  });
});

describe("AffiliateAttribution_isEligiblePayment", () => {
  const coupon = { affiliateId: "brick", timestamp: 1000, type: "coupon" as const };
  const program = { affiliateId: "brick", timestamp: 400, type: "program" as const };

  it("credits a coupon payment made at or after the redemption, even on an older subscription", () => {
    expect(AffiliateAttribution_isEligiblePayment(payment({ timestamp: 1000, subscriptionStartTimestamp: 1 }), coupon))
      .to.be.true;
    expect(AffiliateAttribution_isEligiblePayment(payment({ timestamp: 999 }), coupon)).to.be.false;
  });

  it("credits a program payment only for a subscription started after the link", () => {
    expect(AffiliateAttribution_isEligiblePayment(payment({ subscriptionStartTimestamp: 500 }), program)).to.be.true;
    expect(AffiliateAttribution_isEligiblePayment(payment({ subscriptionStartTimestamp: 400 }), program)).to.be.false;
    expect(AffiliateAttribution_isEligiblePayment(payment({ subscriptionStartTimestamp: undefined }), program)).to.be
      .false;
  });

  it("never credits refunds or test purchases", () => {
    expect(AffiliateAttribution_isEligiblePayment(payment({ paymentType: "refund", timestamp: 2000 }), coupon)).to.be
      .false;
    expect(AffiliateAttribution_isEligiblePayment(payment({ isTest: true, timestamp: 2000 }), coupon)).to.be.false;
  });
});
