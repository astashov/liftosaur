import "mocha";
import { expect } from "chai";
import { Subscriptions, ISubscriptionPurchaseV2, IProductPurchaseV2 } from "../lambda/utils/subscriptions";

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeSubscriptions(): Subscriptions {
  const log = { log: () => undefined, setUser: () => undefined } as any;
  const secrets = {} as any;
  return new Subscriptions(log, secrets);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const FUTURE = "2999-01-01T00:00:00.000Z";
const PAST = "2000-01-01T00:00:00.000Z";

// Stubs the network fetch so resolver/entitlement tests can simulate a linked-token chain.
function makeSubsWithFetch(map: Record<string, ISubscriptionPurchaseV2 | undefined>): Subscriptions {
  const subs = makeSubscriptions();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (subs as any).getGoogleSubscriptionV2 = async (t: string): Promise<ISubscriptionPurchaseV2 | undefined> => map[t];
  return subs;
}

describe("getGoogleSubscriptionV2Resolved (PENDING_PURCHASE_CANCELED)", () => {
  const active: ISubscriptionPurchaseV2 = {
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    lineItems: [{ productId: "com.liftosaur.subscription.and_montly", expiryTime: FUTURE }],
  };

  it("follows linkedPurchaseToken to the real active subscription", async () => {
    const pending: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED",
      linkedPurchaseToken: "tokA",
      lineItems: [{ productId: "com.liftosaur.subscription.and_yearly", expiryTime: PAST }],
    };
    const subs = makeSubsWithFetch({ tokB: pending, tokA: active });
    const r = await subs.getGoogleSubscriptionV2Resolved("tokB");
    expect(r?.token).to.equal("tokA");
    expect(r?.json.subscriptionState).to.equal("SUBSCRIPTION_STATE_ACTIVE");
  });

  it("returns the payload as-is when not pending-canceled", async () => {
    const subs = makeSubsWithFetch({ tokA: active });
    const r = await subs.getGoogleSubscriptionV2Resolved("tokA");
    expect(r?.token).to.equal("tokA");
  });

  it("returns the pending payload as-is when there is no linkedPurchaseToken", async () => {
    const pending: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED",
      lineItems: [{ productId: "com.liftosaur.subscription.and_montly", expiryTime: FUTURE }],
    };
    const subs = makeSubsWithFetch({ tokB: pending });
    const r = await subs.getGoogleSubscriptionV2Resolved("tokB");
    expect(r?.token).to.equal("tokB");
    expect(r?.json.subscriptionState).to.equal("SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED");
  });

  it("propagates undefined when the linked fetch fails (transport) so entitlement fails open", async () => {
    const pending: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED",
      linkedPurchaseToken: "tokA",
      lineItems: [{ productId: "com.liftosaur.subscription.and_yearly", expiryTime: PAST }],
    };
    // tokA absent from the map => getGoogleSubscriptionV2("tokA") returns undefined (transport failure).
    const subs = makeSubsWithFetch({ tokB: pending });
    expect(await subs.getGoogleSubscriptionV2Resolved("tokB")).to.equal(undefined);
    expect(await subs.verifyGooglePurchaseTokenV2("tokB", "com.liftosaur.subscription.and_montly")).to.equal(true);
  });

  it("verifyGooglePurchaseTokenV2 stays entitled via the linked active subscription", async () => {
    const pending: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED",
      linkedPurchaseToken: "tokA",
      lineItems: [{ productId: "com.liftosaur.subscription.and_yearly", expiryTime: PAST }],
    };
    const subs = makeSubsWithFetch({ tokB: pending, tokA: active });
    expect(await subs.verifyGooglePurchaseTokenV2("tokB", "com.liftosaur.subscription.and_montly")).to.equal(true);
  });
});

