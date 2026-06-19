import { Platform } from "react-native";
import appsFlyer, { ConversionData } from "react-native-appsflyer";
import { createMMKV } from "react-native-mmkv";
import { IAttributionData } from "../models/state";

const APPSFLYER_DEV_KEY = "7WaUEAvZKS2HaM3Nmtt5B4";
const APPLE_APP_ID = "1661880849";

const TRACKED_PURCHASES_KEY = "trackedPurchaseTransactionIds";
const TRACKED_PURCHASES_MAX = 500;
// Wide enough that renewals/trial conversions delivered on the user's next app open still count
// (transactions billed in background arrive with their original date), narrow enough that a
// restore on a fresh install can only replay the last month, once.
const STALE_PURCHASE_MS = 30 * 24 * 60 * 60 * 1000;

export interface IAnalyticsPurchaseEvent {
  productId: string;
  price: number;
  currency: string;
  transactionId?: string;
  transactionDate?: number;
}

export interface IAnalyticsInitOptions {
  userId?: string;
  onAttribution: (data: IAttributionData) => void;
  onLandingPage?: (landingPage: string) => void;
}

let initialized = false;

// On a deferred deep link (first install) AppsFlyer only delivers deep_link_value/deep_link_sub1, not
// media_source/campaign. We put the bare page id in deep_link_value and the type in deep_link_sub1 (see
// Platform_landingPageParams); reconstruct the path here so it matches the web-cookie landing format.
function landingPageFromDeepLink(data: Record<string, unknown>): string | undefined {
  const value = typeof data.deep_link_value === "string" ? data.deep_link_value : undefined;
  if (!value) {
    return undefined;
  }
  const type = typeof data.deep_link_sub1 === "string" ? data.deep_link_sub1 : undefined;
  if (type === "program") {
    return `/programs/${value}`;
  }
  if (type === "exercise") {
    return `/exercises/${value}`;
  }
  return `/${value}`;
}

export function Analytics_initialize(opts: IAnalyticsInitOptions): () => void {
  if (initialized) {
    return () => undefined;
  }
  initialized = true;

  const unsubscribe = appsFlyer.onInstallConversionData((raw: ConversionData) => {
    if (raw?.status !== "success" || !raw.data) {
      return;
    }
    const status = typeof raw.data.af_status === "string" ? raw.data.af_status : "";
    opts.onAttribution({
      isOrganic: status === "Organic",
      mediaSource: typeof raw.data.media_source === "string" ? raw.data.media_source : "",
      campaign: typeof raw.data.campaign === "string" ? raw.data.campaign : "",
      adSet: typeof raw.data.af_adset === "string" ? raw.data.af_adset : "",
      ad: typeof raw.data.af_ad === "string" ? raw.data.af_ad : "",
    });
  });

  // Must be registered before initSdk so the first (deferred) deep link isn't missed.
  const deepLinkCanceller = appsFlyer.onDeepLink((res) => {
    if (!res || res.deepLinkStatus === "NOT_FOUND" || !res.data) {
      return;
    }
    const landingPage = landingPageFromDeepLink(res.data as unknown as Record<string, unknown>);
    if (landingPage && opts.onLandingPage) {
      opts.onLandingPage(landingPage);
    }
  });

  if (opts.userId) {
    appsFlyer.setCustomerUserId(opts.userId, () => undefined);
  }

  appsFlyer.initSdk(
    {
      devKey: APPSFLYER_DEV_KEY,
      appId: APPLE_APP_ID,
      isDebug: false,
      onInstallConversionDataListener: true,
      onDeepLinkListener: true,
      manualStart: true,
    },
    () => {
      appsFlyer.startSdk();
    },
    () => undefined
  );

  return () => {
    unsubscribe();
    deepLinkCanceller();
  };
}

export function Analytics_setUserId(userId: string): void {
  appsFlyer.setCustomerUserId(userId, () => undefined);
}

export function Analytics_trackFinishWorkout(): void {
  appsFlyer.logEvent("af_add_to_cart", {}).catch(() => undefined);
}

export function Analytics_trackSignUp(): void {
  appsFlyer.logEvent("af_complete_registration", {}).catch(() => undefined);
}

function getTrackedPurchaseIds(): string[] {
  try {
    const mmkv = createMMKV({ id: "liftosaur.analytics" });
    return JSON.parse(mmkv.getString(TRACKED_PURCHASES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function markPurchaseTracked(transactionId: string): void {
  const tracked = getTrackedPurchaseIds();
  if (!tracked.includes(transactionId)) {
    const mmkv = createMMKV({ id: "liftosaur.analytics" });
    mmkv.set(TRACKED_PURCHASES_KEY, JSON.stringify([transactionId, ...tracked].slice(0, TRACKED_PURCHASES_MAX)));
  }
}

export function Analytics_trackPurchase(event: IAnalyticsPurchaseEvent): void {
  // StoreKit re-delivers transactions across launches and replays old ones on restore, so
  // dedup by transaction id (persisted - re-deliveries span sessions) and drop transactions
  // that happened long ago (restores on a fresh install arrive with an empty dedup store).
  if (event.transactionDate != null) {
    // Defensive seconds->ms normalization: a units mismatch would otherwise silently drop
    // every purchase event as stale (epoch seconds ~1.7e9, epoch ms ~1.7e12).
    const transactionDateMs = event.transactionDate < 1e12 ? event.transactionDate * 1000 : event.transactionDate;
    if (Date.now() - transactionDateMs > STALE_PURCHASE_MS) {
      return;
    }
  }
  if (event.transactionId && getTrackedPurchaseIds().includes(event.transactionId)) {
    return;
  }
  const contentType = event.productId.includes("lifetime") ? "one_time_purchase" : "subscription";
  appsFlyer
    .logEvent("af_purchase", {
      af_revenue: event.price,
      af_price: event.price,
      af_currency: event.currency,
      af_purchase_currency: event.currency,
      af_content_id: event.productId,
      af_content_type: contentType,
    })
    .then(() => {
      // Persist only after a successful send - a transaction marked tracked on a failed send
      // (e.g. SDK not started yet) would suppress all future re-delivery retries. Same-session
      // duplicate sends while this promise is in flight are guarded by the in-memory dedup in
      // iap.native.ts onPurchaseUpdated.
      if (event.transactionId) {
        markPurchaseTracked(event.transactionId);
      }
    })
    .catch(() => undefined);
}

export const Analytics_platform = Platform.OS;

export type { IAttributionData };
