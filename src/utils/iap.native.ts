import { Platform } from "react-native";
import {
  initConnection,
  endConnection,
  fetchProducts,
  getAvailablePurchases,
  finishTransaction,
  getReceiptDataIOS,
  getReceiptIOS,
  purchaseUpdatedListener,
  purchaseErrorListener,
  requestPurchase,
  type EventSubscription,
  type Product,
  type ProductSubscription,
  type Purchase,
  type PurchaseAndroid,
} from "react-native-iap";
import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { IApplePromotionalOffer, IGooglePromotionalOffer, IOfferData, IState, updateState } from "../models/state";
import { Thunk_setAppleReceipt, Thunk_setGooglePurchaseToken } from "../ducks/thunks";
import { Dialog_alert } from "./dialog";

export interface IAPSubscribeArgs {
  applePromo?: IApplePromotionalOffer;
  googlePromo?: IGooglePromotionalOffer;
}

const APPLE_KEY_IDENTIFIER = "CNHQ5ZL35U";

const SKUS =
  Platform.OS === "ios"
    ? {
        monthly: "com.liftosaur.subscription.ios_montly",
        yearly: "com.liftosaur.subscription.ios_yearly",
        lifetime: "com.liftosaur.subscription.ios_lifetime",
      }
    : {
        monthly: "com.liftosaur.subscription.and_montly",
        yearly: "com.liftosaur.subscription.and_yearly",
        lifetime: "com.liftosaur.subscription.and_lifetime",
      };

let _initialized = false;
let _purchaseUpdatedSub: EventSubscription | undefined;
let _purchaseErrorSub: EventSubscription | undefined;
let _dispatchRef: IDispatch | undefined;
let _subscriptions: ProductSubscription[] = [];
const _handledTransactionIds = new Set<string>();
const HANDLED_TRANSACTION_RETENTION_MS = 5 * 60 * 1000;

function clearLoading(dispatch: IDispatch): void {
  updateState(dispatch, [lb<IState>().p("subscriptionLoading").record(undefined)], "Stop subscription loading");
}

async function readAppStoreReceiptIOS(): Promise<string | undefined> {
  try {
    const receipt = await getReceiptDataIOS();
    if (receipt) return receipt;
  } catch (e) {
    console.warn("getReceiptDataIOS failed, falling back to refresh", e);
  }
  try {
    const receipt = await getReceiptIOS();
    if (receipt) return receipt;
  } catch (e) {
    console.warn("getReceiptIOS (refresh) failed", e);
  }
  return undefined;
}

async function readReceiptOrJwsIOS(purchase?: Purchase): Promise<string | undefined> {
  const legacy = await readAppStoreReceiptIOS();
  if (legacy) {
    console.log("IAP: using legacy App Store receipt", legacy.slice(0, 32) + "...");
    return legacy;
  }
  const jws = purchase?.purchaseToken ?? undefined;
  if (jws) {
    console.log("IAP: legacy receipt unavailable, falling back to JWS", jws.slice(0, 32) + "...");
    return jws;
  }
  console.warn("IAP: no receipt nor JWS available for this purchase", purchase);
  return undefined;
}

async function dispatchReceiptForPurchase(dispatch: IDispatch, purchase: Purchase): Promise<void> {
  if (Platform.OS === "ios") {
    const receipt = await readReceiptOrJwsIOS(purchase);
    if (receipt) {
      console.log("IAP: dispatching Thunk_setAppleReceipt");
      dispatch(Thunk_setAppleReceipt(receipt));
    } else {
      console.warn("IAP: no receipt obtained for purchase, server will not be notified");
    }
  } else {
    const productId = purchase.productId;
    const token = (purchase as PurchaseAndroid).purchaseToken ?? purchase.purchaseToken ?? undefined;
    if (productId && token) {
      dispatch(Thunk_setGooglePurchaseToken(productId, token));
    }
  }
}

export async function IAP_initConnection(dispatch: IDispatch): Promise<void> {
  _dispatchRef = dispatch;
  if (_initialized) {
    return;
  }
  try {
    await initConnection();
  } catch (e) {
    console.warn("IAP initConnection failed", e);
    return;
  }
  _purchaseUpdatedSub = purchaseUpdatedListener(async (purchase: Purchase) => {
    const d = _dispatchRef;
    if (!d) {
      return;
    }
    const txnId = purchase.transactionId ?? purchase.id;
    if (txnId) {
      if (_handledTransactionIds.has(txnId)) {
        console.log("IAP: skipping duplicate purchase event for transaction", txnId);
        return;
      }
      _handledTransactionIds.add(txnId);
      setTimeout(() => _handledTransactionIds.delete(txnId), HANDLED_TRANSACTION_RETENTION_MS);
    }
    try {
      await dispatchReceiptForPurchase(d, purchase);
    } finally {
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch (e) {
        console.warn("IAP finishTransaction failed", e);
      }
      clearLoading(d);
    }
  });
  _purchaseErrorSub = purchaseErrorListener((err) => {
    console.warn("IAP purchase error", err);
    if (_dispatchRef) {
      clearLoading(_dispatchRef);
    }
  });
  _initialized = true;
}

export async function IAP_endConnection(): Promise<void> {
  _purchaseUpdatedSub?.remove();
  _purchaseErrorSub?.remove();
  _purchaseUpdatedSub = undefined;
  _purchaseErrorSub = undefined;
  _initialized = false;
  _dispatchRef = undefined;
  try {
    await endConnection();
  } catch (e) {
    console.warn("IAP endConnection failed", e);
  }
}

