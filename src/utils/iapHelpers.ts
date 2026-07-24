import { Platform } from "react-native";
import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { IApplePromotionalOffer, ISubscriptionLoading, IState, updateState } from "../models/state";
import { Dialog_alert } from "./dialog";
import { IIapAdapter, IIapApplePromoOffer, IIapPurchase } from "./iapAdapter";

const APPLE_KEY_IDENTIFIER = "CNHQ5ZL35U";

export function IapHelpers_getSkus(): { monthly: string; yearly: string; lifetime: string } {
  return Platform.OS === "ios"
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
}

export function IapHelpers_clearLoading(dispatch: IDispatch): void {
  updateState(dispatch, [lb<IState>().p("subscriptionLoading").record(undefined)], "Stop subscription loading");
}

const SUBSCRIPTION_LOADING_TIMEOUT_MS = 60000;

// Sets the spinner on a plan card and arms a safety timeout: if no purchase/error event clears it
// within the window (e.g. StoreKit never delivers an actionable event), the card can't spin forever.
// Only clears if the same loading object is still active, so it never cancels a newer attempt.
export function IapHelpers_setLoading(
  dispatch: IDispatch,
  getState: () => IState,
  loading: ISubscriptionLoading
): void {
  updateState(dispatch, [lb<IState>().p("subscriptionLoading").record(loading)], "Start subscription loading");
  const timer = setTimeout(() => {
    if (getState().subscriptionLoading === loading) {
      IapHelpers_clearLoading(dispatch);
    }
  }, SUBSCRIPTION_LOADING_TIMEOUT_MS);
  // Don't keep the Node process (tests) alive for the full window; no-op on RN where setTimeout returns a number.
  (timer as unknown as { unref?: () => void }).unref?.();
}

export function IapHelpers_alertAlreadySubscribed(): void {
  Dialog_alert(
    "You already have an active Liftosaur Premium purchase on this account. Manage or change your plan from your App Store / Play Store subscriptions."
  );
}

export function IapHelpers_applePromoToAdapter(promo?: IApplePromotionalOffer): IIapApplePromoOffer | undefined {
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

export async function IapHelpers_readReceiptOrJwsIOS(
  iap: IIapAdapter,
  purchase?: IIapPurchase
): Promise<string | undefined> {
  const jws = purchase?.purchaseToken;
  if (jws) {
    console.log("IAP: using StoreKit 2 JWS", jws.slice(0, 32) + "...");
    return jws;
  }
  const data = await iap.getReceiptDataIOS();
  if (data) {
    console.log("IAP: using legacy App Store receipt", data.slice(0, 32) + "...");
    return data;
  }
  const refreshed = await iap.getReceiptIOS();
  if (refreshed) {
    console.log("IAP: using refreshed legacy receipt", refreshed.slice(0, 32) + "...");
    return refreshed;
  }
  console.warn("IAP: no receipt nor JWS available", purchase);
  return undefined;
}
