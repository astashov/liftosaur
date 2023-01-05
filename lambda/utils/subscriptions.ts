import fetch from "node-fetch";
import { Utils } from "../utils";
import { LogUtil } from "./log";
import JWT from "jsonwebtoken";
import { SecretsUtil } from "./secrets";

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
  acknowledgementState: number;
  kind: string;
}

interface IVerifyAppleReceiptResponse {
  environment?: string;
  receipt?: {
    receipt_type: string;
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
  pending_renewal_info?: {
    auto_renew_product_id: string;
    product_id: string;
    original_transaction_id: string;
    auto_renew_status: "0" | "1";
  }[];
  status: number;
}

export class Subscriptions {
  constructor(private readonly log: LogUtil, private readonly secretsUtil: SecretsUtil) {}

  public async verifyAppleReceipt(appleReceipt?: string): Promise<string | undefined | null> {
    if (appleReceipt == null) {
      return undefined;
    }
    const env = Utils.getEnv();
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
      const products = ["com.liftosaur.subscription.ios_montly", "com.liftosaur.subscription.ios_yearly"];
      const inAppPurchases = json.receipt?.in_app?.filter((purchase) => products.indexOf(purchase.product_id) !== -1);
      const hasNonExpired = !!inAppPurchases?.some((p) => parseInt(p.expires_date_ms, 10) > Date.now());
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

  public async verifyGooglePurchaseToken(googlePurchaseToken?: string): Promise<string | undefined | null> {
    if (googlePurchaseToken == null) {
      console.log("-------- Receipt is undefined!");
      return undefined;
    }
    const { token, productId } = JSON.parse(googlePurchaseToken) as { token: string; productId: string };
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.liftosaur.www.twa/purchases/subscriptions/${productId}/tokens/${token}`;
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
      if (!("error" in json)) {
        const response = json as IVerifyGoogleSubscriptionTokenSuccess;
        if (Date.now() < parseInt(response.expiryTimeMillis, 10)) {
          console.log("Google subscription is valid");
          return googlePurchaseToken;
        }
      }
      return null;
    } catch (error) {
      return googlePurchaseToken;
    }
  }
}
