import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { Platform } from "react-native";
import { SyncTestUtils_initTheApp } from "./utils/syncTestUtils";
import {
  Thunk_subscribeMonthly,
  Thunk_buyLifetime,
  Thunk_restorePurchases,
  Thunk_redeemCouponIOS,
} from "../src/ducks/thunks";
import { AppleJWTVerifier } from "../lambda/utils/appleJwtVerifier";
import { Subscriptions } from "../lambda/utils/subscriptions";
import * as encoder from "../src/utils/encoder";
import { NodeEncoder_encode } from "../lambda/utils/nodeEncoder";

describe("IAP", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (global as any).__API_HOST__ = "https://www.liftosaur.com";
    (global as any).__HOST__ = "https://www.liftosaur.com";
    (global as any).__ENV__ = "prod";
    (global as any).__FULL_COMMIT_HASH__ = "abc123";
    (global as any).__COMMIT_HASH__ = "abc123";
    (global as any).Rollbar = { configure: () => undefined };
    /* eslint-enable @typescript-eslint/no-explicit-any */
    let ts = 0;
    sandbox = sinon.createSandbox();
    sandbox.stub(Date, "now").callsFake(() => {
      ts += 1;
      return ts;
    });
    sandbox.stub(encoder, "Encoder_encode").callsFake((...args: [string]) => NodeEncoder_encode(...args));
  });

  afterEach(() => {
    sandbox.restore();
  });

  function setIosPlatform(): void {
    sandbox.stub(Platform, "OS").value("ios");
  }

  function setAndroidPlatform(): void {
    sandbox.stub(Platform, "OS").value("android");
  }

  function stubAppleJwsValid(opts?: { productId?: string }): sinon.SinonStub {
    const productId = opts?.productId ?? "com.liftosaur.subscription.ios_montly";
    return sandbox.stub(AppleJWTVerifier.prototype, "verifyJWT").returns({
      transactionId: "100",
      originalTransactionId: "100",
      productId,
      bundleId: "com.liftosaur.www",
      purchaseDate: 1,
      originalPurchaseDate: 1,
      expiresDate: Number.MAX_SAFE_INTEGER,
      storefront: "USA",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  function stubLegacyReceiptValid(productId = "com.liftosaur.subscription.ios_montly"): sinon.SinonStub {
    return sandbox.stub(Subscriptions.prototype, "getAppleVerificationJson").resolves({
      status: 0,
      receipt: {
        receipt_type: "Production",
        receipt_creation_date: "",
        original_purchase_date: "",
        receipt_creation_date_ms: "1",
        in_app: [
          {
            product_id: productId,
            transaction_id: "200",
            original_transaction_id: "200",
            purchase_date: "",
            purchase_date_ms: "1",
            purchase_date_pst: "",
            original_purchase_date: "",
            original_purchase_date_ms: "1",
            original_purchase_date_pst: "",
            expires_date: "",
            expires_date_ms: String(Number.MAX_SAFE_INTEGER),
            expires_date_pst: "",
            is_trial_period: "false",
            is_in_intro_offer_period: "false",
            in_app_ownership_type: "PURCHASED",
          },
        ],
      },
      latest_receipt_info: [
        {
          product_id: productId,
          purchase_date: "",
          purchase_date_ms: "1",
          original_purchase_date: "",
          original_purchase_date_ms: "1",
          expires_date: "",
          expires_date_ms: String(Number.MAX_SAFE_INTEGER),
          is_trial_period: "false",
          is_in_intro_offer_period: "false",
          in_app_ownership_type: "PURCHASED",
          offer_code_ref_name: "",
          original_transaction_id: "200",
          transaction_id: "200",
        },
      ],
    });
  }

  function stubGoogleSubscriptionValid(): sinon.SinonStub {
    return sandbox.stub(Subscriptions.prototype, "getGooglePurchaseTokenJson").resolves({
      kind: "androidpublisher#subscriptionPurchase",
      startTimeMillis: "1",
      expiryTimeMillis: String(Number.MAX_SAFE_INTEGER),
      autoRenewing: true,
      priceCurrencyCode: "USD",
      priceAmountMicros: "4990000",
      countryCode: "US",
      developerPayload: "",
      orderId: "GPA.123",
      purchaseType: 0,
      acknowledgementState: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  it("ios sk2 monthly purchase ends up in storage.subscription.apple", async () => {
    setIosPlatform();
    stubAppleJwsValid();
    const { mockReducer, iapAdapter: adapter } = await SyncTestUtils_initTheApp("rn_ios_1");

    await mockReducer.run([Thunk_subscribeMonthly()]);
    expect(adapter.requestSubscriptionCalls).to.have.lengthOf(1);
    expect(adapter.requestSubscriptionCalls[0].sku).to.equal("com.liftosaur.subscription.ios_montly");

    await adapter.emitPurchase({
      id: "0",
      transactionId: "100",
      productId: "com.liftosaur.subscription.ios_montly",
      purchaseToken: "header.payload.sig",
    });

    const sub = mockReducer.state.storage.subscription;
    expect(sub.apple).to.have.lengthOf(1);
    expect(sub.apple[0].value).to.equal("header.payload.sig");
    expect(adapter.finishTransactionCalls).to.have.lengthOf(1);
    expect(mockReducer.state.subscriptionLoading).to.equal(undefined);
  });

  it("ios sk1 legacy receipt fallback when purchase has no JWS", async () => {
    setIosPlatform();
    stubLegacyReceiptValid();
    const { mockReducer, iapAdapter: adapter } = await SyncTestUtils_initTheApp("rn_ios_1");
    adapter.legacyReceipt = "legacy-base64-receipt";

    await mockReducer.run([Thunk_subscribeMonthly()]);
    await adapter.emitPurchase({
      id: "0",
      transactionId: "200",
      productId: "com.liftosaur.subscription.ios_montly",
    });

    const sub = mockReducer.state.storage.subscription;
    expect(sub.apple).to.have.lengthOf(1);
    expect(sub.apple[0].value).to.equal("legacy-base64-receipt");
  });

  it("ios lifetime purchase via in-app product", async () => {
    setIosPlatform();
    stubAppleJwsValid({ productId: "com.liftosaur.subscription.ios_lifetime" });
    const { mockReducer, iapAdapter: adapter } = await SyncTestUtils_initTheApp("rn_ios_1");

    await mockReducer.run([Thunk_buyLifetime()]);
    expect(adapter.requestInAppProductCalls).to.have.lengthOf(1);
    expect(adapter.requestInAppProductCalls[0].sku).to.equal("com.liftosaur.subscription.ios_lifetime");

    await adapter.emitPurchase({
      id: "0",
      transactionId: "300",
      productId: "com.liftosaur.subscription.ios_lifetime",
      purchaseToken: "header.payload.sig",
    });

    const sub = mockReducer.state.storage.subscription;
    expect(sub.apple).to.have.lengthOf(1);
    expect(sub.apple[0].value).to.equal("header.payload.sig");
  });

  it("ios restore picks up existing purchase via JWS path", async () => {
    setIosPlatform();
    stubAppleJwsValid();
    const { mockReducer, iapAdapter: adapter } = await SyncTestUtils_initTheApp("rn_ios_1");
    adapter.availablePurchases = [
      {
        id: "0",
        transactionId: "400",
        productId: "com.liftosaur.subscription.ios_montly",
        purchaseToken: "header.payload.sig",
      },
    ];

    await mockReducer.run([Thunk_restorePurchases()]);

    const sub = mockReducer.state.storage.subscription;
    expect(sub.apple).to.have.lengthOf(1);
    expect(sub.apple[0].value).to.equal("header.payload.sig");
  });

  it("android monthly purchase routes via setGooglePurchaseToken", async () => {
    setAndroidPlatform();
    stubGoogleSubscriptionValid();
    const { mockReducer, iapAdapter: adapter } = await SyncTestUtils_initTheApp("rn_android_1");

    await mockReducer.run([Thunk_subscribeMonthly()]);
    expect(adapter.requestSubscriptionCalls).to.have.lengthOf(1);
    expect(adapter.requestSubscriptionCalls[0].sku).to.equal("com.liftosaur.subscription.and_montly");

    await adapter.emitPurchase({
      id: "0",
      transactionId: "500",
      productId: "com.liftosaur.subscription.and_montly",
      purchaseToken: "android-token",
    });

    const sub = mockReducer.state.storage.subscription;
    expect(sub.google).to.have.lengthOf(1);
    expect(sub.apple).to.have.lengthOf(0);
    const stored = JSON.parse(sub.google[0].value) as { productId: string; token: string };
    expect(stored.productId).to.equal("com.liftosaur.subscription.and_montly");
    expect(stored.token).to.equal("android-token");
  });

  it("already-subscribed guard skips requestSubscription", async () => {
    setIosPlatform();
    const { mockReducer, iapAdapter: adapter } = await SyncTestUtils_initTheApp("rn_ios_1");
    adapter.availablePurchases = [
      {
        id: "0",
        transactionId: "600",
        productId: "com.liftosaur.subscription.ios_montly",
        purchaseToken: "header.payload.sig",
      },
    ];

    await mockReducer.run([Thunk_subscribeMonthly()]);
    expect(adapter.requestSubscriptionCalls).to.have.lengthOf(0);
    expect(mockReducer.state.subscriptionLoading).to.equal(undefined);
  });

  it("dedupes duplicate purchase events for the same transaction", async () => {
    setIosPlatform();
    stubAppleJwsValid();
    const { mockReducer, iapAdapter: adapter } = await SyncTestUtils_initTheApp("rn_ios_1");

    await mockReducer.run([Thunk_subscribeMonthly()]);
    const purchase = {
      id: "0",
      transactionId: "700",
      productId: "com.liftosaur.subscription.ios_montly",
      purchaseToken: "header.payload.sig",
    };
    await adapter.emitPurchase(purchase);
    await adapter.emitPurchase(purchase);

    expect(mockReducer.state.storage.subscription.apple).to.have.lengthOf(1);
    expect(adapter.finishTransactionCalls).to.have.lengthOf(1);
  });

  it("ios subscribe with apple promo passes signed offer to adapter", async () => {
    setIosPlatform();
    stubAppleJwsValid();
    const { mockReducer, iapAdapter: adapter } = await SyncTestUtils_initTheApp("rn_ios_1");

    const promo = {
      offerId: "monthly-discount",
      signature: "base64sig",
      nonce: "nonce-uuid",
      timestamp: 1234567890,
    };
    await mockReducer.run([Thunk_subscribeMonthly({ applePromo: promo })]);

    expect(adapter.requestSubscriptionCalls).to.have.lengthOf(1);
    const call = adapter.requestSubscriptionCalls[0];
    expect(call.sku).to.equal("com.liftosaur.subscription.ios_montly");
    expect(call.applePromo).to.deep.equal({
      identifier: "monthly-discount",
      keyIdentifier: "CNHQ5ZL35U",
      nonce: "nonce-uuid",
      signature: "base64sig",
      timestamp: 1234567890,
    });
  });

  it("android subscribe with google promo passes offerId to adapter", async () => {
    setAndroidPlatform();
    stubGoogleSubscriptionValid();
    const { mockReducer, iapAdapter: adapter } = await SyncTestUtils_initTheApp("rn_android_1");

    await mockReducer.run([
      Thunk_subscribeMonthly({
        googlePromo: { offerId: "monthly-subscription-trial", productId: "com.liftosaur.subscription.and_montly" },
      }),
    ]);

    expect(adapter.requestSubscriptionCalls).to.have.lengthOf(1);
    expect(adapter.requestSubscriptionCalls[0].googleOfferId).to.equal("monthly-subscription-trial");
  });

  it("ios coupon redemption calls presentCodeRedemptionSheetIOS", async () => {
    setIosPlatform();
    const { mockReducer, iapAdapter: adapter } = await SyncTestUtils_initTheApp("rn_ios_1");

    await mockReducer.run([Thunk_redeemCouponIOS()]);

    expect(adapter.presentCodeRedemptionCalled).to.equal(1);
  });

  it("user cancellation clears subscriptionLoading", async () => {
    setIosPlatform();
    const { mockReducer, iapAdapter: adapter } = await SyncTestUtils_initTheApp("rn_ios_1");

    await mockReducer.run([Thunk_subscribeMonthly()]);
    expect(mockReducer.state.subscriptionLoading?.monthly).to.equal(true);

    await adapter.emitError({ code: "user-cancelled", message: "User cancelled" });

    expect(mockReducer.state.subscriptionLoading).to.equal(undefined);
  });
});
