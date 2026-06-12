import fetch from "node-fetch";
import { Utils_getEnv } from "../utils";
import { ILogUtil } from "./log";
import JWT from "jsonwebtoken";
import { ISecretsUtil } from "./secrets";
import { ILimitedUserDao } from "../dao/userDao";
import { CollectionUtils_sort, CollectionUtils_compact } from "../../src/utils/collection";
import { ISubscriptionDetailsDao, SubscriptionDetailsDao } from "../dao/subscriptionDetailsDao";
import { ISubscription } from "../../src/types";
import { FreeUserDao } from "../dao/freeUserDao";
import { IDI } from "./di";
import { AppleJWTVerifier } from "./appleJwtVerifier";
import type { IAppleTransactionInfo } from "./appleWebhookHandler";

export const APPLE_PRODUCT_IDS = [
  "com.liftosaur.subscription.ios_montly",
  "com.liftosaur.subscription.ios_yearly",
  "com.liftosaur.subscription.ios_lifetime",
];

export const APPLE_BUNDLE_ID = "com.liftosaur.www";

// Offer tags the trial/promo derivation recognizes from subscriptionsv2 `offerDetails.offerTags[]`.
// Tags are the rename-proof signal that replaces the deprecated v1 `paymentState` GET. Keep this list in
// sync with Play Console (Monetize → Subscriptions → offer → "Offer tags"); the offerId naming convention
// is the fallback when an offer has no matching tag.
// As of 2026-06: "freetrial" → monthly/yearly-subscription-trial; "promo" → monthly/yearly-discount-30.
export const GOOGLE_TRIAL_OFFER_TAGS: string[] = ["freetrial"];
export const GOOGLE_PROMO_OFFER_TAGS: string[] = ["promo"];

export function Subscriptions_isAppleJws(value: string): boolean {
  if (!value) {
    return false;
  }
  const parts = value.split(".");
  return parts.length === 3 && parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p));
}

export interface IAppleTransactionHistory {
  signedTransactions?: string[];
  hasMore?: boolean;
  revision?: string;
}

export interface IAppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  purchaseDate: number;
  originalPurchaseDate: number;
  quantity: number;
  type: string;
  inAppOwnershipType: string;
  signedDate: number;
  environment: string;
  transactionReason: string;
  storefront: string;
  storefrontId: string;
  price: number;
  currency: string;
  appTransactionId: string;
  offerDiscountType?: "FREE_TRIAL" | "PAY_UP_FRONT" | "PAY_AS_YOU_GO";
  offerIdentifier?: string;
}

interface IGoogleOrderInfo {
  orderId: string;
  packageName: string;
  productId: string;
  purchaseTime: number;
  createTime: string; // like "2025-03-03T17:11:49.283Z";
  lastEventTime: string; // like "2025-03-03T17:11:50.905Z";
  purchaseState: number;
  purchaseToken: string;
  quantity: number;
  acknowledged: boolean;
  total?: {
    units?: string;
    nanos?: number;
    currencyCode?: string;
  };
  tax?: {
    units?: string;
    nanos?: number;
    currencyCode?: string;
  };
  lineItems?: Array<{
    productId?: string;
    subscriptionDetails?: {
      basePlanId?: string;
      offerId?: string;
    };
  }>;
}

// androidpublisher v3 `purchases.subscriptionsv2.get` response (SubscriptionPurchaseV2).
// Token-only path; the product lives in lineItems[].productId, not in the URL.
export type IGoogleSubscriptionStateV2 =
  | "SUBSCRIPTION_STATE_UNSPECIFIED"
  | "SUBSCRIPTION_STATE_PENDING"
  | "SUBSCRIPTION_STATE_ACTIVE"
  | "SUBSCRIPTION_STATE_PAUSED"
  | "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
  | "SUBSCRIPTION_STATE_ON_HOLD"
  | "SUBSCRIPTION_STATE_CANCELED"
  | "SUBSCRIPTION_STATE_EXPIRED"
  | "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED";

