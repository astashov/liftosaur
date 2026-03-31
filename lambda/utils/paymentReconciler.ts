import fetch from "node-fetch";
import JWT from "jsonwebtoken";
import { IDI } from "./di";
import { SubscriptionDetailsDao, ISubscriptionDetailsDao } from "../dao/subscriptionDetailsDao";
import { PaymentDao } from "../dao/paymentDao";
import { IAppleTransaction, IAppleTransactionHistory, Subscriptions } from "./subscriptions";
import { AppleJWTVerifier } from "./appleJwtVerifier";
import { UserDao, ILimitedUserDao } from "../dao/userDao";
import { convertGooglePriceToNumber } from "./googlePaymentProcessor";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Must match the cutoff in PaymentDao.add()
const PAYMENT_TRACKING_START = new Date(2025, 8, 9).getTime();

const GOOGLE_PRODUCT_IDS: Record<string, string> = {
  montly: "com.liftosaur.subscription.and_montly",
  yearly: "com.liftosaur.subscription.and_yearly",
  lifetime: "com.liftosaur.subscription.and_lifetime",
};

export interface IReconciliationResult {
  appleSubscriptionsChecked: number;
  appleTransactionsChecked: number;
  applePaymentsAdded: number;
  googleSubscriptionsChecked: number;
  googlePaymentsAdded: number;
  orphanedAppleUsers: number;
  orphanedGoogleUsers: number;
  errors: string[];
}

export class PaymentReconciler {
  private readonly subscriptionsUtil: Subscriptions;
  private readonly paymentDao: PaymentDao;
  private readonly subscriptionDetailsDao: SubscriptionDetailsDao;
  private readonly userDao: UserDao;
  private readonly dryRun: boolean;

  constructor(
    private readonly di: IDI,
    opts?: { dryRun?: boolean }
  ) {
    this.subscriptionsUtil = new Subscriptions(di.log, di.secrets);
    this.paymentDao = new PaymentDao(di);
    this.subscriptionDetailsDao = new SubscriptionDetailsDao(di);
    this.userDao = new UserDao(di);
    this.dryRun = opts?.dryRun ?? false;
  }

  public async reconcile(preloaded?: {
    users?: ILimitedUserDao[];
    subscriptionDetails?: ISubscriptionDetailsDao[];
  }): Promise<IReconciliationResult> {
    const result: IReconciliationResult = {
      appleSubscriptionsChecked: 0,
      appleTransactionsChecked: 0,
      applePaymentsAdded: 0,
      googleSubscriptionsChecked: 0,
      googlePaymentsAdded: 0,
      orphanedAppleUsers: 0,
      orphanedGoogleUsers: 0,
      errors: [],
    };

    this.di.log.log("Reconciler: Starting reconciliation");

    let allSubscriptionDetails =
      preloaded?.subscriptionDetails ?? (await this.subscriptionDetailsDao.scanAll());
    this.di.log.log(`Reconciler: Found ${allSubscriptionDetails.length} subscription details`);

    const newDetails = await this.auditUserStorage(allSubscriptionDetails, result, preloaded?.users);
    if (newDetails.length > 0) {
      allSubscriptionDetails = allSubscriptionDetails.concat(newDetails);
    }

    this.di.log.log("Reconciler: Loading all existing payments");
    const allPayments = await this.paymentDao.getAllPayments();
    const existingTxIds = new Set(allPayments.map((p) => p.transactionId));
    this.di.log.log(`Reconciler: Loaded ${allPayments.length} existing payments`);

    const appleSubscriptions = allSubscriptionDetails.filter((s) => s.type === "apple" && s.originalTransactionId);
    const googleSubscriptions = allSubscriptionDetails.filter((s) => s.type === "google" && s.originalTransactionId);

    await this.reconcileApple(appleSubscriptions, existingTxIds, result);
    await this.reconcileGoogle(googleSubscriptions, existingTxIds, result);

    this.di.log.log("Reconciler: Reconciliation complete", JSON.stringify(result));
    return result;
  }