describe("getGoogleVerificationInfoV2", () => {
  const subs = makeSubscriptions();

  it("maps an active monthly subscription with no queued switch", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [
        {
          productId: "com.liftosaur.subscription.and_montly",
          expiryTime: FUTURE,
          autoRenewingPlan: { autoRenewEnabled: true },
          offerDetails: { offerId: "monthly-subscription-base", basePlanId: "monthly" },
        },
      ],
    };
    const result = subs.getGoogleVerificationInfoV2("user1", json, "tok1");
    expect(result?.product).to.equal("montly");
    expect(result?.isActive).to.equal(true);
    expect(result?.pendingProduct).to.equal(undefined);
    expect(result?.isTrial).to.equal(false);
    expect(result?.isPromo).to.equal(false);
    expect(result?.originalTransactionId).to.equal("tok1");
  });

  it("reads deferredItemReplacement as the authoritative pendingProduct", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [
        {
          productId: "com.liftosaur.subscription.and_montly",
          expiryTime: FUTURE,
          deferredItemReplacement: { productId: "com.liftosaur.subscription.and_yearly" },
        },
      ],
    };
    const result = subs.getGoogleVerificationInfoV2("user1", json, "tok1");
    expect(result?.product).to.equal("montly");
    expect(result?.pendingProduct).to.equal("yearly");
  });

  it("treats CANCELED but still within the paid period as active", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_CANCELED",
      lineItems: [{ productId: "com.liftosaur.subscription.and_yearly", expiryTime: FUTURE }],
    };
    const result = subs.getGoogleVerificationInfoV2("user1", json, "tok1");
    expect(result?.product).to.equal("yearly");
    expect(result?.isActive).to.equal(true);
  });

  it("treats CANCELED past the paid period as inactive", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_CANCELED",
      lineItems: [{ productId: "com.liftosaur.subscription.and_yearly", expiryTime: PAST }],
    };
    const result = subs.getGoogleVerificationInfoV2("user1", json, "tok1");
    expect(result?.isActive).to.equal(false);
  });

  it("treats ON_HOLD / PAUSED / EXPIRED as inactive even before expiry", () => {
    for (const state of [
      "SUBSCRIPTION_STATE_ON_HOLD",
      "SUBSCRIPTION_STATE_PAUSED",
      "SUBSCRIPTION_STATE_EXPIRED",
      "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED",
    ] as const) {
      const json: ISubscriptionPurchaseV2 = {
        subscriptionState: state,
        lineItems: [{ productId: "com.liftosaur.subscription.and_montly", expiryTime: FUTURE }],
      };
      const result = subs.getGoogleVerificationInfoV2("user1", json, "tok1");
      expect(result?.isActive, `state ${state}`).to.equal(false);
    }
  });

  it("picks the line item with the latest expiry during a transition", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [
        { productId: "com.liftosaur.subscription.and_montly", expiryTime: PAST },
        { productId: "com.liftosaur.subscription.and_yearly", expiryTime: FUTURE },
      ],
    };
    const result = subs.getGoogleVerificationInfoV2("user1", json, "tok1");
    expect(result?.product).to.equal("yearly");
    expect(result?.expires).to.equal(new Date(FUTURE).getTime());
  });

  it("derives isTrial from a trial offer id", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [
        {
          productId: "com.liftosaur.subscription.and_montly",
          expiryTime: FUTURE,
          offerDetails: { offerId: "monthly-subscription-trial" },
        },
      ],
    };
    const result = subs.getGoogleVerificationInfoV2("user1", json, "tok1");
    expect(result?.isTrial).to.equal(true);
    expect(result?.isPromo).to.equal(false);
  });

  it("derives isTrial from an offer tag regardless of offer id", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [
        {
          productId: "com.liftosaur.subscription.and_montly",
          expiryTime: FUTURE,
          offerDetails: { offerId: "winback-2026", offerTags: ["freetrial"] },
        },
      ],
    };
    const result = subs.getGoogleVerificationInfoV2("user1", json, "tok1");
    expect(result?.isTrial).to.equal(true);
    expect(result?.isPromo).to.equal(false);
  });

  it("derives isPromo from a promo offer tag", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [
        {
          productId: "com.liftosaur.subscription.and_yearly",
          expiryTime: FUTURE,
          offerDetails: { offerId: "yearly-base", offerTags: ["promo"] },
        },
      ],
    };
    const result = subs.getGoogleVerificationInfoV2("user1", json, "tok1");
    expect(result?.isPromo).to.equal(true);
    expect(result?.promoCode).to.equal("yearly-base");
  });

  it("derives isPromo from a non-base, non-trial offer id", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [
        {
          productId: "com.liftosaur.subscription.and_yearly",
          expiryTime: FUTURE,
          offerDetails: { offerId: "yearly-discount-30" },
        },
      ],
    };
    const result = subs.getGoogleVerificationInfoV2("user1", json, "tok1");
    expect(result?.isPromo).to.equal(true);
    expect(result?.promoCode).to.equal("yearly-discount-30");
    expect(result?.isTrial).to.equal(false);
  });

  it("prefers linkedPurchaseToken as the original transaction id", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      linkedPurchaseToken: "original-token",
      lineItems: [{ productId: "com.liftosaur.subscription.and_montly", expiryTime: FUTURE }],
    };
    const result = subs.getGoogleVerificationInfoV2("user1", json, "current-token");
    expect(result?.originalTransactionId).to.equal("original-token");
  });

  it("returns undefined when there are no line items", () => {
    const json: ISubscriptionPurchaseV2 = { subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", lineItems: [] };
    expect(subs.getGoogleVerificationInfoV2("user1", json, "tok1")).to.equal(undefined);
  });
});

