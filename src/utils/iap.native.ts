import {
  initConnection,
  endConnection,
  fetchProducts,
  getAvailablePurchases,
  finishTransaction,
  getReceiptDataIOS,
  getReceiptIOS,
  presentCodeRedemptionSheetIOS,
  purchaseUpdatedListener,
  purchaseErrorListener,
  requestPurchase,
  type Product,
  type ProductSubscription,
  type Purchase,
  type PurchaseAndroid,
} from "react-native-iap";
import {
  IIapAdapter,
  IIapApplePromoOffer,
  IIapInAppProduct,
  IIapPurchase,
  IIapPurchaseError,
  IIapRequestSubscriptionArgs,
  IIapSubscriptionProduct,
} from "./iapAdapter";

const APPLE_KEY_IDENTIFIER = "CNHQ5ZL35U";

interface IPriceCacheEntry {
  price?: number;
  currency?: string;
}

function toIapPurchase(purchase: Purchase, priceCache: Map<string, IPriceCacheEntry>): IIapPurchase {
  const token = (purchase as PurchaseAndroid).purchaseToken ?? purchase.purchaseToken ?? undefined;
  const iosCurrency = (purchase as { currencyCodeIOS?: string | null }).currencyCodeIOS ?? undefined;
  const cached = priceCache.get(purchase.productId);
  return {
    id: purchase.id,
    transactionId: purchase.transactionId ?? undefined,
    productId: purchase.productId,
    purchaseToken: token ?? undefined,
    currency: iosCurrency ?? cached?.currency,
    price: cached?.price,
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
    this.priceCache.set(id, { price: numericPrice, currency: c });
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

  public async getAvailablePurchases(): Promise<IIapPurchase[]> {
    const result = await getAvailablePurchases();
    return (result ?? []).map((p) => toIapPurchase(p, this.priceCache));
  }

  public async requestSubscription(args: IIapRequestSubscriptionArgs): Promise<void> {
    const offerToken = this.findGoogleOfferToken(args.sku, args.googleOfferId);
    await requestPurchase({
      type: "subs",
      request: {
        apple: {
          sku: args.sku,
          withOffer: applePromoToWithOffer(args.applePromo),
        },
        google: {
          skus: [args.sku],
          subscriptionOffers: offerToken ? [{ sku: args.sku, offerToken }] : [],
        },
      },
    });
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
      if (txnId) {
        if (handled.has(txnId)) {
          return;
        }
        handled.add(txnId);
        setTimeout(() => handled.delete(txnId), 5 * 60 * 1000);
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

  private findGoogleOfferToken(sku: string, offerId?: string): string | undefined {
    const sub = this.cachedSubscriptions.find((s) => s.id === sku);
    const offers = sub?.subscriptionOffers ?? [];
    if (offerId) {
      const matched = offers.find((o) => o.id === offerId);
      if (matched?.offerTokenAndroid) {
        return matched.offerTokenAndroid;
      }
    }
    const trial = offers.find((o) => o.id === "monthly-subscription-trial" || o.id === "yearly-subscription-trial");
    return trial?.offerTokenAndroid ?? offers[0]?.offerTokenAndroid ?? undefined;
  }
}