export interface ISubscriptionPurchaseLineItemV2 {
  productId?: string;
  expiryTime?: string; // RFC3339, e.g. "2025-03-03T17:11:49.283Z"
  // The most recent SUCCESSFUL (paid) order for this line item. Use this for amount/trial/promo — unlike the
  // top-level latestOrderId it never points at a pending/declined order during grace/on-hold/payment-failure.
  latestSuccessfulOrderId?: string;
  autoRenewingPlan?: {
    autoRenewEnabled?: boolean;
    recurringPrice?: { currencyCode?: string; units?: string; nanos?: number };
  };
  prepaidPlan?: { allowExtendAfterTime?: string };
  offerDetails?: {
    offerTags?: string[];
    basePlanId?: string;
    offerId?: string;
  };
  // Authoritative current billing phase (present on ~all live subs). Exactly one key is set:
  // freeTrial (in a free trial now), introductoryPrice (discounted now), or basePrice (full price).
  offerPhase?: { freeTrial?: unknown; introductoryPrice?: unknown; basePrice?: unknown };
  // Present only while a deferred plan switch is queued; productId = the SKU that will replace this one.
  deferredItemReplacement?: { productId?: string };
  deferredItemRemoval?: unknown;
}

export interface ISubscriptionPurchaseV2 {
  kind?: string;
  subscriptionState?: IGoogleSubscriptionStateV2;
  // Deprecated by Google; can be a pending/declined order. Prefer lineItems[].latestSuccessfulOrderId.
  latestOrderId?: string;
  linkedPurchaseToken?: string;
  startTime?: string;
  lineItems?: ISubscriptionPurchaseLineItemV2[];
  canceledStateContext?: unknown;
  acknowledgementState?: string;
  testPurchase?: unknown;
}

// androidpublisher v3 `purchases.productsv2.getproductpurchasev2` response (ProductPurchaseV2).
// Token-only path; replaces the deprecated v1 `purchases.products.get` for one-time/lifetime products.
// NB: unlike subscriptionState, the productsv2 purchaseState enum is NOT prefixed — the live API returns
// bare "PURCHASED" / "CANCELLED" / "PENDING" (only UNSPECIFIED carries the prefix). Confirmed via parity.
export type IGoogleOneTimePurchaseStateV2 = "PURCHASE_STATE_UNSPECIFIED" | "PURCHASED" | "CANCELLED" | "PENDING";

export type IGoogleAcknowledgementStateV2 =
  | "ACKNOWLEDGEMENT_STATE_UNSPECIFIED"
  | "ACKNOWLEDGEMENT_STATE_PENDING"
  | "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";

export interface IProductPurchaseV2 {
  kind?: string;
  purchaseStateContext?: { purchaseState?: IGoogleOneTimePurchaseStateV2 };
  acknowledgementState?: IGoogleAcknowledgementStateV2;
  orderId?: string;
  regionCode?: string;
  purchaseCompletionTime?: string;
  productLineItem?: Array<{ productId?: string; productOfferDetails?: { purchaseOptionId?: string } }>;
  testPurchaseContext?: unknown;
}

// Normalized payment-relevant fields read from a v2 purchase, shared by the verify endpoint, the RTDN
// webhook, and the reconciler. Amount/tax still come from the Orders API (v2 carries only the recurring
// price); `fallbackAmount` is the v2 recurring price used only when an Orders lookup is unavailable.
export interface IGooglePaymentInfoV2 {
  kind: "subscription" | "product";
  purchaseToken: string;
  orderId?: string;
  originalTransactionId: string;
  startTimeMs?: number;
  purchaseTimeMs?: number;
  offerId?: string;
  currency?: string;
  fallbackAmount?: number;
  isRenewal: boolean;
}

export interface IVerifyAppleReceiptResponse {
  environment?: string;
  receipt?: {
    receipt_type: string;
    receipt_creation_date: string;
    original_purchase_date: string;
    receipt_creation_date_ms: string;
    in_app: {
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
      purchase_date: string;
      purchase_date_ms: string;
      purchase_date_pst: string;
      original_purchase_date: string;
      original_purchase_date_ms: string;
      original_purchase_date_pst: string;
      expires_date: string;
      expires_date_ms: string;
      expires_date_pst: string;
      is_trial_period: "true" | "false";
      is_in_intro_offer_period: "true" | "false";
      in_app_ownership_type: string;
    }[];
  };
  latest_receipt_info?: {
    product_id: string;
    purchase_date: string;
    purchase_date_ms: string;
    original_purchase_date: string;
    original_purchase_date_ms: string;
    expires_date: string;
    expires_date_ms: string;
    is_trial_period: "true" | "false";
    is_in_intro_offer_period: "true" | "false";
    in_app_ownership_type: string;
    offer_code_ref_name: string;
    original_transaction_id?: string;
    transaction_id?: string;
  }[];
  pending_renewal_info?: {
    auto_renew_product_id: string;
    product_id: string;
    original_transaction_id: string;
    auto_renew_status: "0" | "1";
  }[];
  status: number;
}

export class Subscriptions {
  constructor(
    private readonly log: ILogUtil,
    private readonly secretsUtil: ISecretsUtil
  ) {}

