import { IDI } from "../utils/di";
import { PaymentDao } from "../dao/paymentDao";
import { IAppleTransaction, IAppleTransactionHistory, Subscriptions } from "./subscriptions";
import { AppleJWTVerifier } from "./appleJwtVerifier";
import { CollectionUtils } from "../../src/utils/collection";

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

  public async getAmountAndCurrency(
    transactionId: string,
    transactionHistory?: IAppleTransactionHistory
  ): Promise<{ amount: number; currency: string }> {
    let amount = 0;
    let currency = "USD";
    if (transactionHistory && transactionHistory.signedTransactions) {
      const jwtVerifier = new AppleJWTVerifier(this.di.log);
      for (const signedTransaction of transactionHistory.signedTransactions) {
        const transaction = jwtVerifier.verifyJWT(signedTransaction) as IAppleTransaction | null;
        if (transaction && transaction.transactionId === transactionId) {
          if (transaction.price) {
            amount = transaction.price / 1000;
            currency = transaction.currency || "USD";
          }
          break;
        }
      }
    }
    return { amount, currency };
  }

  public async processReceiptPayment(userId: string, latestReceiptInfo?: IAppleReceiptInfo[]): Promise<void> {
    if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
      return;
    }

    const latestReceipt = CollectionUtils.sort(
      latestReceiptInfo,
      (a, b) => Number(b.purchase_date_ms) - Number(a.purchase_date_ms)
    )[0];

    if (!latestReceipt) {
      return;
    }

    let amount = 0;
    let currency = "USD";

    if (latestReceipt.original_transaction_id) {
      this.di.log.log(`Apple verification: Fetching transaction history for ${latestReceipt.original_transaction_id}`);
      const transactionHistory = await this.subscriptions.getAppleTransactionHistory(
        latestReceipt.original_transaction_id
      );
      const result = await this.getAmountAndCurrency(latestReceipt.transaction_id || "", transactionHistory);
      amount = result.amount;
      currency = result.currency;
    }

    const originalTransactionId = latestReceipt.original_transaction_id || "";
    const transactionId = latestReceipt.transaction_id || "";

    await new PaymentDao(this.di).addIfNotExists({
      userId,
      timestamp: Number(latestReceipt.purchase_date_ms),
      originalTransactionId,
      transactionId,
      productId: latestReceipt.product_id,
      amount,
      currency,
      type: "apple",
      source: "verifier",
      paymentType: originalTransactionId === transactionId ? "purchase" : "renewal",
    });
  }
}
