import "mocha";
import { expect } from "chai";
import {
  AppleOfferAffiliate_OFFER_CODE_TYPE,
  AppleOfferAffiliate_plan,
  AppleOfferAffiliate_renewalOffer,
  AppleOfferAffiliate_resolve,
} from "../lambda/utils/appleOfferAffiliate";

const affiliateIds = new Set(["brick", "military", "thanks26"]);
const offerCode = AppleOfferAffiliate_OFFER_CODE_TYPE;
const brickTx = { transactionId: "t1", purchaseDate: 1000, offerIdentifier: "brick", offerType: offerCode };
const trialTx = { transactionId: "t0", purchaseDate: 500, offerType: 1 };
const thanksRenewal = { offerIdentifier: "thanks26", offerType: offerCode, redeemedAt: 500 };

describe("AppleOfferAffiliate_renewalOffer", () => {
  const renewal = { offerIdentifier: "thanks26", offerType: offerCode };

  it("dates a SUBSCRIBED redemption at the trial start", () => {
    expect(
      AppleOfferAffiliate_renewalOffer({
        notificationType: "SUBSCRIBED",
        transaction: trialTx,
        renewal,
        signedDate: 900,
      })
    ).to.deep.equal({ ...renewal, redeemedAt: 500 });
  });

  it("dates an OFFER_REDEEMED redemption at the notification", () => {
    expect(
      AppleOfferAffiliate_renewalOffer({
        notificationType: "OFFER_REDEEMED",
        transaction: trialTx,
        renewal,
        signedDate: 900,
      })
    ).to.deep.equal({ ...renewal, redeemedAt: 900 });
    expect(
      AppleOfferAffiliate_renewalOffer({ notificationType: "OFFER_REDEEMED", transaction: trialTx, renewal })
    ).to.equal(undefined);
  });

  it("ignores other notification types and renewals without an offer", () => {
    expect(
      AppleOfferAffiliate_renewalOffer({
        notificationType: "DID_CHANGE_RENEWAL_STATUS",
        transaction: trialTx,
        renewal,
        signedDate: 900,
      })
    ).to.equal(undefined);
    expect(
      AppleOfferAffiliate_renewalOffer({ notificationType: "SUBSCRIBED", transaction: trialTx, renewal: {} })
    ).to.equal(undefined);
    expect(AppleOfferAffiliate_renewalOffer({ notificationType: "SUBSCRIBED", transaction: trialTx })).to.equal(
      undefined
    );
  });
});

describe("AppleOfferAffiliate_plan with a renewal offer", () => {
  it("attributes a trial from the renewal offer, without touching the payment's offer name", () => {
    expect(
      AppleOfferAffiliate_plan({
        transaction: trialTx,
        payment: { userId: "u1" },
        affiliateIds,
        renewalOffer: thanksRenewal,
      })
    ).to.deep.equal({
      offerIdentifierToSet: undefined,
      affiliateRow: { affiliateId: "thanks26", userId: "u1", timestamp: 500, type: "coupon" },
    });
  });

  it("prefers the transaction's own offer code", () => {
    expect(
      AppleOfferAffiliate_plan({
        transaction: brickTx,
        fallbackUserId: "u1",
        affiliateIds,
        renewalOffer: thanksRenewal,
      }).affiliateRow
    ).to.deep.equal({ affiliateId: "brick", userId: "u1", timestamp: 1000, type: "coupon" });
  });

  it("ignores promotional renewal offers", () => {
    expect(
      AppleOfferAffiliate_plan({
        transaction: trialTx,
        fallbackUserId: "u1",
        affiliateIds,
        renewalOffer: { ...thanksRenewal, offerType: 2 },
      })
    ).to.deep.equal({});
  });

  it("skips family-shared trials", () => {
    expect(
      AppleOfferAffiliate_plan({
        transaction: { ...trialTx, inAppOwnershipType: "FAMILY_SHARED" },
        fallbackUserId: "u1",
        affiliateIds,
        renewalOffer: thanksRenewal,
      }).affiliateRow
    ).to.equal(undefined);
  });
});

