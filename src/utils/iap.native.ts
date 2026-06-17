import { Platform } from "react-native";
import {
  initConnection,
  endConnection,
  fetchProducts,
  getAvailablePurchases,
  getActiveSubscriptions,
  finishTransaction,
  getReceiptDataIOS,
  getReceiptIOS,
  presentCodeRedemptionSheetIOS,
  purchaseUpdatedListener,
  purchaseErrorListener,
  requestPurchase,
  showManageSubscriptionsIOS,
  deepLinkToSubscriptions,
  type Product,
  type ProductSubscription,
  type Purchase,
  type PurchaseAndroid,
} from "react-native-iap";
import {
  IIapActiveSubscription,
  IIapAdapter,
  IIapApplePromoOffer,
  IIapInAppProduct,
  IIapPurchase,
  IIapPurchaseError,
  IIapRequestSubscriptionArgs,
  IIapSubscriptionProduct,
} from "./iapAdapter";
import { IapHelpers_getSkus } from "./iapHelpers";

const APPLE_KEY_IDENTIFIER = "CNHQ5ZL35U";

interface IPriceCacheEntry {
  price?: number;
  currency?: string;
}

function toIapPurchase(purchase: Purchase, priceCache: Map<string, IPriceCacheEntry>): IIapPurchase {
  const token = (purchase as PurchaseAndroid).purchaseToken ?? purchase.purchaseToken ?? undefined;
  const iosCurrency = (purchase as { currencyCodeIOS?: string | null }).currencyCodeIOS ?? undefined;
  const cached = priceCache.get(purchase.productId);
  const renewalInfoIOS = (
    purchase as { renewalInfoIOS?: { autoRenewPreference?: string | null; pendingUpgradeProductId?: string | null } }
  ).renewalInfoIOS;
  const renewsAs = renewalInfoIOS?.autoRenewPreference ?? renewalInfoIOS?.pendingUpgradeProductId ?? undefined;
  return {
    id: purchase.id,
    transactionId: purchase.transactionId ?? undefined,
    // `||` on purpose: 0 means "date unknown", and unknown must skip the staleness check rather
    // than read as epoch-1970-stale - otherwise a library quirk emitting 0 dates would silently
    // drop every purchase event. Unknown-date transactions are still deduped by transaction id.
    transactionDate: purchase.transactionDate || undefined,
    productId: purchase.productId,
    purchaseToken: token ?? undefined,
    currency: iosCurrency ?? cached?.currency,
    price: cached?.price,
    renewsAsProductId: renewsAs && renewsAs !== purchase.productId ? renewsAs : undefined,
  };
}

function toIapSubscriptionProduct(p: ProductSubscription): IIapSubscriptionProduct {
  return {
    id: p.id,
    displayPrice: p.displayPrice,
    subscriptionOffers: (p.subscriptionOffers ?? [])
      .filter((o) => !!o.id)
      .map((o) => ({
        id: o.id,
        displayPrice: o.displayPrice,
        offerTokenAndroid: o.offerTokenAndroid ?? undefined,
      })),
  };
}

function toIapInAppProduct(p: Product): IIapInAppProduct {
  return { id: p.id, displayPrice: p.displayPrice };
}

function applePromoToWithOffer(promo: IIapApplePromoOffer | undefined): {
  identifier: string;
  keyIdentifier: string;
  nonce: string;
  signature: string;
  timestamp: number;
} | null {
  if (!promo) {
    return null;
  }
  return {
    identifier: promo.identifier,
    keyIdentifier: promo.keyIdentifier ?? APPLE_KEY_IDENTIFIER,
    nonce: promo.nonce,
    signature: promo.signature,
    timestamp: promo.timestamp,
  };
}

export class IapAdapter implements IIapAdapter {
  private cachedSubscriptions: IIapSubscriptionProduct[] = [];
  private readonly priceCache: Map<string, IPriceCacheEntry> = new Map();

