import "mocha";
import { expect } from "chai";
import { PaymentMix_ofPayments, PaymentMix_plan } from "../lambda/utils/paymentMix";

describe("PaymentMix_plan", () => {
  it("maps every store product id to its plan", () => {
    expect(PaymentMix_plan("com.liftosaur.subscription.and_montly")).to.equal("monthly");
    expect(PaymentMix_plan("com.liftosaur.subscription.ios_montly")).to.equal("monthly");
    expect(PaymentMix_plan("com.liftosaur.subscription.and_yearly")).to.equal("yearly");
    expect(PaymentMix_plan("com.liftosaur.subscription.ios_yearly")).to.equal("yearly");
    expect(PaymentMix_plan("com.liftosaur.subscription.and_lifetime")).to.equal("lifetime");
    expect(PaymentMix_plan("com.liftosaur.subscription.ios_lifetime")).to.equal("lifetime");
    expect(PaymentMix_plan("com.liftosaur.something")).to.equal("other");
  });
});

describe("PaymentMix_ofPayments", () => {
  it("returns nothing for no payments", () => {
    expect(PaymentMix_ofPayments([])).to.eql([]);
  });

  it("counts distinct currency and plan pairs and sums their share", () => {
    const mix = PaymentMix_ofPayments([
      { currency: "EUR", productId: "com.liftosaur.subscription.ios_yearly", isFreeTrialPayment: false, share: 8 },
      { currency: "USD", productId: "com.liftosaur.subscription.and_montly", isFreeTrialPayment: false, share: 1 },
      { currency: "USD", productId: "com.liftosaur.subscription.ios_montly", isFreeTrialPayment: false, share: 1.5 },
      { currency: "EUR", productId: "com.liftosaur.subscription.and_lifetime", isFreeTrialPayment: false, share: 20 },
    ]);
    expect(mix).to.eql([
      { currency: "USD", plan: "monthly", count: 2, trials: 0, share: 2.5 },
      { currency: "EUR", plan: "yearly", count: 1, trials: 0, share: 8 },
      { currency: "EUR", plan: "lifetime", count: 1, trials: 0, share: 20 },
    ]);
  });

  it("orders USD, then EUR, then other currencies alphabetically, each by monthly, yearly, lifetime", () => {
    const mix = PaymentMix_ofPayments([
      { currency: "GBP", productId: "com.liftosaur.subscription.ios_montly", isFreeTrialPayment: false, share: 1 },
      { currency: "AUD", productId: "com.liftosaur.subscription.ios_lifetime", isFreeTrialPayment: false, share: 1 },
      { currency: "EUR", productId: "com.liftosaur.subscription.ios_montly", isFreeTrialPayment: false, share: 1 },
      { currency: "USD", productId: "com.liftosaur.subscription.ios_lifetime", isFreeTrialPayment: false, share: 1 },
      { currency: "USD", productId: "com.liftosaur.subscription.ios_yearly", isFreeTrialPayment: false, share: 1 },
      { currency: "USD", productId: "com.liftosaur.subscription.ios_montly", isFreeTrialPayment: false, share: 1 },
    ]);
    expect(mix.map((e) => `${e.currency} ${e.plan}`)).to.eql([
      "USD monthly",
      "USD yearly",
      "USD lifetime",
      "EUR monthly",
      "AUD lifetime",
      "GBP monthly",
    ]);
  });

  it("counts free-trial payments inside their pair", () => {
    const mix = PaymentMix_ofPayments([
      { currency: "USD", productId: "com.liftosaur.subscription.ios_yearly", isFreeTrialPayment: true, share: 0 },
      { currency: "USD", productId: "com.liftosaur.subscription.ios_yearly", isFreeTrialPayment: false, share: 8 },
    ]);
    expect(mix).to.eql([{ currency: "USD", plan: "yearly", count: 2, trials: 1, share: 8 }]);
  });

  it("treats a row without a currency as USD", () => {
    const mix = PaymentMix_ofPayments([
      { productId: "com.liftosaur.subscription.ios_yearly", isFreeTrialPayment: false, share: 4 },
      { currency: "USD", productId: "com.liftosaur.subscription.and_yearly", isFreeTrialPayment: false, share: 4 },
    ]);
    expect(mix).to.eql([{ currency: "USD", plan: "yearly", count: 2, trials: 0, share: 8 }]);
  });
});
