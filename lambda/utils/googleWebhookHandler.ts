import { IDI } from "./di";
import { PaymentDao } from "../dao/paymentDao";
import { UserDao } from "../dao/userDao";
import { Subscriptions } from "./subscriptions";

export interface IGooglePubSubMessage {
  message: {
    data: string; // base64 encoded
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

export interface IGoogleDeveloperNotification {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: IGoogleSubscriptionNotification;
  oneTimeProductNotification?: IGoogleOneTimeProductNotification;
  voidedPurchaseNotification?: IGoogleVoidedPurchaseNotification;
  testNotification?: IGoogleTestNotification;
}

export interface IGoogleSubscriptionNotification {
  version: string;
  notificationType: number;
  purchaseToken: string;
  subscriptionId: string;
}

export interface IGoogleOneTimeProductNotification {
  version: string;
  notificationType: number;
  purchaseToken: string;
  sku: string;
}

export interface IGoogleVoidedPurchaseNotification {
  purchaseToken: string;
  orderId: string;
  productType: number;
  refundType: number;
}

export interface IGoogleTestNotification {
  version: string;
}

export class GoogleWebhookHandler {
  constructor(private readonly di: IDI) {}

  public async handleWebhook(body: string): Promise<{ success: boolean; message: string }> {
    this.di.log.log("Google webhook received body", body);

    if (!body) {
      return { success: false, message: "No body provided" };
    }

    try {
      const pubsubMessage = JSON.parse(body) as IGooglePubSubMessage;
      this.di.log.log("Parsed PubSub message", pubsubMessage);

      if (!pubsubMessage.message?.data) {
        this.di.log.log("Google webhook: No data in PubSub message");
        return { success: true, message: "No data in message" };
      }

      // Decode base64 data
      const decodedData = Buffer.from(pubsubMessage.message.data, "base64").toString("utf-8");
      const notification = JSON.parse(decodedData) as IGoogleDeveloperNotification;
      this.di.log.log("Decoded Google notification", notification);

      // Handle different notification types
      if (notification.subscriptionNotification) {
        await this.handleSubscriptionNotification(notification.subscriptionNotification, notification.packageName);
      } else if (notification.oneTimeProductNotification) {
        await this.handleOneTimeProductNotification(notification.oneTimeProductNotification, notification.packageName);
      } else if (notification.voidedPurchaseNotification) {
        await this.handleVoidedPurchaseNotification(notification.voidedPurchaseNotification);
      } else if (notification.testNotification) {
        this.di.log.log("Google webhook: Test notification received");
        return { success: true, message: "Test notification processed" };
      } else {
        this.di.log.log("Google webhook: Unknown notification type");
        return { success: true, message: "Unknown notification type" };
      }

      return { success: true, message: "Notification processed" };
    } catch (error) {
      this.di.log.log("Google webhook error:", error);
      return { success: false, message: `Processing error: ${error}` };
    }
  }

  private async handleSubscriptionNotification(notification: IGoogleSubscriptionNotification, packageName: string) {
    const { purchaseToken, subscriptionId, notificationType } = notification;

    // Google subscription notification types:
    // 1 = SUBSCRIPTION_RECOVERED, 2 = SUBSCRIPTION_RENEWED, 3 = SUBSCRIPTION_CANCELED
    // 4 = SUBSCRIPTION_PURCHASED, 5 = SUBSCRIPTION_ON_HOLD, 6 = SUBSCRIPTION_IN_GRACE_PERIOD
    // 7 = SUBSCRIPTION_RESTARTED, 8 = SUBSCRIPTION_PRICE_CHANGE_CONFIRMED, 9 = SUBSCRIPTION_DEFERRED
    // 10 = SUBSCRIPTION_PAUSED, 11 = SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED, 12 = SUBSCRIPTION_REVOKED
    // 13 = SUBSCRIPTION_EXPIRED

    let paymentType: "purchase" | "renewal" | "refund";

    switch (notificationType) {
      case 4: // SUBSCRIPTION_PURCHASED
        paymentType = "purchase";
        break;
      case 2: // SUBSCRIPTION_RENEWED
      case 1: // SUBSCRIPTION_RECOVERED
        paymentType = "renewal";
        break;
      case 12: // SUBSCRIPTION_REVOKED (usually refunds)
        paymentType = "refund";
        break;
      case 3: // SUBSCRIPTION_CANCELED
      case 5: // SUBSCRIPTION_ON_HOLD
      case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
      case 7: // SUBSCRIPTION_RESTARTED
      case 8: // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
      case 9: // SUBSCRIPTION_DEFERRED
      case 10: // SUBSCRIPTION_PAUSED
      case 11: // SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
      case 13: // SUBSCRIPTION_EXPIRED
        // These don't represent actual payment events, just log and return
        this.di.log.log(`Google webhook: Received non-payment subscription notification: ${notificationType}`);
        return;
      default:
        this.di.log.log(`Google webhook: Unknown subscription notification type: ${notificationType}`);
        return;
    }

    try {
      // Look up user by purchase token (stored as originalTransactionId)
      const userDao = new UserDao(this.di);
      const userId = await userDao.getUserIdByOriginalTransactionId(purchaseToken);

      if (!userId) {
        this.di.log.log(`Google webhook: No user found for purchase token ${purchaseToken}`);
        return;
      }

      // Call Google Play API to get full purchase details
      const subscriptions = new Subscriptions(this.di.log, this.di.secrets);
      const purchaseDetails = await subscriptions.getGooglePurchaseTokenJson(purchaseToken);

      if (!purchaseDetails || "error" in purchaseDetails) {
        this.di.log.log(`Google webhook: Failed to get purchase details for token ${purchaseToken}`);
        return;
      }

      // Extract price and currency information
      let amount = 0;
      let currency = "USD";
      let productId = subscriptionId;

      if (purchaseDetails.kind === "androidpublisher#subscriptionPurchase") {
        amount = Math.round(Number(purchaseDetails.priceAmountMicros || "0") / 1000000);
        currency = purchaseDetails.priceCurrencyCode || "USD";
      }

      // Record the payment event
      await new PaymentDao(this.di).add({
        userId,
        timestamp: Date.now(),
        originalTransactionId: purchaseToken,
        productId,
        amount,
        currency,
        type: "google",
        paymentType,
      });

      this.di.log.log(
        `Google webhook: Recorded ${paymentType} for user ${userId}, subscription ${subscriptionId}, amount: ${amount} ${currency}`
      );
    } catch (error) {
      this.di.log.log("Error handling Google subscription notification:", error);
    }
  }

  private async handleOneTimeProductNotification(notification: IGoogleOneTimeProductNotification, packageName: string) {
    const { purchaseToken, sku, notificationType } = notification;

    // Google one-time product notification types:
    // 1 = ONE_TIME_PRODUCT_PURCHASED, 2 = ONE_TIME_PRODUCT_CANCELED

    let paymentType: "purchase" | "refund";

    switch (notificationType) {
      case 1: // ONE_TIME_PRODUCT_PURCHASED
        paymentType = "purchase";
        break;
      case 2: // ONE_TIME_PRODUCT_CANCELED
        paymentType = "refund";
        break;
      default:
        this.di.log.log(`Google webhook: Unknown one-time product notification type: ${notificationType}`);
        return;
    }

    try {
      // Look up user by purchase token (stored as originalTransactionId)
      const userDao = new UserDao(this.di);
      const userId = await userDao.getUserIdByOriginalTransactionId(purchaseToken);

      if (!userId) {
        this.di.log.log(`Google webhook: No user found for purchase token ${purchaseToken}`);
        return;
      }

      // Call Google Play API to get full purchase details
      const subscriptions = new Subscriptions(this.di.log, this.di.secrets);
      const purchaseDetails = await subscriptions.getGooglePurchaseTokenJson(purchaseToken);

      if (!purchaseDetails || "error" in purchaseDetails) {
        this.di.log.log(`Google webhook: Failed to get purchase details for token ${purchaseToken}`);
        return;
      }

      // For one-time products, extract purchase info
      let amount = 0;
      let currency = "USD";

      if (purchaseDetails.kind === "androidpublisher#productPurchase") {
        // One-time products don't have price info in API response unfortunately
        // We'd need to hardcode based on SKU or get from Play Console
        this.di.log.log(`Google webhook: One-time product ${sku} - price info not available from API`);
      }

      // Record the payment event
      await new PaymentDao(this.di).add({
        userId,
        timestamp: Date.now(),
        originalTransactionId: purchaseToken,
        productId: sku,
        amount,
        currency,
        type: "google",
        paymentType,
      });

      this.di.log.log(
        `Google webhook: Recorded ${paymentType} for user ${userId}, product ${sku}, amount: ${amount} ${currency}`
      );
    } catch (error) {
      this.di.log.log("Error handling Google one-time product notification:", error);
    }
  }

  private async handleVoidedPurchaseNotification(notification: IGoogleVoidedPurchaseNotification) {
    const { purchaseToken, orderId, productType, refundType } = notification;

    this.di.log.log(
      `Google webhook: Voided purchase - orderId: ${orderId}, type: ${productType}, refundType: ${refundType}`
    );

    try {
      // Look up user by purchase token (stored as originalTransactionId)
      const userDao = new UserDao(this.di);
      const userId = await userDao.getUserIdByOriginalTransactionId(purchaseToken);

      if (!userId) {
        this.di.log.log(`Google webhook: No user found for purchase token ${purchaseToken}`);
        return;
      }

      // Record the refund event
      await new PaymentDao(this.di).add({
        userId,
        timestamp: Date.now(),
        originalTransactionId: purchaseToken,
        productId: `voided-${orderId}`,
        amount: 0, // Amount not provided in voided notification
        currency: "USD",
        type: "google",
        paymentType: "refund",
      });

      this.di.log.log(
        `Google webhook: Recorded refund for user ${userId}, orderId: ${orderId}, refundType: ${refundType}`
      );
    } catch (error) {
      this.di.log.log("Error handling Google voided purchase notification:", error);
    }
  }
}