  private cachePrice(id: string, price: number | null | undefined, currency: string | null | undefined): void {
    const numericPrice = typeof price === "number" ? price : undefined;
    const c = typeof currency === "string" && currency.length > 0 ? currency : undefined;
    if (numericPrice == null && c == null) {
      return;
    }
    // Merge, not clobber: a currency-only (or price-only) update must not drop the other field that
    // a previous fetch already learned.
    const existing = this.priceCache.get(id);
    this.priceCache.set(id, { price: numericPrice ?? existing?.price, currency: c ?? existing?.currency });
  }

  public async initConnection(): Promise<void> {
    await initConnection();
  }

  public async endConnection(): Promise<void> {
    await endConnection();
  }

  public async fetchSubscriptions(skus: string[]): Promise<IIapSubscriptionProduct[]> {
    const result = (await fetchProducts({ skus, type: "subs" })) as ProductSubscription[] | null;
    (result ?? []).forEach((p) => this.cachePrice(p.id, p.price, p.currency));
    const mapped = (result ?? []).map(toIapSubscriptionProduct);
    this.cachedSubscriptions = mapped;
    return mapped;
  }

  public async fetchInAppProducts(skus: string[]): Promise<IIapInAppProduct[]> {
    const result = (await fetchProducts({ skus, type: "in-app" })) as Product[] | null;
    (result ?? []).forEach((p) => {
      const currency = (p as { currency?: string | null }).currency ?? null;
      this.cachePrice(p.id, (p as { price?: number | null }).price, currency);
    });
    return (result ?? []).map(toIapInAppProduct);
  }

  public async getProductPrice(productId: string): Promise<{ price?: number; currency?: string }> {
    const cached = this.priceCache.get(productId);
    if (cached?.price != null) {
      return { price: cached.price, currency: cached.currency };
    }
    // A re-delivered purchase arrives before the paywall fetched prices, so warm the cache now by
    // fetching the one product. lifetime is a one-time in-app product; monthly/yearly are subs.
    if (productId === IapHelpers_getSkus().lifetime) {
      await this.fetchInAppProducts([productId]);
    } else {
      await this.fetchSubscriptions([productId]);
    }
    const refreshed = this.priceCache.get(productId);
    return { price: refreshed?.price, currency: refreshed?.currency };
  }

  public async getAvailablePurchases(): Promise<IIapPurchase[]> {
    const result = await getAvailablePurchases();
    return (result ?? []).map((p) => toIapPurchase(p, this.priceCache));
  }

  public async getActiveSubscriptions(): Promise<IIapActiveSubscription[]> {
    const result = await getActiveSubscriptions();
    return (result ?? []).map((s) => {
      const renewsAs = s.renewalInfoIOS?.autoRenewPreference ?? s.renewalInfoIOS?.pendingUpgradeProductId ?? undefined;
      return {
        productId: s.productId,
        isActive: s.isActive,
        autoRenew: s.autoRenewingAndroid ?? s.renewalInfoIOS?.willAutoRenew ?? true,
        expirationDate: s.expirationDateIOS ?? undefined,
        purchaseTokenAndroid: s.purchaseTokenAndroid ?? undefined,
        pendingProductId: renewsAs && renewsAs !== s.productId ? renewsAs : undefined,
      };
    });
  }

  public async requestSubscription(args: IIapRequestSubscriptionArgs): Promise<void> {
    // A plan switch reuses the old purchase token. The switching user already consumed their intro,
    // so an intro/discount offer is ineligible and Play rejects it with DEVELOPER_ERROR — use the
    // base-plan offer for switches.
    const isReplacement = !!(args.androidOldPurchaseToken && args.androidReplacementMode);
    const offerToken = this.findGoogleOfferToken(args.sku, args.googleOfferId, isReplacement);
    const google: {
      skus: string[];
      subscriptionOffers: { sku: string; offerToken: string }[];
      purchaseToken?: string;
      replacementMode?: number;
    } = {
      skus: [args.sku],
      subscriptionOffers: offerToken ? [{ sku: args.sku, offerToken }] : [],
    };
    if (args.androidOldPurchaseToken && args.androidReplacementMode) {
      google.purchaseToken = args.androidOldPurchaseToken;
      // Google Play BillingFlowParams.SubscriptionUpdateParams.ReplacementMode enum values. Use the
      // top-level (whole-subscription) replacement API, not item-level subscriptionProductReplacementParams.
      google.replacementMode = args.androidReplacementMode === "deferred" ? 6 : 1; // 6=DEFERRED, 1=WITH_TIME_PRORATION
    }
    await requestPurchase({
      type: "subs",
      request: {
        apple: {
          sku: args.sku,
          withOffer: applePromoToWithOffer(args.applePromo),
        },
        google,
      },
    });
  }

