import { IDI } from "./di";
import { PaymentDao } from "../dao/paymentDao";
import { UserDao } from "../dao/userDao";
import { SubscriptionDetailsDao } from "../dao/subscriptionDetailsDao";
import { Subscriptions } from "./subscriptions";
import { GoogleJWTVerifier } from "./googleJwtVerifier";
import { convertGooglePriceToNumber } from "./googlePaymentProcessor";
import { AffiliateDao } from "../dao/affiliateDao";

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

    // Re-read live subscriptionsv2 (not the event payload) and upsert the details row on EVERY subscription
    // notification, so isActive and pendingProduct stay fresh through hold/pause/expire/revoke transitions
    // (the hasSubscription fallback now trusts details.isActive). Reading live state makes this idempotent and
    // order-independent: a late DEFERRED after a renewal sees no deferredItemReplacement and won't resurrect it.
    await this.upsertGoogleSubscriptionDetailsFromV2(purchaseToken);

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

  private async upsertGoogleSubscriptionDetailsFromV2(purchaseToken: string): Promise<void> {
    try {
      const subscriptions = new Subscriptions(this.di.log, this.di.secrets);
      // Resolve PENDING_PURCHASE_CANCELED to the real subscription so a canceled upgrade/downgrade event
      // doesn't overwrite the active row with isActive: false (it carries linkedPurchaseToken to the real sub).
      const resolved = await subscriptions.getGoogleSubscriptionV2Resolved(purchaseToken);
      if (!resolved) {
        this.di.log.log(`Google webhook: no subscriptionsv2 for token ${purchaseToken}, skipping details upsert`);
        return;
      }
      const v2 = resolved.json;
      const effToken = resolved.token;
      // User lookup keys on the original transaction id stored in the existing details row (linked-token chain).
      const originalTransactionId = v2.linkedPurchaseToken || effToken;
      const userId = await new UserDao(this.di).getUserIdByOriginalTransactionId(originalTransactionId);
      if (!userId) {
        this.di.log.log(`Google webhook: no user for original transaction id ${originalTransactionId}, skipping`);
        return;
      }
      const details = subscriptions.getGoogleVerificationInfoV2(userId, v2, effToken);
      if (!details) {
        return;
      }
      await new SubscriptionDetailsDao(this.di).add(details);
      this.di.log.log(
        `Google webhook: upserted subscription details for ${userId} — product ${details.product}, ` +
          `pendingProduct ${details.pendingProduct ?? "none"}, isActive ${details.isActive}`
      );
    } catch (error) {
      this.di.log.log(`Google webhook: error upserting subscription details from v2: ${error}`);
    }
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
      let offerIdentifier: string | undefined = undefined;

      const paymentDao = new PaymentDao(this.di);
      let transactionId = purchaseToken;

      if (productType !== "voided") {
        const subscriptions = new Subscriptions(this.di.log, this.di.secrets);
        const info = await subscriptions.getGooglePaymentInfoV2(purchaseToken, productId);
        this.di.log.log("Google webhook: Purchase info", info);

        if (!info) {
          this.di.log.log(`Google webhook: Failed to get purchase details for token ${purchaseToken}`);
          return;
        }

        originalTransactionId = info.originalTransactionId;
        transactionId = info.orderId || purchaseToken;
        currency = info.currency || "USD";
        amount = info.fallbackAmount ?? 0;
        let orderTotalResolved = false;
        if (info.kind === "subscription") {
          timestamp = Date.now();
          subscriptionStartTimestamp = info.startTimeMs;
        } else {
          timestamp = info.purchaseTimeMs ?? Date.now();
        }

        // Amount/tax come from the Orders API; fallbackAmount is only the v2 recurring price if Orders is missing.
        if (info.orderId) {
          this.di.log.log(`Google webhook: Fetching order info for ${info.kind} ${productId}`);
          const orderInfo = await subscriptions.getGoogleOrderInfo(info.orderId);
          this.di.log.log("Google webhook: Order Info", JSON.stringify(orderInfo, null, 2));
          if (orderInfo && orderInfo.total) {
            amount = convertGooglePriceToNumber(orderInfo.total);
            currency = orderInfo.total.currencyCode || currency;
            orderTotalResolved = true;
          }
          if (orderInfo && orderInfo.tax) {
            tax = convertGooglePriceToNumber(orderInfo.tax);
          }
          if (info.kind === "subscription" && orderInfo?.lineItems?.[0]?.subscriptionDetails?.offerId) {
            offerIdentifier = orderInfo.lineItems[0].subscriptionDetails.offerId;
          }
        }
        // Free trial = a subscription whose ACTUAL charge (resolved Orders total) was zero. Products are never
        // trials, and a failed Orders lookup must not default to "free trial" just because amount stayed 0.
        isFreeTrialPayment = info.kind === "subscription" && orderTotalResolved && amount === 0;
      }

      if (await paymentDao.doesExist(transactionId)) {
        this.di.log.log(`Google webhook: Payment with transaction ID ${transactionId} already exists`);
        return;
      }

      const userDao = new UserDao(this.di);
      const userId = await userDao.getUserIdByOriginalTransactionId(originalTransactionId);

      if (!userId) {
        this.di.log.log(`Google webhook: No user found for original transaction ID ${originalTransactionId}`);
        return;
      }

      if (!offerIdentifier) {
        const affiliateDao = new AffiliateDao(this.di);
        const affiliates = await affiliateDao.getAffiliatesForUser(userId);
        const couponAffiliate = affiliates.find((a) => a.type === "coupon");
        if (couponAffiliate) {
          offerIdentifier = couponAffiliate.affiliateId;
        }
      }

      await paymentDao.addIfNotExists({
        userId,
        timestamp,
        originalTransactionId,
        transactionId,
        productId,
        amount,
        tax,
        currency,
        type: "google",
        source: "webhook",
        paymentType,
        isFreeTrialPayment,
        subscriptionStartTimestamp,
        offerIdentifier,
      });

      this.di.log.log(
        `Google webhook: Recorded ${paymentType} for user ${userId}, product ${productId}, amount: ${amount} ${currency}`
      );
    } catch (error) {
      this.di.log.log(`Error recording Google payment event: ${error}`);
    }
  }
}