describe("getGoogleVerificationInfoV2 current-period trial/promo (with order amount)", () => {
  const subs = makeSubscriptions();

  function sub(offer: { offerId?: string; offerTags?: string[] }, recurringUnits: string): ISubscriptionPurchaseV2 {
    return {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [
        {
          productId: "com.liftosaur.subscription.and_montly",
          expiryTime: FUTURE,
          autoRenewingPlan: { recurringPrice: { currencyCode: "USD", units: recurringUnits, nanos: 990000000 } },
          offerDetails: offer,
        },
      ],
    };
  }

  it("free now + trial offer => isTrial", () => {
    const r = subs.getGoogleVerificationInfoV2("u", sub({ offerTags: ["freetrial"] }, "4"), "tok", 0);
    expect(r?.isTrial).to.equal(true);
    expect(r?.isPromo).to.equal(false);
  });

  it("converted to paid (full price) => neither trial nor promo, even with freetrial tag still set", () => {
    const r = subs.getGoogleVerificationInfoV2("u", sub({ offerTags: ["freetrial"] }, "4"), "tok", 4.99);
    expect(r?.isTrial).to.equal(false);
    expect(r?.isPromo).to.equal(false);
  });

  it("paying below recurring price => isPromo", () => {
    const r = subs.getGoogleVerificationInfoV2(
      "u",
      sub({ offerTags: ["promo"], offerId: "monthly-discount-30" }, "4"),
      "tok",
      3.49
    );
    expect(r?.isTrial).to.equal(false);
    expect(r?.isPromo).to.equal(true);
    expect(r?.promoCode).to.equal("monthly-discount-30");
  });

  it("falls back to offer tags when order amount is omitted", () => {
    const r = subs.getGoogleVerificationInfoV2("u", sub({ offerTags: ["freetrial"] }, "4"), "tok");
    expect(r?.isTrial).to.equal(true);
  });

  // offerPhase is the authoritative current-phase signal and wins over tags/amount.
  function subWithPhase(
    offer: { offerId?: string; offerTags?: string[] },
    phase: { freeTrial?: unknown; introductoryPrice?: unknown; basePrice?: unknown }
  ): ISubscriptionPurchaseV2 {
    return {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [
        {
          productId: "com.liftosaur.subscription.and_montly",
          expiryTime: FUTURE,
          autoRenewingPlan: { recurringPrice: { currencyCode: "USD", units: "4", nanos: 990000000 } },
          offerDetails: offer,
          offerPhase: phase,
        },
      ],
    };
  }

  it("offerPhase.freeTrial => isTrial even when the offer is tagged promo (the discount-with-trial case)", () => {
    const json = subWithPhase({ offerId: "monthly-discount-30", offerTags: ["promo"] }, { freeTrial: {} });
    const r = subs.getGoogleVerificationInfoV2("u", json, "tok", 0);
    expect(r?.isTrial).to.equal(true);
    expect(r?.isPromo).to.equal(false);
  });

  it("offerPhase.introductoryPrice => isPromo", () => {
    const json = subWithPhase({ offerId: "monthly-discount-30", offerTags: ["promo"] }, { introductoryPrice: {} });
    const r = subs.getGoogleVerificationInfoV2("u", json, "tok", 3.49);
    expect(r?.isTrial).to.equal(false);
    expect(r?.isPromo).to.equal(true);
    expect(r?.promoCode).to.equal("monthly-discount-30");
  });

  it("offerPhase.basePrice => neither, overriding a still-attached freetrial tag", () => {
    const json = subWithPhase({ offerTags: ["freetrial"] }, { basePrice: {} });
    const r = subs.getGoogleVerificationInfoV2("u", json, "tok", 0);
    expect(r?.isTrial).to.equal(false);
    expect(r?.isPromo).to.equal(false);
  });
});

