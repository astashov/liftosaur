import { IDI } from "../utils/di";
import { PaymentDao } from "../dao/paymentDao";
import { IAppleTransaction, IAppleTransactionHistory, Subscriptions } from "./subscriptions";
import { AppleJWTVerifier } from "./appleJwtVerifier";
import type { IAppleTransactionInfo } from "./appleWebhookHandler";
import { CollectionUtils_sort } from "../../src/utils/collection";

interface IAppleReceiptInfo {
  product_id: string;
  purchase_date_ms: string;
  original_transaction_id?: string;
  transaction_id?: string;
}

export class ApplePaymentProcessor {
  constructor(
    private readonly di: IDI,
    private readonly subscriptions: Subscriptions
  ) {}

  public async getTransactionDetails(
    transactionId: string,
    transactionHistory?: IAppleTransactionHistory
  ): Promise<{
    amount: number;
    currency: string;
    isFreeTrialPayment: boolean;
    originalPurchaseDate?: number;
    isTest: boolean;
  }> {
    let amount = 0;
    let currency = "USD";
    let isFreeTrialPayment = false;
    let originalPurchaseDate: number | undefined = undefined;
    let isTest = false;

    if (transactionHistory && transactionHistory.signedTransactions) {
      const jwtVerifier = new AppleJWTVerifier(this.di.log);
      for (const signedTransaction of transactionHistory.signedTransactions) {
        const transaction = jwtVerifier.verifyJWT(signedTransaction) as IAppleTransaction | null;
        this.di.log.log("Verified transaction", transaction);
        if (transaction && transaction.transactionId === transactionId) {
          if (transaction.price) {
            amount = transaction.price / 1000;
            currency = transaction.currency || "USD";
          }
          originalPurchaseDate = transaction.originalPurchaseDate;
          isFreeTrialPayment = transaction.offerDiscountType === "FREE_TRIAL";
          isTest = transaction.environment === "Sandbox";
          break;
        }
      }
    }
    return { amount, currency, isFreeTrialPayment, originalPurchaseDate, isTest };
  }

  public async processReceiptPayment(userId: string, latestReceiptInfo?: IAppleReceiptInfo[]): Promise<void> {
    if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
      return;
    }

    const latestReceipt = CollectionUtils_sort(
      latestReceiptInfo,
      (a, b) => Number(b.purchase_date_ms) - Number(a.purchase_date_ms)
    )[0];

    if (!latestReceipt) {
      return;
    }

    const paymentDao = new PaymentDao(this.di);
    const transactionId = latestReceipt.transaction_id;
    if (!transactionId) {
      return;
    }
    if (await paymentDao.doesExist(transactionId)) {
      this.di.log.log(`Apple verification: Payment with transaction ID ${transactionId} already exists`);
      return;
    }

    let amount = 0;
    let currency = "USD";
    let isFreeTrialPayment = false;
    let originalPurchaseDate: number | undefined = undefined;
    let isTest = false;

    if (latestReceipt.original_transaction_id) {
      this.di.log.log(`Apple verification: Fetching transaction history for ${latestReceipt.original_transaction_id}`);
      const transactionHistory = await this.subscriptions.getAppleTransactionHistory(
        latestReceipt.original_transaction_id
      );
      const result = await this.getTransactionDetails(transactionId, transactionHistory);
      amount = result.amount;
      currency = result.currency;
      isFreeTrialPayment = result.isFreeTrialPayment;
      originalPurchaseDate = result.originalPurchaseDate;
      isTest = result.isTest;
    }

    const originalTransactionId = latestReceipt.original_transaction_id || "";
    const isPurchase = originalTransactionId === transactionId;

    await paymentDao.addIfNotExists({
      userId,
      timestamp: Number(latestReceipt.purchase_date_ms),
      originalTransactionId,
      transactionId,
      productId: latestReceipt.product_id,
      amount,
      tax: undefined,
      currency,
      type: "apple",
      source: "verifier",
      paymentType: isPurchase ? "purchase" : "renewal",
      isFreeTrialPayment,
      subscriptionStartTimestamp: originalPurchaseDate,
      isTest,
    });
  }

  public async processJwsPayment(userId: string, transactionInfo: IAppleTransactionInfo): Promise<void> {
    const paymentDao = new PaymentDao(this.di);
    if (await paymentDao.doesExist(transactionInfo.transactionId)) {
      this.di.log.log(`Apple JWS verification: Payment ${transactionInfo.transactionId} already exists`);
      return;
    }
    const isPurchase = transactionInfo.originalTransactionId === transactionInfo.transactionId;
    await paymentDao.addIfNotExists({
      userId,
      timestamp: transactionInfo.purchaseDate || Date.now(),
      originalTransactionId: transactionInfo.originalTransactionId,
      transactionId: transactionInfo.transactionId,
      productId: transactionInfo.productId,
      amount: transactionInfo.price ? transactionInfo.price / 1000 : 0,
      tax: undefined,
      currency: transactionInfo.currency || "USD",
      type: "apple",
      source: "verifier",
      paymentType: isPurchase ? "purchase" : "renewal",
      isFreeTrialPayment: transactionInfo.offerDiscountType === "FREE_TRIAL",
      subscriptionStartTimestamp: transactionInfo.originalPurchaseDate,
      offerIdentifier: transactionInfo.offerIdentifier,
      isTest: transactionInfo.environment === "Sandbox",
    });
  }
}
