import fetch from "node-fetch";
import { Utils } from "../utils";
import { ILogUtil } from "./log";
import JWT from "jsonwebtoken";
import { ISecretsUtil } from "./secrets";
import { ILimitedUserDao } from "../dao/userDao";
import { CollectionUtils } from "../../src/utils/collection";
import { ISubscriptionDetailsDao } from "../dao/subscriptionDetailsDao";
import { ISubscription } from "../../src/types";
import { FreeUserDao } from "../dao/freeUserDao";
import { IDI } from "./di";

interface IVerifyGoogleProductTokenSuccess {
  purchaseTimeMillis: number;
  purchaseState: number;
  consumptionState: number;
  developerPayload: string;
  orderId: string;
  purchaseType: number;
  acknowledgementState: number;
  kind: "androidpublisher#productPurchase";
  regionCode: string;
}

interface IVerifyGoogleSubscriptionTokenSuccess {
  startTimeMillis: string;
  expiryTimeMillis: string;
  autoRenewing: boolean;
  priceCurrencyCode: string;
  priceAmountMicros: string;
  countryCode: string;
  developerPayload: string;
  cancelReason: number;
  orderId: string;
  purchaseType: number;
  paymentState?: number;
  promotionType?: number;
  promotionCode?: string;
  acknowledgementState: number;
  linkedPurchaseToken?: string;
  kind: "androidpublisher#subscriptionPurchase";
}

interface IVerifyGoogleSubscriptionTokenError {
  error: {
    code: number;
    message: string;
    errors: unknown[];
  };
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
    if (subscription.google) {
      for (const receipt of subscription.google) {
        const { token, productId } = JSON.parse(receipt.value) as { token: string; productId: string };
        if (await this.verifyGooglePurchaseToken(token, productId)) {
          return true;
        }
      }
    }
    return false;
  }

  public async verifyAppleReceipt(
    appleReceipt?: string,
    env: "dev" | "prod" = Utils.getEnv()
  ): Promise<string | undefined | null> {
    if (appleReceipt == null) {
      return undefined;
    }
    const json = await this.getAppleVerificationJson(appleReceipt, env);
    if (json == null) {
      return appleReceipt;
    }
    return this.verifyAppleReceiptJson(appleReceipt, json);
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
    env: "dev" | "prod" = Utils.getEnv()
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

  public async getAppleTransactionHistory(originalTransactionId: string): Promise<any> {
    try {
      const url = `https://api.storekit.itunes.apple.com/inApps/v1/history/${originalTransactionId}`;

      const applePrivateKey = await this.secretsUtil.getApplePrivateKey();
      const appleKeyId = await this.secretsUtil.getAppleKeyId();
      const appleIssuerId = await this.secretsUtil.getAppleIssuerId();

      const token = JWT.sign(
        {
          iss: appleIssuerId,
          aud: "appstoreconnect-v1",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        applePrivateKey,
        {
          algorithm: "ES256",
          header: {
            kid: appleKeyId,
            typ: "JWT",
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
      const latestReceipt = CollectionUtils.sort(
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

  public async getGoogleVerificationInfo(
    userId: string,
    json: IVerifyGoogleSubscriptionTokenSuccess | IVerifyGoogleProductTokenSuccess,
    purchaseToken: string
  ): Promise<ISubscriptionDetailsDao | undefined> {
    const { token } = JSON.parse(purchaseToken) as { token: string; productId: string };
    try {
      if (json.kind === "androidpublisher#productPurchase") {
        return {
          userId,
          type: "google",
          product: "lifetime",
          expires: 4105144800000,
          isTrial: false,
          isPromo: false,
          promoCode: "",
          isActive: json.purchaseState === 0 && json.acknowledgementState === 1,
          originalTransactionId: token,
        };
      } else {
        return {
          userId,
          type: "google",
          product: Number(json.priceAmountMicros || "0") > 100000000 ? "yearly" : "montly",
          expires: Number(json.expiryTimeMillis || "0"),
          isTrial: json.paymentState === 2,
          isPromo: json.promotionType === 0 || json.promotionType === 1,
          promoCode: json.promotionCode,
          isActive: json.cancelReason !== null || Number(json.expiryTimeMillis || "0") < Date.now(),
          originalTransactionId: json.linkedPurchaseToken || token,
        };
      }
    } catch (error) {
      this.log.log("Getting Google Token info error: ", error);
      return undefined;
    }
  }

  public async getAppleVerificationInfoFromUser(user: ILimitedUserDao): Promise<ISubscriptionDetailsDao | undefined> {
    const receipts = Object.keys(user.storage?.subscription?.apple || {});
    const jsons = CollectionUtils.compact(await Promise.all(receipts.map((v) => this.getAppleVerificationJson(v))));
    const json = CollectionUtils.sort(
      jsons,
      (a, b) => Number(b.receipt?.receipt_creation_date_ms) - Number(a.receipt?.receipt_creation_date_ms)
    )[0];
    if (json == null) {
      return undefined;
    }
    return this.getAppleVerificationInfo(user.id, json);
  }

  public async getGoogleOrderInfo(orderId: string): Promise<any> {
    try {
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.liftosaur.www.twa/orders/${orderId}`;
      const googleServiceAccountPubsub = await this.secretsUtil.getGoogleServiceAccountPubsub();

      const jwttoken = JWT.sign(
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

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${jwttoken}`,
        },
      });

      if (!response.ok) {
        this.log.log(`Failed to get order info for ${orderId}: ${response.status}`);
        return undefined;
      }

      const json = await response.json();
      return json;
    } catch (error) {
      this.log.log(`Error getting order info for ${orderId}:`, error);
      return undefined;
    }
  }

  public async getGooglePurchaseTokenJson(
    token: string,
    productId: string
  ): Promise<
    | IVerifyGoogleSubscriptionTokenSuccess
    | IVerifyGoogleProductTokenSuccess
    | IVerifyGoogleSubscriptionTokenError
    | undefined
  > {
    console.log("Verifying Google token", token, productId);
    const url =
      productId.indexOf("lifetime") !== -1
        ? `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.liftosaur.www.twa/purchases/products/${productId}/tokens/${token}`
        : `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.liftosaur.www.twa/purchases/subscriptions/${productId}/tokens/${token}`;
    const googleServiceAccountPubsub = await this.secretsUtil.getGoogleServiceAccountPubsub();

    const jwttoken = JWT.sign(
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
    try {
      const result = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${jwttoken}` },
      });
      const json = await result.json();
      return json;
    } catch (error) {
      return undefined;
    }
  }

  public async verifyGooglePurchaseTokenJson(
    response:
      | IVerifyGoogleSubscriptionTokenSuccess
      | IVerifyGoogleProductTokenSuccess
      | IVerifyGoogleSubscriptionTokenError
  ): Promise<boolean> {
    if ("error" in response) {
      return false;
    }
    if (response.kind === "androidpublisher#productPurchase") {
      if (response.purchaseState === 0 && response.acknowledgementState === 1) {
        return true;
      } else {
        return false;
      }
    } else if (Date.now() < parseInt(response.expiryTimeMillis, 10)) {
      console.log("Google subscription is valid");
      return true;
    } else {
      return false;
    }
  }

  public async verifyGooglePurchaseToken(token: string, productId: string): Promise<boolean> {
    if (token == null) {
      console.log("-------- Receipt is undefined!");
      return false;
    }
    const json = await this.getGooglePurchaseTokenJson(token, productId);
    if (json) {
      return this.verifyGooglePurchaseTokenJson(json);
    } else {
      return true;
    }
  }
}