describe("isGoogleSubscriptionV2Active", () => {
  const subs = makeSubscriptions();

  it("is true for ACTIVE within period and false past expiry", () => {
    const active: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [{ productId: "com.liftosaur.subscription.and_montly", expiryTime: FUTURE }],
    };
    const expired: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [{ productId: "com.liftosaur.subscription.and_montly", expiryTime: PAST }],
    };
    expect(subs.isGoogleSubscriptionV2Active(active)).to.equal(true);
    expect(subs.isGoogleSubscriptionV2Active(expired)).to.equal(false);
  });

  it("is false for an error/empty body (no lineItems)", () => {
    expect(subs.isGoogleSubscriptionV2Active({} as ISubscriptionPurchaseV2)).to.equal(false);
  });
});

describe("isGoogleProductV2Active", () => {
  const subs = makeSubscriptions();

  it("requires purchased + acknowledged", () => {
    expect(
      subs.isGoogleProductV2Active({
        purchaseStateContext: { purchaseState: "PURCHASED" },
        acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
      })
    ).to.equal(true);
    expect(
      subs.isGoogleProductV2Active({
        purchaseStateContext: { purchaseState: "PURCHASED" },
        acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
      })
    ).to.equal(false);
  });
});

describe("buildGoogleSubscriptionPaymentInfoV2", () => {
  const subs = makeSubscriptions();

  it("uses the line item's latestSuccessfulOrderId (not the deprecated top-level latestOrderId)", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      linkedPurchaseToken: "orig-token",
      latestOrderId: "GPA.pending-or-declined",
      startTime: "2025-03-03T17:11:49.283Z",
      lineItems: [
        {
          productId: "com.liftosaur.subscription.and_yearly",
          expiryTime: FUTURE,
          latestSuccessfulOrderId: "GPA.123..0",
          autoRenewingPlan: {
            autoRenewEnabled: true,
            recurringPrice: { currencyCode: "EUR", units: "49", nanos: 990000000 },
          },
          offerDetails: { offerId: "yearly-subscription-trial", offerTags: ["freetrial"] },
        },
      ],
    };
    const info = subs.buildGoogleSubscriptionPaymentInfoV2(json, "current-token");
    expect(info.kind).to.equal("subscription");
    expect(info.purchaseToken).to.equal("current-token");
    expect(info.orderId).to.equal("GPA.123..0");
    expect(subs.getGoogleSubscriptionSuccessfulOrderId(json)).to.equal("GPA.123..0");
    expect(info.originalTransactionId).to.equal("orig-token");
    expect(info.isRenewal).to.equal(true);
    expect(info.currency).to.equal("EUR");
    expect(info.fallbackAmount).to.equal(49.99);
    expect(info.startTimeMs).to.equal(new Date("2025-03-03T17:11:49.283Z").getTime());
  });

  it("leaves orderId undefined when no successful order exists yet (e.g. unpaid/pending)", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ON_HOLD",
      latestOrderId: "GPA.declined",
      lineItems: [{ productId: "com.liftosaur.subscription.and_montly", expiryTime: FUTURE }],
    };
    expect(subs.buildGoogleSubscriptionPaymentInfoV2(json, "tok").orderId).to.equal(undefined);
  });

  it("marks a first purchase (no linkedPurchaseToken) as non-renewal", () => {
    const json: ISubscriptionPurchaseV2 = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      latestOrderId: "GPA.123",
      lineItems: [{ productId: "com.liftosaur.subscription.and_montly", expiryTime: FUTURE }],
    };
    const info = subs.buildGoogleSubscriptionPaymentInfoV2(json, "tok");
    expect(info.isRenewal).to.equal(false);
    expect(info.originalTransactionId).to.equal("tok");
  });
});

