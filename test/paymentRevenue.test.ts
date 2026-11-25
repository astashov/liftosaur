import "mocha";
import { expect } from "chai";
import { PaymentRevenue_isCounted } from "../lambda/utils/paymentRevenue";

describe("PaymentRevenue_isCounted", () => {
  it("counts purchased and not-yet-classified rows", () => {
    expect(PaymentRevenue_isCounted({ inAppOwnershipType: "PURCHASED" })).to.be.true;
    expect(PaymentRevenue_isCounted({})).to.be.true;
  });

  it("excludes family-shared copies", () => {
    expect(PaymentRevenue_isCounted({ inAppOwnershipType: "FAMILY_SHARED" })).to.be.false;
  });

  it("excludes test purchases", () => {
    expect(PaymentRevenue_isCounted({ isTest: true, inAppOwnershipType: "PURCHASED" })).to.be.false;
  });
});