export async function IAP_fetchProducts(dispatch: IDispatch): Promise<void> {
  try {
    const subsResult = (await fetchProducts({
      skus: [SKUS.monthly, SKUS.yearly],
      type: "subs",
    })) as ProductSubscription[] | null;
    const inAppResult = (await fetchProducts({
      skus: [SKUS.lifetime],
      type: "in-app",
    })) as Product[] | null;
    _subscriptions = subsResult ?? [];

    const newPrices: Record<string, string> = {};
    const newOffers: Record<string, IOfferData[]> = {};

    for (const s of _subscriptions) {
      newPrices[s.id] = s.displayPrice;
      const offers = s.subscriptionOffers ?? [];
      const mapped: IOfferData[] = offers
        .filter((o) => !!o.id)
        .map((o) => ({ offerId: o.id, formattedPrice: o.displayPrice }));
      if (mapped.length > 0) {
        newOffers[s.id] = mapped;
      }
    }
    for (const p of inAppResult ?? []) {
      newPrices[p.id] = p.displayPrice;
    }

    updateState(
      dispatch,
      [
        lb<IState>()
          .p("prices")
          .recordModify((v) => ({ ...(v ?? {}), ...newPrices })),
        lb<IState>()
          .p("offers")
          .recordModify((v) => ({ ...(v ?? {}), ...newOffers })),
      ],
      "Update prices for products"
    );
  } catch (e) {
    console.warn("IAP fetchProducts failed", e);
  }
}

function buildIosOffer(promo?: IApplePromotionalOffer): IRequestPurchaseIOSOffer | undefined {
  if (!promo) {
    return undefined;
  }
  return {
    identifier: promo.offerId,
    keyIdentifier: APPLE_KEY_IDENTIFIER,
    nonce: promo.nonce,
    signature: promo.signature,
    timestamp: promo.timestamp,
  };
}

interface IRequestPurchaseIOSOffer {
  identifier: string;
  keyIdentifier: string;
  nonce: string;
  signature: string;
  timestamp: number;
}

function findAndroidOfferToken(productId: string, promo?: IGooglePromotionalOffer): string | undefined {
  const sub = _subscriptions.find((s) => s.id === productId);
  const offers = sub?.subscriptionOffers ?? [];
  if (promo?.offerId) {
    const matched = offers.find((o) => o.id === promo.offerId);
    if (matched?.offerTokenAndroid) {
      return matched.offerTokenAndroid;
    }
  }
  const trial = offers.find((o) => o.id === "monthly-subscription-trial" || o.id === "yearly-subscription-trial");
  return trial?.offerTokenAndroid ?? offers[0]?.offerTokenAndroid ?? undefined;
}

async function hasActiveStorePurchase(): Promise<boolean> {
  try {
    const purchases = await getAvailablePurchases();
    return (purchases?.length ?? 0) > 0;
  } catch (e) {
    console.warn("hasActiveStorePurchase check failed", e);
    return false;
  }
}

function alertAlreadySubscribed(): void {
  Dialog_alert(
    "You already have an active Liftosaur Premium purchase on this account. Manage or change your plan from your App Store / Play Store subscriptions."
  );
}

async function subscribeSku(sku: string, args?: IAPSubscribeArgs): Promise<void> {
  if (await hasActiveStorePurchase()) {
    alertAlreadySubscribed();
    if (_dispatchRef) {
      clearLoading(_dispatchRef);
    }
    return;
  }
  const offerToken = Platform.OS === "android" ? findAndroidOfferToken(sku, args?.googlePromo) : undefined;
  try {
    await requestPurchase({
      type: "subs",
      request: {
        apple: {
          sku,
          withOffer: buildIosOffer(args?.applePromo) ?? null,
        },
        google: {
          skus: [sku],
          subscriptionOffers: offerToken ? [{ sku, offerToken }] : [],
        },
      },
    });
  } catch (e) {
    if (_dispatchRef) {
      clearLoading(_dispatchRef);
    }
    console.warn("IAP requestPurchase (subs) failed", e);
  }
}

export async function IAP_subscribeMonthly(args?: IAPSubscribeArgs): Promise<void> {
  await subscribeSku(SKUS.monthly, args);
}

export async function IAP_subscribeYearly(args?: IAPSubscribeArgs): Promise<void> {
  await subscribeSku(SKUS.yearly, args);
}

export async function IAP_buyLifetime(): Promise<void> {
  if (await hasActiveStorePurchase()) {
    alertAlreadySubscribed();
    if (_dispatchRef) {
      clearLoading(_dispatchRef);
    }
    return;
  }
  try {
    await requestPurchase({
      type: "in-app",
      request: {
        apple: { sku: SKUS.lifetime },
        google: { skus: [SKUS.lifetime] },
      },
    });
  } catch (e) {
    if (_dispatchRef) {
      clearLoading(_dispatchRef);
    }
    console.warn("IAP requestPurchase (lifetime) failed", e);
  }
}

export async function IAP_restorePurchases(dispatch?: IDispatch): Promise<void> {
  const d = dispatch ?? _dispatchRef;
  try {
    const purchases = await getAvailablePurchases();
    if (Platform.OS === "ios") {
      if (d && (purchases?.length ?? 0) > 0) {
        const receipt = await readReceiptOrJwsIOS(purchases?.[0]);
        if (receipt) {
          d(Thunk_setAppleReceipt(receipt));
        }
      }
    } else {
      for (const purchase of purchases ?? []) {
        const productId = purchase.productId;
        const token = (purchase as PurchaseAndroid).purchaseToken ?? purchase.purchaseToken ?? undefined;
        if (d && productId && token) {
          d(Thunk_setGooglePurchaseToken(productId, token));
        }
      }
    }
  } catch (e) {
    console.warn("IAP restorePurchases failed", e);
  }
}
