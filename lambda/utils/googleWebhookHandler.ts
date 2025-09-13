import { IDI } from "./di";
import { PaymentDao } from "../dao/paymentDao";
import { UserDao } from "../dao/userDao";
import { Subscriptions } from "./subscriptions";
import { GoogleJWTVerifier } from "./googleJwtVerifier";
import { convertGooglePriceToNumber } from "./googlePaymentProcessor";

export interface IGooglePubSubMessage {
  message: {
    data: string;
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

  public async handleWebhook(
    body: string,
    authorizationHeader?: string
  ): Promise<{ success: boolean; message: string }> {
    this.di.log.log("Google webhook received body", body);

    if (!body) {
      return { success: false, message: "No body provided" };
    }

    if (authorizationHeader) {
      const jwtVerifier = new GoogleJWTVerifier(this.di.log);
      const verifiedPayload = await jwtVerifier.verifyJWT(authorizationHeader);

      if (!verifiedPayload) {
        this.di.log.log("Google webhook: JWT verification failed");
        return { success: false, message: "JWT verification failed" };
      }

      this.di.log.log("Google webhook: JWT verification successful");
    } else {
      this.di.log.log("Google webhook: No authorization header provided - proceeding without JWT verification");
    }

    try {
      const decodedBody = Buffer.from(body, "base64").toString("utf-8");
      const pubsubMessage = JSON.parse(decodedBody) as IGooglePubSubMessage;
      this.di.log.log("Parsed PubSub message", pubsubMessage);

      if (!pubsubMessage.message?.data) {
        this.di.log.log("Google webhook: No data in PubSub message");
        return { success: true, message: "No data in message" };
      }

      const decodedData = Buffer.from(pubsubMessage.message.data, "base64").toString("utf-8");
      const notification = JSON.parse(decodedData) as IGoogleDeveloperNotification;
      this.di.log.log("Decoded Google notification", notification);

      if (notification.subscriptionNotification) {
        await this.handleSubscriptionNotification(notification.subscriptionNotification);
      } else if (notification.oneTimeProductNotification) {
        await this.handleOneTimeProductNotification(notification.oneTimeProductNotification);
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

  private async handleSubscriptionNotification(notification: IGoogleSubscriptionNotification): Promise<void> {
    const { purchaseToken, subscriptionId, notificationType } = notification;
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
        this.di.log.log(`Google webhook: Received non-payment subscription notification: ${notificationType}`);
        return;
      default:
        this.di.log.log(`Google webhook: Unknown subscription notification type: ${notificationType}`);
        return;
    }
    await this.recordPaymentEvent(purchaseToken, subscriptionId, paymentType, "subscription");
  }

  private async handleOneTimeProductNotification(notification: IGoogleOneTimeProductNotification): Promise<void> {
    const { purchaseToken, sku, notificationType } = notification;
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

    await this.recordPaymentEvent(purchaseToken, sku, paymentType, "product");
  }

  private async handleVoidedPurchaseNotification(notification: IGoogleVoidedPurchaseNotification): Promise<void> {
    const { purchaseToken, orderId, productType, refundType } = notification;
    this.di.log.log(
      `Google webhook: Voided purchase - orderId: ${orderId}, type: ${productType}, refundType: ${refundType}`
    );
    await this.recordPaymentEvent(purchaseToken, `voided-${orderId}`, "refund", "voided");
  }

  private async recordPaymentEvent(
    purchaseToken: string,
    productId: string,
    paymentType: "purchase" | "renewal" | "refund",
    productType: "subscription" | "product" | "voided"
  ): Promise<void> {
    try {
      let amount = 0;
      let tax: number | undefined;
      let currency = "USD";
      let originalTransactionId = purchaseToken;
      let timestamp = Date.now();
      let isFreeTrialPayment = false;
      let subscriptionStartTimestamp: number | undefined = undefined;

      const paymentDao = new PaymentDao(this.di);
      if (await paymentDao.doesExist(purchaseToken)) {
        this.di.log.log(`Google webhook: Payment with transaction ID ${purchaseToken} already exists`);
        return;
      }

      if (productType !== "voided") {
        const subscriptions = new Subscriptions(this.di.log, this.di.secrets);
        const purchaseDetails = await subscriptions.getGooglePurchaseTokenJson(purchaseToken, productId);
        this.di.log.log("Google webhook: Purchase details", purchaseDetails);

        if (!purchaseDetails || "error" in purchaseDetails) {
          this.di.log.log(`Google webhook: Failed to get purchase details for token ${purchaseToken}`);
          return;
        }

        if (purchaseDetails.kind === "androidpublisher#subscriptionPurchase") {
          amount = Math.round(Number(purchaseDetails.priceAmountMicros || "0") / 1000000);
          currency = purchaseDetails.priceCurrencyCode || "USD";
          originalTransactionId = purchaseDetails.linkedPurchaseToken || purchaseToken;
          timestamp = Date.now();
          subscriptionStartTimestamp =
            purchaseDetails.startTimeMillis != null ? Number(purchaseDetails.startTimeMillis) : undefined;

          // Check if it's a free trial using paymentState (2 = free trial) or intro price
          if (purchaseDetails.paymentState === 2) {
            isFreeTrialPayment = true;
          } else if (purchaseDetails.introductoryPriceInfo) {
            const introPrice = purchaseDetails.introductoryPriceInfo.introductoryPriceAmountMicros;
            isFreeTrialPayment = introPrice === "0";
          }

          if (purchaseDetails.orderId) {
            this.di.log.log(`Google webhook: Fetching order info for subscription ${productId}`);
            const orderInfo = await subscriptions.getGoogleOrderInfo(purchaseDetails.orderId);
            this.di.log.log("Google webhook: Subscription Order Info", orderInfo);
            if (orderInfo && orderInfo.total) {
              amount = convertGooglePriceToNumber(orderInfo.total);
              currency = orderInfo.total.currencyCode || currency;
            }
            if (orderInfo && orderInfo.tax) {
              tax = convertGooglePriceToNumber(orderInfo.tax);
            }
          }
        } else if (purchaseDetails.kind === "androidpublisher#productPurchase") {
          this.di.log.log(`Google webhook: Fetching order info for product ${productId}`);
          timestamp = purchaseDetails.purchaseTimeMillis;
          const orderInfo = await subscriptions.getGoogleOrderInfo(purchaseDetails.orderId);
          if (orderInfo && orderInfo.total) {
            amount = convertGooglePriceToNumber(orderInfo.total);
            currency = orderInfo.total.currencyCode || "USD";
          }
          if (orderInfo && orderInfo.tax) {
            tax = convertGooglePriceToNumber(orderInfo.tax);
          }
        }
      }

      const userDao = new UserDao(this.di);
      const userId = await userDao.getUserIdByOriginalTransactionId(originalTransactionId);

      if (!userId) {
        this.di.log.log(`Google webhook: No user found for original transaction ID ${originalTransactionId}`);
        return;
      }

      await paymentDao.addIfNotExists({
        userId,
        timestamp,
        originalTransactionId,
        transactionId: purchaseToken,
        productId,
        amount,
        tax,
        currency,
        type: "google",
        source: "webhook",
        paymentType,
        isFreeTrialPayment,
        subscriptionStartTimestamp,
      });

      this.di.log.log(
        `Google webhook: Recorded ${paymentType} for user ${userId}, product ${productId}, amount: ${amount} ${currency}`
      );
    } catch (error) {
      this.di.log.log(`Error recording Google payment event: ${error}`);
    }
  }
}
