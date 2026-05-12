import { Platform } from "react-native";
import appsFlyer, { ConversionData } from "react-native-appsflyer";
import { IAttributionData } from "../models/state";

const APPSFLYER_DEV_KEY = "7WaUEAvZKS2HaM3Nmtt5B4";
const APPLE_APP_ID = "1661880849";

export interface IAnalyticsPurchaseEvent {
  productId: string;
  price: number;
  currency: string;
}

export interface IAnalyticsInitOptions {
  userId?: string;
  onAttribution: (data: IAttributionData) => void;
}

let initialized = false;

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

  if (opts.userId) {
    appsFlyer.setCustomerUserId(opts.userId, () => undefined);
  }

  appsFlyer.initSdk(
    {
      devKey: APPSFLYER_DEV_KEY,
      appId: APPLE_APP_ID,
      isDebug: false,
      onInstallConversionDataListener: true,
      onDeepLinkListener: false,
      timeToWaitForATTUserAuthorization: 10,
      manualStart: true,
    },
    () => {
      appsFlyer.startSdk();
    },
    () => undefined
  );

  return unsubscribe;
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

export function Analytics_trackPurchase(event: IAnalyticsPurchaseEvent): void {
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
    .catch(() => undefined);
}

export const Analytics_platform = Platform.OS;

export type { IAttributionData };
