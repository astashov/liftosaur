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
      let currency = "USD";
      let originalTransactionId = token;

      const paymentDao = new PaymentDao(this.di);
      if (await paymentDao.doesExist(token)) {
        this.di.log.log(`Google verification: Payment with transaction ID ${token} already exists`);
        return;
      }

      if (googleJson.kind === "androidpublisher#subscriptionPurchase") {
        amount = Math.round(Number(googleJson.priceAmountMicros || "0") / 1000000);
        currency = googleJson.priceCurrencyCode || "USD";
        originalTransactionId = googleJson.linkedPurchaseToken || token;
      } else if (googleJson.kind === "androidpublisher#productPurchase") {
        this.di.log.log(`Google verification: Fetching order info for product ${productId}`);
        const subscriptions = new Subscriptions(this.di.log, this.di.secrets);
        const orderInfo = await subscriptions.getGoogleOrderInfo(googleJson.orderId);
        if (orderInfo && orderInfo.total) {
          amount =
            Math.round(Number(orderInfo.total.units || "0")) +
            Math.round(Number(orderInfo.total.nanos || "0") / 1000000000);
          currency = orderInfo.total.currencyCode || "USD";
        }
      }

      let timestamp = Date.now();
      if (googleJson.kind === "androidpublisher#productPurchase") {
        timestamp = googleJson.purchaseTimeMillis;
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
