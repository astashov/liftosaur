import { IDI } from "./di";
import { PaymentDao } from "../dao/paymentDao";
import { IGooglePaymentInfoV2, Subscriptions } from "./subscriptions";

export function convertGooglePriceToNumber(price: { units?: string; nanos?: number }): number {
  return Number(price.units || "0") + Number(Number((price.nanos ?? 0) / 1000000000).toFixed(2));
}

export class GooglePaymentProcessor {
  constructor(private readonly di: IDI) {}

  public async processVerificationPayment(
    userId: string,
    info: IGooglePaymentInfoV2,
    productId: string
  ): Promise<void> {
    try {
      // Fresh subscription purchases > 24h old are handled by the RTDN webhook instead.
      if (
        info.kind === "subscription" &&
        info.startTimeMs != null &&
        Date.now() - info.startTimeMs > 24 * 60 * 60 * 1000
      ) {
        this.di.log.log(
          `Google verification: Subscription purchase time is more than 24 hours ago, so webhook will handle it.`
        );
        return;
      }

      const paymentDao = new PaymentDao(this.di);
      const subscriptions = new Subscriptions(this.di.log, this.di.secrets);

      let amount = info.fallbackAmount ?? 0;
      let tax: number | undefined;
      let currency = info.currency || "USD";
      let purchaseTime: number | undefined = info.kind === "subscription" ? info.startTimeMs : info.purchaseTimeMs;
      let offerIdentifier: string | undefined = undefined;
      let orderTotalResolved = false;
      const transactionId = info.orderId || info.purchaseToken;

      this.di.log.log("Google verification: Purchase info", JSON.stringify(info, null, 2));
      // Amount/tax come from the Orders API; fallbackAmount is only the v2 recurring price if Orders is missing.
      if (info.orderId) {
        this.di.log.log(`Google verification: Fetching order info for ${info.kind} ${productId}`);
        const orderInfo = await subscriptions.getGoogleOrderInfo(info.orderId);
        this.di.log.log("Google verification: Order Info", JSON.stringify(orderInfo, null, 2));
        if (purchaseTime == null) {
          purchaseTime = orderInfo?.createTime
            ? new Date(orderInfo.createTime).getTime()
            : orderInfo?.lastEventTime
              ? new Date(orderInfo.lastEventTime).getTime()
              : purchaseTime;
        }
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

      if (await paymentDao.doesExist(transactionId)) {
        this.di.log.log(`Google verification: Payment with transaction ID ${transactionId} already exists`);
        return;
      }

      const timestamp = purchaseTime ?? Date.now();

      await paymentDao.addIfNotExists({
        userId,
        timestamp,
        originalTransactionId: info.originalTransactionId,
        transactionId,
        productId,
        amount,
        tax,
        currency,
        type: "google",
        source: "verifier",
        paymentType: info.kind === "subscription" && info.isRenewal ? "renewal" : "purchase",
        // Free trial = a subscription whose ACTUAL charge (resolved Orders total) was zero. Products are never
        // trials, and a failed Orders lookup must not default to "free trial" just because amount stayed 0.
        isFreeTrialPayment: info.kind === "subscription" && orderTotalResolved && amount === 0,
        subscriptionStartTimestamp: purchaseTime,
        offerIdentifier,
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
