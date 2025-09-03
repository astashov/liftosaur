import { IDI } from "../utils/di";
import { UserDao } from "../dao/userDao";
import { PaymentDao } from "../dao/paymentDao";
import { AppleJWTVerifier } from "./appleJwtVerifier";

export interface IAppleNotificationV2 {
  signedPayload: string;
}

export interface IAppleTransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  storefront: string;
  price?: number;
  currency?: string;
}

interface IApplePayloadData {
  notificationType: string;
  data?: {
    signedTransactionInfo?: string;
  };
}

export class AppleWebhookHandler {
  constructor(private readonly di: IDI) {}

  public async handleWebhook(body: string | null): Promise<{ status: string; error?: string }> {
    if (!body) {
      return { status: "error", error: "No body provided" };
    }

    try {
      const decodedBody = Buffer.from(body, "base64").toString("utf-8");
      const notification = JSON.parse(decodedBody) as IAppleNotificationV2;
      this.di.log.log("Parsed body", notification);

      const jwtVerifier = new AppleJWTVerifier(this.di.log);
      const payloadData = jwtVerifier.verifyJWT(notification.signedPayload) as IApplePayloadData | null;

      if (!payloadData) {
        this.di.log.log("Apple webhook: JWT signature verification failed");
        return { status: "ok" };
      }

      this.di.log.log("Verified and decoded payload", payloadData);

      if (!payloadData?.data?.signedTransactionInfo) {
        this.di.log.log("Apple webhook: No signedTransactionInfo in payload");
        return { status: "ok" };
      }

      const transactionInfo = jwtVerifier.verifyJWT(
        payloadData.data.signedTransactionInfo
      ) as IAppleTransactionInfo | null;

      if (!transactionInfo) {
        this.di.log.log("Apple webhook: Failed to verify transaction info JWT");
        return { status: "ok" };
      }

      this.di.log.log("Verified and decoded transaction info", transactionInfo);

      const userDao = new UserDao(this.di);
      const userId = await userDao.getUserIdByOriginalTransactionId(transactionInfo.originalTransactionId);

      if (!userId) {
        this.di.log.log(`Apple webhook: No user found for transaction ${transactionInfo.originalTransactionId}`);
        return { status: "ok" };
      }

      let paymentType: "purchase" | "renewal" | "refund";
      const notificationType = payloadData.notificationType;

      switch (notificationType) {
        case "SUBSCRIBED":
        case "ONE_TIME_CHARGE":
          paymentType = "purchase";
          break;
        case "DID_RENEW":
          paymentType = "renewal";
          break;
        case "REFUND":
          paymentType = "refund";
          break;
        case "DID_CHANGE_RENEWAL_STATUS":
        case "DID_CHANGE_RENEWAL_PREF":
        case "DID_FAIL_TO_RENEW":
        case "EXPIRED":
        case "GRACE_PERIOD_EXPIRED":
        case "OFFER_REDEEMED":
        case "PRICE_INCREASE":
        case "REFUND_DECLINED":
        case "RENEWAL_EXTENDED":
        case "REVOKE":
        case "TEST":
          this.di.log.log(`Apple webhook: Received non-payment notification: ${notificationType}`);
          return { status: "ok" };
        default:
          this.di.log.log(`Apple webhook: Unknown notification type: ${notificationType}`);
          return { status: "ok" };
      }

      await new PaymentDao(this.di).addIfNotExists({
        userId,
        timestamp: transactionInfo.purchaseDate || Date.now(),
        originalTransactionId: transactionInfo.originalTransactionId,
        transactionId: transactionInfo.transactionId,
        productId: transactionInfo.productId,
        amount: transactionInfo.price ? transactionInfo.price / 1000 : 0,
        currency: transactionInfo.currency || "USD",
        type: "apple",
        source: "webhook",
        paymentType,
      });

      this.di.log.log(
        `Apple webhook: Recorded ${paymentType} for user ${userId}, amount: ${transactionInfo.price} ${transactionInfo.currency}`
      );

      return { status: "ok" };
    } catch (error) {
      this.di.log.log("Apple webhook error:", error);
      return { status: "error" };
    }
  }
}
