import { IDI } from "../utils/di";
import { PaymentDao } from "../dao/paymentDao";
import { IAppleTransaction, IAppleTransactionHistory, Subscriptions } from "./subscriptions";
import { AppleJWTVerifier } from "./appleJwtVerifier";
import type { IAppleTransactionInfo } from "./appleWebhookHandler";
import { CollectionUtils_sort } from "../../src/utils/collection";
import { ApplePaymentAttribution_apply } from "./applePaymentAttribution";
import {
  AppleOfferAffiliate_INTRO_OFFER_TYPE,
  AppleOfferAffiliate_needsRenewalLookup,
  AppleOfferAffiliate_trialRenewalOffer,
  IAppleOfferTransaction,
} from "./appleOfferAffiliate";

interface IAppleReceiptInfo {
  product_id: string;
  purchase_date_ms: string;
  is_trial_period?: "true" | "false";
  original_transaction_id?: string;
  transaction_id?: string;
  in_app_ownership_type?: string;
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
    offerIdentifier?: string;
    offerType?: number;
  }> {
    let amount = 0;
    let currency = "USD";
    let isFreeTrialPayment = false;
    let originalPurchaseDate: number | undefined = undefined;
    let isTest = false;
    let offerIdentifier: string | undefined = undefined;
    let offerType: number | undefined = undefined;

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
          offerIdentifier = transaction.offerIdentifier;
          offerType = transaction.offerType;
          break;
        }
      }
    }
    return { amount, currency, isFreeTrialPayment, originalPurchaseDate, isTest, offerIdentifier, offerType };
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
      const isTrial = latestReceipt.is_trial_period === "true";
      await this.attribute(
        {
          transactionId,
          purchaseDate: Number(latestReceipt.purchase_date_ms),
          offerType: isTrial ? AppleOfferAffiliate_INTRO_OFFER_TYPE : undefined,
          inAppOwnershipType: latestReceipt.in_app_ownership_type,
        },
        userId,
        latestReceipt.original_transaction_id
      );
      return;
    }

    let amount = 0;
    let currency = "USD";
    let isFreeTrialPayment = false;
    let originalPurchaseDate: number | undefined = undefined;
    let isTest = false;
    let offerIdentifier: string | undefined = undefined;
    let offerType: number | undefined = undefined;

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
      offerIdentifier = result.offerIdentifier;
      offerType = result.offerType;
    }

    const originalTransactionId = latestReceipt.original_transaction_id || "";
    const isPurchase = originalTransactionId === transactionId;
    const timestamp = Number(latestReceipt.purchase_date_ms);

    await paymentDao.addIfNotExists({
      userId,
      timestamp,
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
      offerIdentifier,
      isTest,
      inAppOwnershipType: latestReceipt.in_app_ownership_type,
    });
    const transaction: IAppleOfferTransaction = {
      transactionId,
      purchaseDate: timestamp,
      offerIdentifier,
      offerType,
      environment: isTest ? "Sandbox" : undefined,
      inAppOwnershipType: latestReceipt.in_app_ownership_type,
    };
    await this.attribute(transaction, userId, originalTransactionId);
  }

  // Runs on every verification, not only for new payments, so a failed Apple lookup is retried on the next app launch.
  private async attribute(
    transaction: IAppleOfferTransaction,
    userId: string,
    originalTransactionId: string | undefined
  ): Promise<void> {
    const renewal =
      originalTransactionId && AppleOfferAffiliate_needsRenewalLookup(transaction)
        ? await this.subscriptions.getAppleRenewalOffer(originalTransactionId)
        : undefined;
    await ApplePaymentAttribution_apply(this.di, {
      transaction,
      fallbackUserId: userId,
      renewalOffer: AppleOfferAffiliate_trialRenewalOffer(transaction, renewal),
    });
  }

  public async processJwsPayment(userId: string, transactionInfo: IAppleTransactionInfo): Promise<void> {
    const paymentDao = new PaymentDao(this.di);
    if (await paymentDao.doesExist(transactionInfo.transactionId)) {
      this.di.log.log(`Apple JWS verification: Payment ${transactionInfo.transactionId} already exists`);
      await this.attribute(transactionInfo, userId, transactionInfo.originalTransactionId);
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
      inAppOwnershipType: transactionInfo.inAppOwnershipType,
    });
    await this.attribute(transactionInfo, userId, transactionInfo.originalTransactionId);
  }
}