describe("buildGoogleProductPaymentInfoV2", () => {
  const subs = makeSubscriptions();

  it("uses the token as originalTransactionId and is never a trial/renewal", () => {
    const info = subs.buildGoogleProductPaymentInfoV2(
      { orderId: "GPA.lifetime", purchaseCompletionTime: "2025-03-03T17:11:49.283Z" },
      "lifetime-token"
    );
    expect(info.kind).to.equal("product");
    expect(info.orderId).to.equal("GPA.lifetime");
    expect(info.originalTransactionId).to.equal("lifetime-token");
    expect(info.isRenewal).to.equal(false);
    expect(info.purchaseTimeMs).to.equal(new Date("2025-03-03T17:11:49.283Z").getTime());
  });
});

describe("maybeAcknowledgeGoogleProductV2", () => {
  const subs = makeSubscriptions();

  it("acks a pending purchased product and marks the json acknowledged on success", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (subs as any).acknowledgeGooglePurchase = async (): Promise<boolean> => true;
    const json: IProductPurchaseV2 = {
      purchaseStateContext: { purchaseState: "PURCHASED" },
      acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    };
    await subs.maybeAcknowledgeGoogleProductV2(json, "tok", "com.liftosaur.subscription.and_lifetime");
    expect(json.acknowledgementState).to.equal("ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED");
    expect(subs.isGoogleProductV2Active(json)).to.equal(true);
  });

  it("does not mutate the json when the ack POST fails", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (subs as any).acknowledgeGooglePurchase = async (): Promise<boolean> => false;
    const json: IProductPurchaseV2 = {
      purchaseStateContext: { purchaseState: "PURCHASED" },
      acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    };
    await subs.maybeAcknowledgeGoogleProductV2(json, "tok", "com.liftosaur.subscription.and_lifetime");
    expect(json.acknowledgementState).to.equal("ACKNOWLEDGEMENT_STATE_PENDING");
  });
});

describe("getGoogleProductVerificationInfoV2", () => {
  const subs = makeSubscriptions();

  it("marks a purchased + acknowledged lifetime product active with far-future expiry", () => {
    const json: IProductPurchaseV2 = {
      purchaseStateContext: { purchaseState: "PURCHASED" },
      acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    };
    const result = subs.getGoogleProductVerificationInfoV2("user1", json, "tok1");
    expect(result?.product).to.equal("lifetime");
    expect(result?.isActive).to.equal(true);
    expect(result?.expires).to.equal(4105144800000);
    expect(result?.originalTransactionId).to.equal("tok1");
  });

  it("marks an unacknowledged purchase inactive", () => {
    const json: IProductPurchaseV2 = {
      purchaseStateContext: { purchaseState: "PURCHASED" },
      acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    };
    expect(subs.getGoogleProductVerificationInfoV2("user1", json, "tok1")?.isActive).to.equal(false);
  });

  it("marks a canceled/refunded purchase inactive", () => {
    const json: IProductPurchaseV2 = {
      purchaseStateContext: { purchaseState: "CANCELLED" },
      acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    };
    expect(subs.getGoogleProductVerificationInfoV2("user1", json, "tok1")?.isActive).to.equal(false);
  });

  it("returns undefined for an error/empty body (no purchaseStateContext) — never mints a far-future row", () => {
    expect(subs.getGoogleProductVerificationInfoV2("user1", {}, "tok1")).to.equal(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(subs.getGoogleProductVerificationInfoV2("user1", { error: {} } as any, "tok1")).to.equal(undefined);
  });
});