  public async openManageSubscriptions(): Promise<void> {
    if (Platform.OS === "ios") {
      await showManageSubscriptionsIOS();
    } else {
      await deepLinkToSubscriptions({});
    }
  }

  public async requestInAppProduct(args: { sku: string }): Promise<void> {
    await requestPurchase({
      type: "in-app",
      request: {
        apple: { sku: args.sku },
        google: { skus: [args.sku] },
      },
    });
  }

  public async finishTransaction(purchase: IIapPurchase): Promise<void> {
    await finishTransaction({
      // purchaseToken is required on Android - without it the purchase is never acknowledged,
      // and Google auto-refunds unacknowledged purchases after 3 days
      purchase: {
        id: purchase.id,
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        purchaseToken: purchase.purchaseToken,
      } as Purchase,
      isConsumable: false,
    });
  }

  public async getReceiptDataIOS(): Promise<string | undefined> {
    try {
      const r = await getReceiptDataIOS();
      return r || undefined;
    } catch {
      return undefined;
    }
  }

  public async getReceiptIOS(): Promise<string | undefined> {
    try {
      const r = await getReceiptIOS();
      return r || undefined;
    } catch {
      return undefined;
    }
  }

  public async presentCodeRedemptionSheetIOS(): Promise<boolean> {
    try {
      return await presentCodeRedemptionSheetIOS();
    } catch (e) {
      console.warn("IAP presentCodeRedemptionSheetIOS failed", e);
      return false;
    }
  }

  public onPurchaseUpdated(handler: (purchase: IIapPurchase) => void | Promise<void>): () => void {
    const handled = new Set<string>();
    const sub = purchaseUpdatedListener(async (p) => {
      const purchase = toIapPurchase(p, this.priceCache);
      const txnId = purchase.transactionId ?? purchase.id;
      // Key on the queued plan switch too: a switch re-delivers the existing transaction (same id,
      // also replayed on launch) but now with renewsAsProductId set, and we must process that to
      // clear the spinner — deduping on id alone would drop it. StoreKit Testing also reuses
      // transactionId "0" across distinct transactions, so don't dedupe that degenerate id at all.
      const dedupKey = `${txnId}:${purchase.renewsAsProductId ?? ""}`;
      if (txnId && txnId !== "0") {
        if (handled.has(dedupKey)) {
          return;
        }
        handled.add(dedupKey);
        setTimeout(() => handled.delete(dedupKey), 5 * 60 * 1000);
      }
      await handler(purchase);
    });
    return () => sub.remove();
  }

  public onPurchaseError(handler: (error: IIapPurchaseError) => void | Promise<void>): () => void {
    const sub = purchaseErrorListener((e: { code?: string; message?: string; productId?: string | null }) =>
      handler({
        code: e.code ?? "unknown",
        message: e.message ?? "",
        productId: e.productId ?? undefined,
      } as IIapPurchaseError)
    );
    return () => sub.remove();
  }

  private findGoogleOfferToken(sku: string, offerId?: string, preferBase?: boolean): string | undefined {
    const sub = this.cachedSubscriptions.find((s) => s.id === sku);
    const offers = sub?.subscriptionOffers ?? [];
    if (offerId) {
      const matched = offers.find((o) => o.id === offerId);
      if (matched?.offerTokenAndroid) {
        return matched.offerTokenAndroid;
      }
    }
    if (preferBase) {
      const base = offers.find((o) => o.id.indexOf("base") !== -1);
      if (base?.offerTokenAndroid) {
        return base.offerTokenAndroid;
      }
    }
    const trial = offers.find((o) => o.id === "monthly-subscription-trial" || o.id === "yearly-subscription-trial");
    return trial?.offerTokenAndroid ?? offers[0]?.offerTokenAndroid ?? undefined;
  }
}