  private async auditUserStorage(
    existingDetails: ISubscriptionDetailsDao[],
    result: IReconciliationResult,
    preloadedUsers?: ILimitedUserDao[]
  ): Promise<ISubscriptionDetailsDao[]> {
    this.di.log.log("Reconciler: Starting user storage audit");
    const users = preloadedUsers ?? (await this.userDao.getAllLimited());
    const detailsByUserId = new Set(existingDetails.map((d) => d.userId));
    const newDetails: ISubscriptionDetailsDao[] = [];

    for (const user of users) {
      if (!user.storage?.subscription) {
        continue;
      }

      if (!detailsByUserId.has(user.id)) {
        const appleDetails = await this.auditAppleUser(user, result);
        if (appleDetails) {
          newDetails.push(appleDetails);
        }
        const googleDetails = await this.auditGoogleUser(user, result);
        if (googleDetails) {
          newDetails.push(googleDetails);
        }
      }
    }

    this.di.log.log(
      `Reconciler: Audit found ${result.orphanedAppleUsers} orphaned Apple, ${result.orphanedGoogleUsers} orphaned Google users`
    );
    return newDetails;
  }

  private async auditAppleUser(
    user: ILimitedUserDao,
    result: IReconciliationResult
  ): Promise<ISubscriptionDetailsDao | undefined> {
    const appleRaw = user.storage?.subscription?.apple;
    if (!appleRaw) {
      return undefined;
    }
    const receiptValues = Array.isArray(appleRaw)
      ? appleRaw.map((r) => r.value)
      : Object.keys(appleRaw);
    if (receiptValues.length === 0) {
      return undefined;
    }

    for (const receiptValue of receiptValues) {
      try {
        const json = await this.subscriptionsUtil.getAppleVerificationJson(receiptValue);
        if (!json) {
          continue;
        }
        const info = this.subscriptionsUtil.getAppleVerificationInfo(user.id, json);
        if (!info || !info.originalTransactionId) {
          continue;
        }

        result.orphanedAppleUsers += 1;
        if (this.dryRun) {
          this.di.log.log(
            `Reconciler [DRY RUN]: Would create Apple subscription detail for user ${user.id}, originalTransactionId: ${info.originalTransactionId}`
          );
        } else {
          this.di.log.log(`Reconciler: Found orphaned Apple user ${user.id}, creating subscription detail`);
          await this.subscriptionDetailsDao.add(info);
        }
        await sleep(200);
        return info;
      } catch (error) {
        result.errors.push(`Audit Apple user ${user.id}: ${error}`);
      }
    }
    return undefined;
  }

  private async auditGoogleUser(
    user: ILimitedUserDao,
    result: IReconciliationResult
  ): Promise<ISubscriptionDetailsDao | undefined> {
    const googleRaw = user.storage?.subscription?.google;
    if (!googleRaw) {
      return undefined;
    }
    const tokenStrings = Array.isArray(googleRaw)
      ? googleRaw.map((r) => r.value)
      : Object.keys(googleRaw);
    if (tokenStrings.length === 0) {
      return undefined;
    }

    for (const tokenString of tokenStrings) {
      try {
        const { token, productId } = JSON.parse(tokenString) as { token: string; productId: string };
        const purchaseDetails = await this.subscriptionsUtil.getGooglePurchaseTokenJson(token, productId);
        if (!purchaseDetails || "error" in purchaseDetails) {
          continue;
        }

        const info = await this.subscriptionsUtil.getGoogleVerificationInfo(user.id, purchaseDetails, tokenString);
        if (!info) {
          continue;
        }

        result.orphanedGoogleUsers += 1;
        if (this.dryRun) {
          this.di.log.log(
            `Reconciler [DRY RUN]: Would create Google subscription detail for user ${user.id}, originalTransactionId: ${info.originalTransactionId}`
          );
        } else {
          this.di.log.log(`Reconciler: Found orphaned Google user ${user.id}, creating subscription detail`);
          await this.subscriptionDetailsDao.add(info);
        }
        await sleep(200);
        return info;
      } catch (error) {
        result.errors.push(`Audit Google user ${user.id}: ${error}`);
      }
    }
    return undefined;
  }

  private async reconcileApple(
    subscriptions: ISubscriptionDetailsDao[],
    existingTxIds: Set<string>,
    result: IReconciliationResult
  ): Promise<void> {
    this.di.log.log(`Reconciler: Reconciling ${subscriptions.length} Apple subscriptions`);
    const jwtVerifier = new AppleJWTVerifier(this.di.log);

    const appleToken = await this.generateAppleToken();
    if (!appleToken) {
      result.errors.push("Apple: Failed to generate API token");
      return;
    }

    const seen = new Set<string>();
    const uniqueSubscriptions = subscriptions.filter((s) => {
      if (seen.has(s.originalTransactionId!)) {
        return false;
      }
      seen.add(s.originalTransactionId!);
      return true;
    });

    const BATCH_SIZE = 10;
    for (let batchStart = 0; batchStart < uniqueSubscriptions.length; batchStart += BATCH_SIZE) {
      const batch = uniqueSubscriptions.slice(batchStart, batchStart + BATCH_SIZE);
      this.di.log.log(
        `Reconciler: Apple batch [${batchStart + 1}-${batchStart + batch.length}/${uniqueSubscriptions.length}]`
      );

      const batchResults = await Promise.all(
        batch.map((sub) => this.reconcileOneAppleSub(sub, appleToken, jwtVerifier, existingTxIds))
      );

      for (const br of batchResults) {
        result.appleSubscriptionsChecked += 1;
        result.appleTransactionsChecked += br.checked;
        result.applePaymentsAdded += br.added;
        if (br.error) {
          result.errors.push(br.error);
        }
      }
    }
  }

