import "mocha";
import { expect } from "chai";
import {
  AppleOfferAffiliate_OFFER_CODE_TYPE,
  AppleOfferAffiliate_plan,
  AppleOfferAffiliate_resolve,
} from "../lambda/utils/appleOfferAffiliate";

const affiliateIds = new Set(["brick", "military", "thanks26"]);
const offerCode = AppleOfferAffiliate_OFFER_CODE_TYPE;
const brickTx = { transactionId: "t1", purchaseDate: 1000, offerIdentifier: "brick", offerType: offerCode };

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
