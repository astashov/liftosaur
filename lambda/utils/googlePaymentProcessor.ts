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

        // Try to fetch order info for subscription to get tax details
        if (googleJson.orderId) {
          this.di.log.log(`Google verification: Fetching order info for subscription ${productId}`);
          const orderInfo = await subscriptions.getGoogleOrderInfo(googleJson.orderId);
          this.di.log.log("Google verification: Subscription Order Info", orderInfo);
          if (orderInfo && orderInfo.tax) {
            tax = convertGooglePriceToNumber(orderInfo.tax);
          }
        }
      } else if (googleJson.kind === "androidpublisher#productPurchase") {
        this.di.log.log(`Google verification: Fetching order info for product ${productId}`);
        const orderInfo = await subscriptions.getGoogleOrderInfo(googleJson.orderId);
        this.di.log.log("Google verification: Order Info", orderInfo);
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
      if (googleJson.kind === "androidpublisher#subscriptionPurchase" && googleJson.introductoryPriceInfo) {
        const introPrice = googleJson.introductoryPriceInfo.introductoryPriceAmountMicros;
        isFreeTrialPayment = introPrice === "0" || introPrice === undefined;
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
        paymentType: originalTransactionId === token ? "purchase" : "renewal",
        isFreeTrialPayment,
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