  private async reconcileOneAppleSub(
    sub: ISubscriptionDetailsDao,
    appleToken: string,
    jwtVerifier: AppleJWTVerifier,
    existingTxIds: Set<string>
  ): Promise<{ checked: number; added: number; error?: string }> {
    let checked = 0;
    let added = 0;
    try {
      const allTransactions = await this.fetchAllAppleTransactions(sub.originalTransactionId!, appleToken);
      if (!allTransactions || allTransactions.length === 0) {
        return { checked, added };
      }

      for (const signedTx of allTransactions) {
        checked += 1;
        const tx = jwtVerifier.verifyJWT(signedTx) as IAppleTransaction | null;
        if (!tx) {
          continue;
        }
        if (existingTxIds.has(tx.transactionId)) {
          continue;
        }
        if ((tx.purchaseDate || 0) < PAYMENT_TRACKING_START) {
          continue;
        }

        const isPurchase = tx.originalTransactionId === tx.transactionId;
        const amount = tx.price ? tx.price / 1000 : 0;
        added += 1;
        if (this.dryRun) {
          this.di.log.log(
            `Reconciler [DRY RUN]: Would add Apple ${isPurchase ? "purchase" : "renewal"} ${tx.transactionId} for user ${sub.userId}, amount: ${amount} ${tx.currency || "USD"}`
          );
        } else {
          await this.paymentDao.add({
            userId: sub.userId,
            timestamp: tx.purchaseDate || Date.now(),
            originalTransactionId: tx.originalTransactionId,
            transactionId: tx.transactionId,
            productId: tx.productId,
            amount,
            currency: tx.currency || "USD",
            type: "apple",
            source: "reconciler",
            paymentType: isPurchase ? "purchase" : "renewal",
            isFreeTrialPayment: tx.offerDiscountType === "FREE_TRIAL",
            subscriptionStartTimestamp: tx.originalPurchaseDate,
            offerIdentifier: tx.offerIdentifier,
          });
          this.di.log.log(`Reconciler: Added Apple payment ${tx.transactionId} for user ${sub.userId}`);
        }
      }
    } catch (error) {
      return { checked, added, error: `Apple ${sub.originalTransactionId}: ${error}` };
    }
    return { checked, added };
  }

  private async generateAppleToken(): Promise<string | undefined> {
    try {
      const applePrivateKey = await this.di.secrets.getApplePrivateKey();
      const appleKeyId = await this.di.secrets.getAppleKeyId();
      const appleIssuerId = await this.di.secrets.getAppleIssuerId();
      const now = Math.floor(Date.now() / 1000);
      return JWT.sign(
        { iss: appleIssuerId, aud: "appstoreconnect-v1", iat: now, exp: now + 1200, bid: "com.liftosaur.www" },
        applePrivateKey,
        { algorithm: "ES256", header: { kid: appleKeyId, typ: "JWT", alg: "ES256" } }
      );
    } catch (error) {
      this.di.log.log("Reconciler: Failed to generate Apple token:", error);
      return undefined;
    }
  }

  private async fetchAllAppleTransactions(originalTransactionId: string, appleToken: string): Promise<string[]> {
    const allTransactions: string[] = [];
    let revision: string | undefined;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const history = await this.fetchAppleTransactionPage(originalTransactionId, appleToken, revision);
      if (!history?.signedTransactions) {
        break;
      }
      allTransactions.push(...history.signedTransactions);
      if (!history.hasMore || !history.revision) {
        break;
      }
      revision = history.revision;
    }