describe("AppleOfferAffiliate_plan", () => {
  it("attributes to the stored payment owner over the fallback", () => {
    expect(
      AppleOfferAffiliate_plan({
        transaction: brickTx,
        payment: { userId: "owner", offerIdentifier: "brick" },
        fallbackUserId: "temp",
        affiliateIds,
      })
    ).to.deep.equal({
      offerIdentifierToSet: undefined,
      affiliateRow: { affiliateId: "brick", userId: "owner", timestamp: 1000, type: "coupon" },
    });
  });

  it("uses the fallback user when there is no payment row", () => {
    expect(
      AppleOfferAffiliate_plan({ transaction: brickTx, fallbackUserId: "temp", affiliateIds }).affiliateRow?.userId
    ).to.equal("temp");
  });

  it("sets the offer name on a payment that lacks it", () => {
    expect(
      AppleOfferAffiliate_plan({ transaction: brickTx, payment: { userId: "owner" }, affiliateIds })
        .offerIdentifierToSet
    ).to.equal("brick");
  });

  it("sets the offer name but writes no row for a non-affiliate offer", () => {
    expect(
      AppleOfferAffiliate_plan({
        transaction: { ...brickTx, offerIdentifier: "Thanksgiving 30% off" },
        payment: { userId: "owner" },
        affiliateIds,
      })
    ).to.deep.equal({ offerIdentifierToSet: "Thanksgiving 30% off" });
  });

  it("writes no row for Sandbox transactions or test payments", () => {
    expect(
      AppleOfferAffiliate_plan({
        transaction: { ...brickTx, environment: "Sandbox" },
        fallbackUserId: "u",
        affiliateIds,
      }).affiliateRow
    ).to.equal(undefined);
    expect(
      AppleOfferAffiliate_plan({
        transaction: brickTx,
        payment: { userId: "u", offerIdentifier: "brick", isTest: true },
        affiliateIds,
      }).affiliateRow
    ).to.equal(undefined);
  });

  it("writes no row for a family-shared transaction or payment", () => {
    expect(
      AppleOfferAffiliate_plan({
        transaction: { ...brickTx, inAppOwnershipType: "FAMILY_SHARED" },
        fallbackUserId: "member",
        affiliateIds,
      }).affiliateRow
    ).to.equal(undefined);
    expect(
      AppleOfferAffiliate_plan({
        transaction: brickTx,
        payment: { userId: "member", offerIdentifier: "brick", inAppOwnershipType: "FAMILY_SHARED" },
        affiliateIds,
      }).affiliateRow
    ).to.equal(undefined);
  });

  it("writes no row without an owner", () => {
    expect(AppleOfferAffiliate_plan({ transaction: brickTx, affiliateIds }).affiliateRow).to.equal(undefined);
  });

  it("does nothing without an offer name", () => {
    expect(
      AppleOfferAffiliate_plan({
        transaction: { transactionId: "t1", purchaseDate: 1 },
        payment: { userId: "u" },
        affiliateIds,
      })
    ).to.deep.equal({});
  });
});

describe("AppleOfferAffiliate_resolve", () => {
  it("maps the yearly offer name to its affiliate", () => {
    expect(AppleOfferAffiliate_resolve({ offerIdentifier: "brick", offerType: offerCode }, affiliateIds)).to.equal(
      "brick"
    );
  });

  it("strips the -monthly suffix", () => {
    expect(
      AppleOfferAffiliate_resolve({ offerIdentifier: "brick-monthly", offerType: offerCode }, affiliateIds)
    ).to.equal("brick");
  });

  it("ignores offer names that are not affiliate ids", () => {
    expect(
      AppleOfferAffiliate_resolve(
        { offerIdentifier: "Thanksgiving Yearly 30% off", offerType: offerCode },
        affiliateIds
      )
    ).to.equal(undefined);
    expect(
      AppleOfferAffiliate_resolve({ offerIdentifier: "dsc30m_MONTHLY", offerType: offerCode }, affiliateIds)
    ).to.equal(undefined);
    expect(AppleOfferAffiliate_resolve({ offerIdentifier: "-monthly", offerType: offerCode }, affiliateIds)).to.equal(
      undefined
    );
  });

  it("ignores offers that are not offer codes", () => {
    expect(AppleOfferAffiliate_resolve({ offerIdentifier: "brick", offerType: 2 }, affiliateIds)).to.equal(undefined);
    expect(AppleOfferAffiliate_resolve({ offerIdentifier: "brick" }, affiliateIds)).to.equal(undefined);
  });

  it("ignores a missing offer name", () => {
    expect(AppleOfferAffiliate_resolve({ offerType: offerCode }, affiliateIds)).to.equal(undefined);
    expect(AppleOfferAffiliate_resolve({ offerIdentifier: "", offerType: offerCode }, affiliateIds)).to.equal(
      undefined
    );
  });
});