  private async signAndroidPublisherJwt(): Promise<string> {
    const googleServiceAccountPubsub = await this.secretsUtil.getGoogleServiceAccountPubsub();
    return JWT.sign(
      {
        iss: googleServiceAccountPubsub.client_email,
        sub: googleServiceAccountPubsub.client_email,
        aud: "https://androidpublisher.googleapis.com/",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      googleServiceAccountPubsub.private_key,
      { algorithm: "RS256" }
    );
  }

  public async hasSubscription(di: IDI, userId: string, subscription: ISubscription): Promise<boolean> {
    if (subscription.key) {
      const fetchedKey = await new FreeUserDao(di).verifyKey(userId);
      if (fetchedKey === subscription.key) {
        return true;
      }
    }
    if (subscription.apple) {
      for (const receipt of subscription.apple) {
        if (await this.verifyAppleReceipt(receipt.value)) {
          return true;
        }
      }
    }
    let googleFailedClosed = false;
    if (subscription.google) {
      for (const receipt of subscription.google) {
        const { token, productId } = JSON.parse(receipt.value) as { token: string; productId: string };
        if (await this.verifyGooglePurchaseTokenV2(token, productId)) {
          return true;
        }
      }
      // verifyGooglePurchaseTokenV2 fails OPEN on transport errors, so reaching here means Google live-verified
      // every google receipt as NOT entitled (e.g. ON_HOLD/PAUSED/EXPIRED). That verdict is authoritative.
      googleFailedClosed = subscription.google.length > 0;
    }
    // Fallback: paid users can end up with an empty storage.subscription if the mobile app hasn't pushed the
    // receipt to the server yet. lftSubscriptionDetails is the authoritative record of a verified subscription.
    // Require isActive (v2 computes it correctly now) and never let a stale Google row override a live "no".
    const details = (await new SubscriptionDetailsDao(di).getAll([userId]))[0];
    if (details && details.expires > Date.now() && details.isActive) {
      if (details.type === "google" && googleFailedClosed) {
        this.log.log(`hasSubscription: live Google check failed closed, ignoring stale details row for ${userId}`);
        return false;
      }
      this.log.log(`hasSubscription: storage check failed, using lftSubscriptionDetails fallback for ${userId}`);
      return true;
    }
    return false;
  }

  public async verifyAppleReceipt(
    appleReceipt?: string,
    env: "dev" | "prod" = Utils_getEnv()
  ): Promise<string | undefined | null> {
    if (appleReceipt == null) {
      return undefined;
    }
    if (Subscriptions_isAppleJws(appleReceipt)) {
      const transactionInfo = this.verifyAppleJws(appleReceipt);
      if (transactionInfo == null) {
        return null;
      }
      return this.isAppleJwsActive(transactionInfo) ? appleReceipt : null;
    }
    const json = await this.getAppleVerificationJson(appleReceipt, env);
    if (json == null) {
      return appleReceipt;
    }
    return this.verifyAppleReceiptJson(appleReceipt, json);
  }

  public verifyAppleJws(jws: string): IAppleTransactionInfo | null {
    const verifier = new AppleJWTVerifier(this.log);
    const payload = verifier.verifyJWT(jws) as IAppleTransactionInfo | null;
    if (!payload) {
      this.log.log("JWS signature verification failed");
      return null;
    }
    if (APPLE_PRODUCT_IDS.indexOf(payload.productId) === -1) {
      this.log.log(`JWS productId ${payload.productId} is not a Liftosaur product`);
      return null;
    }
    return payload;
  }

  public isAppleJwsActive(transactionInfo: IAppleTransactionInfo): boolean {
    if (transactionInfo.productId.indexOf("lifetime") !== -1) {
      return true;
    }
    return (transactionInfo.expiresDate ?? 0) > Date.now();
  }

  public getAppleVerificationInfoFromJws(
    userId: string,
    transactionInfo: IAppleTransactionInfo
  ): ISubscriptionDetailsDao | undefined {
    try {
      const isLifetime = transactionInfo.productId.indexOf("lifetime") !== -1;
      const expires = isLifetime ? 4105144800000 : (transactionInfo.expiresDate ?? 0);
      return {
        userId,
        type: "apple",
        product: transactionInfo.productId,
        expires,
        isTrial: transactionInfo.offerDiscountType === "FREE_TRIAL",
        isPromo: !!transactionInfo.offerIdentifier,
        promoCode: transactionInfo.offerIdentifier,
        isActive: expires > Date.now(),
        originalTransactionId: transactionInfo.originalTransactionId,
      };
    } catch (error) {
      this.log.log("Getting Apple JWS info error: ", error);
      return undefined;
    }
  }

  public verifyAppleReceiptJson(appleReceipt: string, json: IVerifyAppleReceiptResponse): string | undefined | null {
    try {
      const products = [
        "com.liftosaur.subscription.ios_montly",
        "com.liftosaur.subscription.ios_yearly",
        "com.liftosaur.subscription.ios_lifetime",
      ];
      const inAppPurchases = json.receipt?.in_app?.filter((purchase) => products.indexOf(purchase.product_id) !== -1);
      const hasNonExpired =
        !!inAppPurchases?.some((p) => p.product_id.indexOf("lifetime") !== -1) ||
        !!inAppPurchases?.some((p) => parseInt(p.expires_date_ms, 10) > Date.now());
      this.log.log("Apple Receipt success status: ", json.status);
      this.log.log("Apple Receipt has non-expired subscription: ", hasNonExpired);
      console.log("-------- Receipt is verifying!", `${JSON.stringify(appleReceipt)}`.slice(0, 15));
      console.log("It's status is: ", json.status);
      console.log("It's not expired: ", hasNonExpired);
      const result = json.status === 0 && hasNonExpired ? appleReceipt : null;
      console.log("-------- And it's: ", result?.slice(0, 15));
      return result;
    } catch (error) {
      this.log.log("Apple Receipt verification error: ", error);
      return appleReceipt;
    }
  }

  public async getAppleVerificationJson(
    appleReceipt: string,
    env: "dev" | "prod" = Utils_getEnv()
  ): Promise<IVerifyAppleReceiptResponse | undefined> {
    const url =
      env === "prod" ? "https://buy.itunes.apple.com/verifyReceipt" : "https://sandbox.itunes.apple.com/verifyReceipt";
    try {
      const body = JSON.stringify({
        "receipt-data": appleReceipt,
        password: await this.secretsUtil.getAppleAppSharedSecret(),
      });
      const response = await fetch(url, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      });
      const json: IVerifyAppleReceiptResponse = await response.json();
      if (json.status === 21007 && env === "prod") {
        this.log.log("Got 21007, retrying in dev environment");
        return this.getAppleVerificationJson(appleReceipt, "dev");
      }
      return json;
    } catch (error) {
      this.log.log("Apple Receipt fetching error: ", error);
      return undefined;
    }
  }

