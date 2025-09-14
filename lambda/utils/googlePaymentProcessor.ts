import { IDI } from "./di";
import { PaymentDao } from "../dao/paymentDao";
import { Subscriptions } from "./subscriptions";

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
  purchaseTimeMillis?: string;
  promotionType?: number;
  promotionCode?: string;
  acknowledgementState: number;
  linkedPurchaseToken?: string;
  introductoryPriceInfo?: {
    introductoryPriceCurrencyCode?: string;
    introductoryPriceAmountMicros?: string;
    introductoryPricePeriod?: string;
    introductoryPriceCycles?: number;
  };
  kind: "androidpublisher#subscriptionPurchase";
}

export function convertGooglePriceToNumber(price: { units?: string; nanos?: number }): number {
  return Number(price.units || "0") + Number(Number((price.nanos ?? 0) / 1000000000).toFixed(2));
}

export class GooglePaymentProcessor {
  constructor(private readonly di: IDI) {}

  public async processVerificationPayment(
    userId: string,
    googleJson: IVerifyGoogleProductTokenSuccess | IVerifyGoogleSubscriptionTokenSuccess,
    token: string,
    productId: string
  ): Promise<void> {
    try {
      let amount = 0;
      let tax: number | undefined;
      let currency = "USD";
      let originalTransactionId = token;
      let purchaseTime: number | undefined = undefined;

      if (
        googleJson.kind === "androidpublisher#subscriptionPurchase" &&
        googleJson.startTimeMillis != null &&
        Date.now() - Number(googleJson.startTimeMillis) > 24 * 60 * 60 * 1000
      ) {
        this.di.log.log(
          `Google verification: Subscription purchase time is more than 24 hours ago, so webhook will handle it.`
        );
        return;
      }

      const paymentDao = new PaymentDao(this.di);
      if (await paymentDao.doesExist(token)) {
        this.di.log.log(`Google verification: Payment with transaction ID ${token} already exists`);
        return;
      }

      const subscriptions = new Subscriptions(this.di.log, this.di.secrets);

      this.di.log.log("Google verification: Purchase token", token);
      this.di.log.log("Google verification: Decoded JSON", googleJson);
      if (googleJson.kind === "androidpublisher#subscriptionPurchase") {
        amount = Number((Number(googleJson.priceAmountMicros || "0") / 1000000).toFixed(2));
        currency = googleJson.priceCurrencyCode || "USD";
        originalTransactionId = googleJson.linkedPurchaseToken || token;
        purchaseTime = googleJson.startTimeMillis != null ? Number(googleJson.startTimeMillis) : purchaseTime;

        // Try to fetch order info for subscription to get tax details
        if (googleJson.orderId) {
          this.di.log.log(`Google verification: Fetching order info for subscription ${productId}`);
          const orderInfo = await subscriptions.getGoogleOrderInfo(googleJson.orderId);
          this.di.log.log("Google verification: Subscription Order Info", orderInfo);
          purchaseTime =
            purchaseTime == null
              ? orderInfo?.createTime
                ? new Date(orderInfo.createTime).getTime()
                : orderInfo?.lastEventTime
                  ? new Date(orderInfo.lastEventTime).getTime()
                  : purchaseTime
              : purchaseTime;
          if (orderInfo && orderInfo.total) {
            amount = convertGooglePriceToNumber(orderInfo.total);
            currency = orderInfo.total.currencyCode || currency;
          }
          if (orderInfo && orderInfo.tax) {
            tax = convertGooglePriceToNumber(orderInfo.tax);
          }
        }
      } else if (googleJson.kind === "androidpublisher#productPurchase") {
        this.di.log.log(`Google verification: Fetching order info for product ${productId}`);
        const orderInfo = await subscriptions.getGoogleOrderInfo(googleJson.orderId);
        this.di.log.log("Google verification: Order Info", orderInfo);
        purchaseTime = googleJson.purchaseTimeMillis != null ? Number(googleJson.purchaseTimeMillis) : purchaseTime;
        if (orderInfo && orderInfo.total) {
          amount = convertGooglePriceToNumber(orderInfo.total);
          currency = orderInfo.total.currencyCode || "USD";
        }
        if (orderInfo && orderInfo.tax) {
          tax = convertGooglePriceToNumber(orderInfo.tax);
        }
      }

      let timestamp = Date.now();
      if (googleJson.kind === "androidpublisher#productPurchase") {
        timestamp = Number(googleJson.purchaseTimeMillis);
      } else if (googleJson.kind === "androidpublisher#subscriptionPurchase") {
        timestamp = Number(googleJson.startTimeMillis || Date.now());
      }

      let isFreeTrialPayment = false;
      if (googleJson.kind === "androidpublisher#subscriptionPurchase") {
        if (googleJson.paymentState === 2) {
          isFreeTrialPayment = true;
        } else if (googleJson.introductoryPriceInfo) {
          const introPrice = googleJson.introductoryPriceInfo.introductoryPriceAmountMicros;
          isFreeTrialPayment = introPrice === "0";
        }
      }

      await paymentDao.addIfNotExists({
        userId,
        timestamp,
        originalTransactionId,
        transactionId: token,
        productId,
        amount,
        tax,
        currency,
        type: "google",
        source: "verifier",
        paymentType:
          googleJson.kind === "androidpublisher#subscriptionPurchase" && googleJson.linkedPurchaseToken
            ? "renewal"
            : "purchase",
        isFreeTrialPayment,
        subscriptionStartTimestamp: purchaseTime,
      });

      this.di.log.log(
        `Google verification: Recorded payment for user ${userId}, product ${productId}, amount: ${amount} ${currency}`
      );
    } catch (error) {
      this.di.log.log("Failed to add Google payment record", error);
      throw error;
    }
  }
}