    return allTransactions;
  }

  private async fetchAppleTransactionPage(
    originalTransactionId: string,
    appleToken: string,
    revision?: string
  ): Promise<IAppleTransactionHistory | undefined> {
    try {
      let url = `https://api.storekit.itunes.apple.com/inApps/v1/history/${originalTransactionId}`;
      if (revision) {
        url += `?revision=${revision}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${appleToken}`,
          "User-Agent": "Liftosaur/1.0",
        },
        signal: controller.signal as never,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.di.log.log(
          `Reconciler: Failed to get Apple transaction history for ${originalTransactionId}: ${response.status}`
        );
        return undefined;
      }

      return (await response.json()) as IAppleTransactionHistory;
    } catch (error) {
      this.di.log.log(`Reconciler: Error getting Apple transaction history for ${originalTransactionId}:`, error);
      return undefined;
    }
  }

  private async reconcileGoogle(
    subscriptions: ISubscriptionDetailsDao[],
    existingTxIds: Set<string>,
    result: IReconciliationResult
  ): Promise<void> {
    this.di.log.log(`Reconciler: Reconciling ${subscriptions.length} Google subscriptions`);

    const seen = new Set<string>();
    const uniqueSubscriptions = subscriptions.filter((s) => {
      if (seen.has(s.originalTransactionId!)) {
        return false;
      }
      seen.add(s.originalTransactionId!);
      return true;
    });

    const validSubscriptions = uniqueSubscriptions.filter((sub) => {
      const productId = GOOGLE_PRODUCT_IDS[sub.product];
      if (!productId) {
        result.errors.push(`Google: Unknown product "${sub.product}" for user ${sub.userId}`);
        return false;
      }
      return true;
    });

    result.googleSubscriptionsChecked += uniqueSubscriptions.length;
    this.di.log.log(`Reconciler: Checking ${validSubscriptions.length} Google subscriptions for missing renewals`);

    const BATCH_SIZE = 10;
    for (let batchStart = 0; batchStart < validSubscriptions.length; batchStart += BATCH_SIZE) {
      const batch = validSubscriptions.slice(batchStart, batchStart + BATCH_SIZE);
      this.di.log.log(
        `Reconciler: Google batch [${batchStart + 1}-${batchStart + batch.length}/${validSubscriptions.length}]`
      );

      const batchResults = await Promise.all(
        batch.map((sub) => this.reconcileOneGoogleSub(sub, existingTxIds))
      );

      for (const br of batchResults) {
        result.googlePaymentsAdded += br.added;
        if (br.error) {
          result.errors.push(br.error);
        }
      }
    }
  }

  private async reconcileOneGoogleSub(
    sub: ISubscriptionDetailsDao,
    existingTxIds: Set<string>
  ): Promise<{ added: number; error?: string }> {
    try {
      const purchaseToken = sub.originalTransactionId!;
      const productId = GOOGLE_PRODUCT_IDS[sub.product]!;

      const purchaseDetails = await this.subscriptionsUtil.getGooglePurchaseTokenJson(purchaseToken, productId);
      if (!purchaseDetails || "error" in purchaseDetails) {
        return {
          added: 0,
          error: `Google: Failed to verify token for user ${sub.userId}: ${JSON.stringify(purchaseDetails)}`,
        };
      }

      if (purchaseDetails.kind === "androidpublisher#productPurchase") {
        return this.reconcileGoogleProduct(sub, purchaseDetails, existingTxIds);
      }

      return this.reconcileGoogleSubscription(sub, purchaseDetails, purchaseToken, productId, existingTxIds);
    } catch (error) {
      return { added: 0, error: `Google ${sub.originalTransactionId}: ${error}` };
    }
  }

  private async reconcileGoogleProduct(
    sub: ISubscriptionDetailsDao,
    purchaseDetails: { purchaseTimeMillis: number; orderId: string; kind: "androidpublisher#productPurchase" },
    existingTxIds: Set<string>
  ): Promise<{ added: number; error?: string }> {
    const orderId = purchaseDetails.orderId;
    if (!orderId || existingTxIds.has(orderId)) {
      return { added: 0 };
    }
    if (Number(purchaseDetails.purchaseTimeMillis) < PAYMENT_TRACKING_START) {
      return { added: 0 };
    }

    let amount = 0;
    let tax: number | undefined;
    let currency = "USD";
    const orderInfo = await this.subscriptionsUtil.getGoogleOrderInfo(orderId);
    if (orderInfo?.total) {
      amount = convertGooglePriceToNumber(orderInfo.total);
      currency = orderInfo.total.currencyCode || "USD";
    }
    if (orderInfo?.tax) {
      tax = convertGooglePriceToNumber(orderInfo.tax);
    }

    if (this.dryRun) {
      this.di.log.log(
        `Reconciler [DRY RUN]: Would add Google product payment ${orderId} for user ${sub.userId}, amount: ${amount} ${currency}`
      );
    } else {
      await this.paymentDao.addIfNotExists({
        userId: sub.userId,
        timestamp: Number(purchaseDetails.purchaseTimeMillis),
        originalTransactionId: sub.originalTransactionId!,
        transactionId: orderId,
        productId: GOOGLE_PRODUCT_IDS[sub.product]!,
        amount,
        tax,
        currency,
        type: "google",
        source: "reconciler",
        paymentType: "purchase",
        isFreeTrialPayment: false,
        subscriptionStartTimestamp: Number(purchaseDetails.purchaseTimeMillis),
      });
      this.di.log.log(`Reconciler: Added Google product payment ${orderId} for user ${sub.userId}`);
    }
    return { added: 1 };
  }

  // Google renewal orderIds follow: GPA.xxxx (initial), GPA.xxxx..0 (1st renewal), GPA.xxxx..1, etc.
  private async reconcileGoogleSubscription(
    sub: ISubscriptionDetailsDao,
    purchaseDetails: {
      orderId: string;
      priceCurrencyCode: string;
      priceAmountMicros: string;
      startTimeMillis: string;
      linkedPurchaseToken?: string;
      paymentState?: number;
      introductoryPriceInfo?: { introductoryPriceAmountMicros?: string };
      kind: "androidpublisher#subscriptionPurchase";
    },
    purchaseToken: string,
    productId: string,
    existingTxIds: Set<string>
  ): Promise<{ added: number; error?: string }> {
    const currentOrderId = purchaseDetails.orderId;
    if (!currentOrderId) {
      return { added: 0 };
    }

    const originalTransactionId = purchaseDetails.linkedPurchaseToken || purchaseToken;
    const subscriptionStartTimestamp =
      purchaseDetails.startTimeMillis != null ? Number(purchaseDetails.startTimeMillis) : undefined;
    const isFreeTrialPayment =
      purchaseDetails.paymentState === 2 ||
      purchaseDetails.introductoryPriceInfo?.introductoryPriceAmountMicros === "0";

    const baseOrderId = currentOrderId.replace(/\.\.\d+$/, "");
    const renewalMatch = currentOrderId.match(/\.\.(\d+)$/);
    const latestRenewalIndex = renewalMatch ? parseInt(renewalMatch[1], 10) : -1;

    // Enumerate: base order (initial purchase) + all renewals ..0 through ..N
    const orderIds: { orderId: string; paymentType: "purchase" | "renewal" }[] = [
      { orderId: baseOrderId, paymentType: "purchase" },
    ];
    for (let i = 0; i <= latestRenewalIndex; i++) {
      orderIds.push({ orderId: `${baseOrderId}..${i}`, paymentType: "renewal" });
    }

    let added = 0;
    for (const { orderId, paymentType } of orderIds) {
      if (existingTxIds.has(orderId)) {
        continue;
      }

      const orderInfo = await this.subscriptionsUtil.getGoogleOrderInfo(orderId);
      if (!orderInfo) {
        continue;
      }

      const timestamp = orderInfo.purchaseTime
        ? orderInfo.purchaseTime
        : orderInfo.createTime
          ? new Date(orderInfo.createTime).getTime()
          : Date.now();
      if (timestamp < PAYMENT_TRACKING_START) {
        continue;
      }

      let amount = 0;
      let tax: number | undefined;
      let currency = purchaseDetails.priceCurrencyCode || "USD";
      let offerIdentifier: string | undefined;
      if (orderInfo.total) {
        amount = convertGooglePriceToNumber(orderInfo.total);
        currency = orderInfo.total.currencyCode || currency;
      }
      if (orderInfo.tax) {
        tax = convertGooglePriceToNumber(orderInfo.tax);
      }
      if (orderInfo.lineItems?.[0]?.subscriptionDetails?.offerId) {
        offerIdentifier = orderInfo.lineItems[0].subscriptionDetails.offerId;
      }

      added += 1;
      if (this.dryRun) {
        this.di.log.log(
          `Reconciler [DRY RUN]: Would add Google ${paymentType} ${orderId} for user ${sub.userId}, amount: ${amount} ${currency}`
        );
      } else {
        await this.paymentDao.addIfNotExists({
          userId: sub.userId,
          timestamp,
          originalTransactionId,
          transactionId: orderId,
          productId,
          amount,
          tax,
          currency,
          type: "google",
          source: "reconciler",
          paymentType,
          isFreeTrialPayment: paymentType === "purchase" && isFreeTrialPayment,
          subscriptionStartTimestamp,
          offerIdentifier,
        });
        this.di.log.log(`Reconciler: Added Google ${paymentType} ${orderId} for user ${sub.userId}`);
      }
    }

    return { added };
  }
}