  public async getAppleTransactionHistory(
    originalTransactionId: string
  ): Promise<IAppleTransactionHistory | undefined> {
    try {
      const url = `https://api.storekit.itunes.apple.com/inApps/v1/history/${originalTransactionId}`;

      const applePrivateKey = await this.secretsUtil.getApplePrivateKey();
      const appleKeyId = await this.secretsUtil.getAppleKeyId();
      const appleIssuerId = await this.secretsUtil.getAppleIssuerId();

      const now = Math.floor(Date.now() / 1000);
      const token = JWT.sign(
        {
          iss: appleIssuerId,
          aud: "appstoreconnect-v1",
          iat: now,
          exp: now + 1200,
          bid: "com.liftosaur.www",
        },
        applePrivateKey,
        {
          algorithm: "ES256",
          header: {
            kid: appleKeyId,
            typ: "JWT",
            alg: "ES256",
          },
        }
      );

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Liftosaur/1.0",
        },
      });

      if (!response.ok) {
        this.log.log(`Failed to get Apple transaction history for ${originalTransactionId}: ${response.status}`);
        return undefined;
      }

      const json = await response.json();
      return json;
    } catch (error) {
      this.log.log(`Error getting Apple transaction history for ${originalTransactionId}:`, error);
      return undefined;
    }
  }

  public getAppleVerificationInfo(
    userId: string,
    json: IVerifyAppleReceiptResponse
  ): ISubscriptionDetailsDao | undefined {
    try {
      const latestReceipt = CollectionUtils_sort(
        json.latest_receipt_info || [],
        (a, b) => Number(b.purchase_date_ms) - Number(a.purchase_date_ms)
      )[0];
      if (latestReceipt == null) {
        return undefined;
      }

      const expires =
        latestReceipt.product_id.indexOf("lifetime") !== -1
          ? 4105144800000
          : Number(latestReceipt.expires_date_ms || "0");

      return {
        userId,
        type: "apple",
        product: latestReceipt.product_id,
        expires,
        isTrial: latestReceipt.is_trial_period === "true",
        isPromo: latestReceipt.offer_code_ref_name != null,
        promoCode: latestReceipt.offer_code_ref_name,
        isActive: expires > Date.now(),
        originalTransactionId: latestReceipt.original_transaction_id,
      };
    } catch (error) {
      this.log.log("Getting Apple Receipt info error: ", error);
      return undefined;
    }
  }

  // Returns the parsed body for ANY HTTP response (a 4xx error body has no lineItems, so mappers treat it as
  // not-entitled). Returns undefined ONLY on a transport/parse failure, which entitlement callers treat as
  // fail-open (matching the old v1 getGooglePurchaseTokenJson semantics).
  public async getGoogleSubscriptionV2(token: string): Promise<ISubscriptionPurchaseV2 | undefined> {
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.liftosaur.www.twa/purchases/subscriptionsv2/tokens/${token}`;
    try {
      const jwttoken = await this.signAndroidPublisherJwt();
      const result = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${jwttoken}` } });
      const json = (await result.json()) as ISubscriptionPurchaseV2;
      if (!result.ok) {
        this.log.log(`subscriptionsv2.get non-ok: ${result.status} ${JSON.stringify(json)}`);
      }
      return json;
    } catch (error) {
      this.log.log("subscriptionsv2.get error: ", error);
      return undefined;
    }
  }

  // Fetches a subscription and resolves PENDING_PURCHASE_CANCELED to the REAL subscription: per Google docs,
  // when a pending purchase (e.g. a canceled upgrade/downgrade) was for an existing subscription, its current
  // state lives at linkedPurchaseToken — the pending token itself must NOT be read as "not entitled" and must
  // NOT overwrite the active row. Returns the resolved payload AND the token it belongs to (so callers key the
  // details row / originalTransactionId off the real subscription, not the pending one). undefined only on a
  // transport failure (fail-open for entitlement).
  public async getGoogleSubscriptionV2Resolved(
    token: string,
    depth = 0
  ): Promise<{ json: ISubscriptionPurchaseV2; token: string } | undefined> {
    const json = await this.getGoogleSubscriptionV2(token);
    if (!json) {
      return undefined;
    }
    if (json.subscriptionState === "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED" && json.linkedPurchaseToken) {
      if (depth >= 3) {
        this.log.log("getGoogleSubscriptionV2Resolved: pending-canceled chain too deep, treating as unresolved");
        return undefined;
      }
      // The real state lives at linkedPurchaseToken. Return its result DIRECTLY: a transport failure on the
      // linked fetch must propagate as undefined (entitlement fails open, upsert skips) — never fall back to
      // the misleading pending-canceled payload, which would fail closed / overwrite the active row.
      return this.getGoogleSubscriptionV2Resolved(json.linkedPurchaseToken, depth + 1);
    }
    return { json, token };
  }

  // SKU → the vocabulary stored in lftSubscriptionDetails. Keeps the historical "montly" misspelling so
  // downstream readers and existing DB rows stay compatible.
  public googleSkuToProduct(sku?: string): "montly" | "yearly" | "lifetime" | undefined {
    if (!sku) {
      return undefined;
    }
    if (sku.indexOf("lifetime") !== -1) {
      return "lifetime";
    }
    if (sku.indexOf("yearly") !== -1) {
      return "yearly";
    }
    if (sku.indexOf("montly") !== -1 || sku.indexOf("monthly") !== -1) {
      return "montly";
    }
    return undefined;
  }

  // Trial/promo from a subscriptionsv2 line item's offer. Prefers Play Console offer tags (stable), and falls
  // back to the offerId naming convention. A base-plan offer (empty/`base` offerId, no tags) is neither.
  public deriveGoogleOfferTrialPromo(offerDetails?: { offerId?: string; offerTags?: string[] }): {
    isTrial: boolean;
    isPromo: boolean;
    promoCode?: string;
  } {
    const offerId = offerDetails?.offerId || "";
    const offerTags = offerDetails?.offerTags || [];
    const hasTag = (tags: string[]): boolean => offerTags.some((t) => tags.indexOf(t) !== -1);
    const isTrial = hasTag(GOOGLE_TRIAL_OFFER_TAGS) || offerId.indexOf("trial") !== -1;
    const isPromo = !isTrial && (hasTag(GOOGLE_PROMO_OFFER_TAGS) || (offerId !== "" && offerId.indexOf("base") === -1));
    return { isTrial, isPromo, promoCode: isPromo ? offerId : undefined };
  }

  // currentOrderAmount (the actual charge for the active period, from the Orders API) makes isTrial/isPromo
  // reflect the CURRENT phase instead of the sticky offer enrollment. When omitted, falls back to offer tags.
  public getGoogleVerificationInfoV2(
    userId: string,
    json: ISubscriptionPurchaseV2,
    token: string,
    currentOrderAmount?: number
  ): ISubscriptionDetailsDao | undefined {
    try {
      const lineItems = json.lineItems || [];
      if (lineItems.length === 0) {
        return undefined;
      }
      // During a transition a sub can carry >1 line item; the one with the latest expiry is the active period.
      const sorted = CollectionUtils_sort(
        lineItems,
        (a, b) => this.parseRfc3339(b.expiryTime) - this.parseRfc3339(a.expiryTime)
      );
      const active = sorted[0];
      const product = this.googleSkuToProduct(active.productId) || "montly";
      const expires = this.parseRfc3339(active.expiryTime);
      const isActive = this.isGoogleSubscriptionV2Active(json);
      const pendingSku =
        active.deferredItemReplacement?.productId ||
        lineItems.map((li) => li.deferredItemReplacement?.productId).find((p) => !!p);
      const pendingProduct = this.googleSkuToProduct(pendingSku);
      const recurring = this.recurringPriceToNumber(active.autoRenewingPlan?.recurringPrice);
      const { isTrial, isPromo, promoCode } = this.deriveGoogleTrialPromo(
        active.offerDetails,
        active.offerPhase,
        currentOrderAmount,
        recurring
      );
      return {
        userId,
        type: "google",
        product,
        expires,
        isTrial,
        isPromo,
        promoCode,
        isActive,
        originalTransactionId: json.linkedPurchaseToken || token,
        pendingProduct,
      };
    } catch (error) {
      this.log.log("Getting Google v2 info error: ", error);
      return undefined;
    }
  }

  // Trial/promo for the CURRENT period. `offerPhase` is Google's authoritative current-phase signal (present
  // on ~all live subs) and is preferred when available: freeTrial => trial, introductoryPrice => promo,
  // basePrice => neither. This correctly handles a trial that is the first phase of a discount offer (where
  // the offer tag would say "promo"). Falls back to the actual charge (currentOrderAmount < recurring), and
  // finally to the sticky offer tags, when offerPhase is absent.
  public deriveGoogleTrialPromo(
    offerDetails: { offerId?: string; offerTags?: string[] } | undefined,
    offerPhase?: { freeTrial?: unknown; introductoryPrice?: unknown; basePrice?: unknown },
    currentOrderAmount?: number,
    recurringAmount?: number
  ): { isTrial: boolean; isPromo: boolean; promoCode?: string } {
    if (
      offerPhase &&
      (offerPhase.freeTrial != null || offerPhase.introductoryPrice != null || offerPhase.basePrice != null)
    ) {
      const isTrial = offerPhase.freeTrial != null;
      const isPromo = !isTrial && offerPhase.introductoryPrice != null;
      return { isTrial, isPromo, promoCode: isPromo ? offerDetails?.offerId : undefined };
    }
    const offer = this.deriveGoogleOfferTrialPromo(offerDetails);
    if (currentOrderAmount == null) {
      return offer;
    }
    const freeNow = currentOrderAmount === 0;
    const discountedNow = recurringAmount != null && currentOrderAmount > 0 && currentOrderAmount < recurringAmount;
    const isTrial = freeNow && offer.isTrial;
    const isPromo = !isTrial && (freeNow || discountedNow);
    return { isTrial, isPromo, promoCode: isPromo ? offer.promoCode : undefined };
  }

  private recurringPriceToNumber(price?: { units?: string; nanos?: number }): number | undefined {
    if (!price) {
      return undefined;
    }
    return Number(price.units || "0") + (price.nanos ?? 0) / 1000000000;
  }

  public async getGoogleCurrentOrderAmount(orderId?: string): Promise<number | undefined> {
    if (!orderId) {
      return undefined;
    }
    const orderInfo = await this.getGoogleOrderInfo(orderId);
    if (!orderInfo?.total) {
      return undefined;
    }
    return this.recurringPriceToNumber(orderInfo.total);
  }

  private parseRfc3339(value?: string): number {
    if (!value) {
      return 0;
    }
    const ms = new Date(value).getTime();
    return isNaN(ms) ? 0 : ms;
  }

  // ACTIVE / IN_GRACE_PERIOD are entitled; CANCELED is still entitled until the paid period ends (expires > now).
  // ON_HOLD / PAUSED / EXPIRED / PENDING(_PURCHASE_CANCELED) are not. The expiry guard covers CANCELED.
  public isGoogleSubscriptionV2Active(json: ISubscriptionPurchaseV2): boolean {
    const lineItems = json.lineItems || [];
    if (lineItems.length === 0) {
      return false;
    }
    const expires = Math.max(...lineItems.map((li) => this.parseRfc3339(li.expiryTime)));
    const entitledStates: IGoogleSubscriptionStateV2[] = [
      "SUBSCRIPTION_STATE_ACTIVE",
      "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
      "SUBSCRIPTION_STATE_CANCELED",
    ];
    return (
      entitledStates.indexOf(json.subscriptionState ?? "SUBSCRIPTION_STATE_UNSPECIFIED") !== -1 && expires > Date.now()
    );
  }

  public isGoogleProductV2Active(json: IProductPurchaseV2): boolean {
    return (
      json.purchaseStateContext?.purchaseState === "PURCHASED" &&
      json.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED"
    );
  }

  // Same response contract as getGoogleSubscriptionV2: parsed body on any HTTP response, undefined only on
  // transport/parse failure (fail-open for entitlement).
  public async getGoogleProductV2(token: string): Promise<IProductPurchaseV2 | undefined> {
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.liftosaur.www.twa/purchases/productsv2/tokens/${token}`;
    try {
      const jwttoken = await this.signAndroidPublisherJwt();
      const result = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${jwttoken}` } });
      const json = (await result.json()) as IProductPurchaseV2;
      if (!result.ok) {
        this.log.log(`productsv2.getproductpurchasev2 non-ok: ${result.status} ${JSON.stringify(json)}`);
      }
      return json;
    } catch (error) {
      this.log.log("productsv2.getproductpurchasev2 error: ", error);
      return undefined;
    }
  }

  public getGoogleProductVerificationInfoV2(
    userId: string,
    json: IProductPurchaseV2,
    token: string
  ): ISubscriptionDetailsDao | undefined {
    try {
      // An error/410 body has no purchaseStateContext — never mint a far-future-expires lifetime row from it.
      if (!json.purchaseStateContext) {
        return undefined;
      }
      const isActive = this.isGoogleProductV2Active(json);
      return {
        userId,
        type: "google",
        product: "lifetime",
        expires: 4105144800000,
        isTrial: false,
        isPromo: false,
        promoCode: "",
        isActive,
        originalTransactionId: token,
      };
    } catch (error) {
      this.log.log("Getting Google product v2 info error: ", error);
      return undefined;
    }
  }

  // The latest SUCCESSFUL order for the active line item — the only order safe to base amount/trial/promo on.
  // (The top-level latestOrderId is deprecated and may be a pending/declined order during grace/on-hold.)
  public getGoogleSubscriptionSuccessfulOrderId(json: ISubscriptionPurchaseV2): string | undefined {
    const lineItems = json.lineItems || [];
    if (lineItems.length === 0) {
      return undefined;
    }
    const active = CollectionUtils_sort(
      lineItems,
      (a, b) => this.parseRfc3339(b.expiryTime) - this.parseRfc3339(a.expiryTime)
    )[0];
    return active.latestSuccessfulOrderId;
  }

  public buildGoogleSubscriptionPaymentInfoV2(json: ISubscriptionPurchaseV2, token: string): IGooglePaymentInfoV2 {
    const lineItems = json.lineItems || [];
    const active = CollectionUtils_sort(
      lineItems,
      (a, b) => this.parseRfc3339(b.expiryTime) - this.parseRfc3339(a.expiryTime)
    )[0];
    const startTimeMs = this.parseRfc3339(json.startTime) || undefined;
    const price = active?.autoRenewingPlan?.recurringPrice;
    return {
      kind: "subscription",
      purchaseToken: token,
      orderId: active?.latestSuccessfulOrderId,
      originalTransactionId: json.linkedPurchaseToken || token,
      startTimeMs,
      purchaseTimeMs: startTimeMs,
      offerId: active?.offerDetails?.offerId,
      currency: price?.currencyCode,
      fallbackAmount: price ? Number(price.units || "0") + (price.nanos ?? 0) / 1000000000 : undefined,
      isRenewal: !!json.linkedPurchaseToken,
    };
  }

  public buildGoogleProductPaymentInfoV2(json: IProductPurchaseV2, token: string): IGooglePaymentInfoV2 {
    const purchaseTimeMs = this.parseRfc3339(json.purchaseCompletionTime) || undefined;
    return {
      kind: "product",
      purchaseToken: token,
      orderId: json.orderId,
      originalTransactionId: token,
      startTimeMs: purchaseTimeMs,
      purchaseTimeMs,
      isRenewal: false,
    };
  }

  public async getGooglePaymentInfoV2(token: string, productId: string): Promise<IGooglePaymentInfoV2 | undefined> {
    if (productId.indexOf("lifetime") !== -1) {
      const json = await this.getGoogleProductV2(token);
      // No purchaseStateContext => error body / unusable response; bail like the old v1 "error in json" guard.
      if (!json || !json.purchaseStateContext) {
        return undefined;
      }
      return this.buildGoogleProductPaymentInfoV2(json, token);
    } else {
      const json = await this.getGoogleSubscriptionV2(token);
      if (!json || (json.lineItems || []).length === 0) {
        return undefined;
      }
      return this.buildGoogleSubscriptionPaymentInfoV2(json, token);
    }
  }

  // Server-side acknowledgement backstop: Google auto-refunds purchases left unacknowledged for 3 days, and
  // clients can fail to acknowledge. The acknowledge POST itself is the non-deprecated v3 method.
  public async maybeAcknowledgeGoogleSubscriptionV2(
    json: ISubscriptionPurchaseV2,
    token: string,
    productId: string
  ): Promise<void> {
    if (json.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_PENDING") {
      return;
    }
    const paidStates: IGoogleSubscriptionStateV2[] = [
      "SUBSCRIPTION_STATE_ACTIVE",
      "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    ];
    // Reflect a successful ack on the in-memory json so a subsequent isGoogle*Active read sees it acknowledged.
    if (paidStates.indexOf(json.subscriptionState ?? "SUBSCRIPTION_STATE_UNSPECIFIED") !== -1) {
      if (await this.acknowledgeGooglePurchase(token, productId)) {
        json.acknowledgementState = "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";
      }
    }
  }

  public async maybeAcknowledgeGoogleProductV2(
    json: IProductPurchaseV2,
    token: string,
    productId: string
  ): Promise<void> {
    if (json.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_PENDING") {
      return;
    }
    if (json.purchaseStateContext?.purchaseState === "PURCHASED") {
      if (await this.acknowledgeGooglePurchase(token, productId)) {
        json.acknowledgementState = "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";
      }
    }
  }

  // Entitlement check for hasSubscription. Fails open (true) on a transport failure to match the prior v1
  // behavior; a valid response that maps to "not entitled" fails closed (false).
  public async verifyGooglePurchaseTokenV2(token: string, productId: string): Promise<boolean> {
    if (token == null) {
      return false;
    }
    if (productId.indexOf("lifetime") !== -1) {
      const json = await this.getGoogleProductV2(token);
      return json == null ? true : this.isGoogleProductV2Active(json);
    } else {
      const resolved = await this.getGoogleSubscriptionV2Resolved(token);
      return resolved == null ? true : this.isGoogleSubscriptionV2Active(resolved.json);
    }
  }

  public async getAppleVerificationInfoFromUser(user: ILimitedUserDao): Promise<ISubscriptionDetailsDao | undefined> {
    const receipts = Object.keys(user.storage?.subscription?.apple || {});
    const jsons = CollectionUtils_compact(await Promise.all(receipts.map((v) => this.getAppleVerificationJson(v))));
    const json = CollectionUtils_sort(
      jsons,
      (a, b) => Number(b.receipt?.receipt_creation_date_ms) - Number(a.receipt?.receipt_creation_date_ms)
    )[0];
    if (json == null) {
      return undefined;
    }
    return this.getAppleVerificationInfo(user.id, json);
  }

  public async getGoogleOrderInfo(orderId: string): Promise<IGoogleOrderInfo | undefined> {
    try {
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.liftosaur.www.twa/orders/${orderId}`;
      const jwttoken = await this.signAndroidPublisherJwt();

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${jwttoken}`,
        },
      });

      if (!response.ok) {
        this.log.log(`Failed to get order info for ${orderId}: ${response.status}`);
        return undefined;
      }

      const json: IGoogleOrderInfo = await response.json();
      return json;
    } catch (error) {
      this.log.log(`Error getting order info for ${orderId}:`, error);
      return undefined;
    }
  }

  public async acknowledgeGooglePurchase(token: string, productId: string): Promise<boolean> {
    const purchaseType = productId.indexOf("lifetime") !== -1 ? "products" : "subscriptions";
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.liftosaur.www.twa/purchases/${purchaseType}/${productId}/tokens/${token}:acknowledge`;
    const jwttoken = await this.signAndroidPublisherJwt();
    try {
      const result = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwttoken}`, "Content-Type": "application/json" },
        body: "{}",
      });
      if (!result.ok) {
        this.log.log(`Failed to acknowledge Google purchase ${productId}: ${result.status} ${await result.text()}`);
      }
      return result.ok;
    } catch (error) {
      this.log.log("Acknowledging Google purchase error: ", error);
      return false;
    }
  }
}
