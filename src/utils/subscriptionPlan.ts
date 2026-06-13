import { ISubscription } from "../types";
import { IIapActiveSubscription } from "./iapAdapter";
import { Subscriptions_hasSubscription } from "./subscriptions";

export type ISubscriptionPlanState =
  | "none"
  | "loading"
  | "subscriber"
  | "cancelled"
  | "lifetime"
  | "freeaccess"
  | "premium";

export type ISubscriptionPlanKind = "monthly" | "yearly";

export interface IDerivedSubscriptionPlan {
  state: ISubscriptionPlanState;
  plan?: ISubscriptionPlanKind;
  expirationDate?: number;
  autoRenew?: boolean;
  // Set when the user has queued a switch to a different plan that takes effect at expirationDate.
  pendingPlan?: ISubscriptionPlanKind;
}

export function SubscriptionPlan_planFromProductId(productId: string): ISubscriptionPlanKind | undefined {
  if (productId.indexOf("year") !== -1) {
    return "yearly";
  }
  if (productId.indexOf("mont") !== -1) {
    return "monthly";
  }
  return undefined;
}

export function SubscriptionPlan_derive(args: {
  subscription: ISubscription;
  status?: IIapActiveSubscription[];
  ownedLifetime?: boolean;
  isNative: boolean;
}): IDerivedSubscriptionPlan {
  const { subscription, status, ownedLifetime, isNative } = args;

  if (subscription.key && subscription.key !== "unclaimed") {
    return { state: "freeaccess" };
  }

  if (ownedLifetime) {
    return { state: "lifetime" };
  }

  const active = (status ?? []).find((s) => s.isActive);
  if (active) {
    const currentPlan = SubscriptionPlan_planFromProductId(active.productId);
    // iOS reads the queued switch live from StoreKit; Android gets it from the server's subscriptionsv2
    // record patched onto `pendingProductId` in Thunk_iapRefreshActiveSubscriptions. The !== currentPlan
    // guard makes it disappear once the switch lands (server reports the new product).
    const pendingProductId = active.pendingProductId;
    const pendingPlan = pendingProductId ? SubscriptionPlan_planFromProductId(pendingProductId) : undefined;
    return {
      state: active.autoRenew ? "subscriber" : "cancelled",
      plan: currentPlan,
      expirationDate: active.expirationDate,
      autoRenew: active.autoRenew,
      pendingPlan: pendingPlan && pendingPlan !== currentPlan ? pendingPlan : undefined,
    };
  }

  if (Subscriptions_hasSubscription(subscription)) {
    // On native the store status is authoritative, but `undefined` means it hasn't loaded yet (vs `[]` =
    // loaded, no active sub). Reporting "none" then would flash purchase/free UI to an existing subscriber —
    // and persist if getActiveSubscriptions() fails — so report "loading" until the store status arrives.
    if (isNative && status === undefined) {
      return { state: "loading" };
    }
    // Native with a known-empty status means the store has no live entitlement. On web we have no store
    // status at all, so fall back to a generic "premium" state driven by synced receipts.
    return { state: isNative ? "none" : "premium" };
  }

  return { state: "none" };
}
