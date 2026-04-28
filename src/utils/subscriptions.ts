import { Service } from "../api/service";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { ISubscription } from "../types";
import { UidFactory_generateUid } from "./generator";
import { CollectionUtils_removeBy } from "./collection";
import { Thunk_postevent } from "../ducks/thunks";

export function Subscriptions_hasSubscription(subscription: ISubscription): boolean {
  if (subscription.key && subscription.key !== "unclaimed") {
    return true;
  }
  const hasApple = hasAppleSubscription(subscription);
  const hasGoogle = hasGoogleSubscription(subscription);
  return hasApple || hasGoogle;
}

export function Subscriptions_isEligibleForThanksgivingPromo(
  doesHaveWorkouts: boolean,
  subscription: ISubscription
): boolean {
  if (!doesHaveWorkouts) {
    return false;
  }
  if (Subscriptions_hasSubscription(subscription)) {
    return false;
  }
  const today = new Date();
  if ((today.getMonth() === 10 && today.getDate() >= 25) || (today.getMonth() === 11 && today.getDate() <= 3)) {
    return true;
  }
  return false;
}

export function Subscriptions_listOfSubscriptions(subscription: ISubscription): string[] {
  const arr: string[] = [];
  if ((subscription.apple || []).length > 0) {
    arr.push("apple");
  }
  if ((subscription.google || []).length > 0) {
    arr.push("google");
  }
  if (subscription.key === "unclaimed") {
    arr.push("unclaimedkey");
  } else if (subscription.key) {
    arr.push("key");
  }
  return arr;
}

function hasAppleSubscription(subscription: ISubscription): boolean {
  return subscription.apple.length > 0;
}

function hasGoogleSubscription(subscription: ISubscription): boolean {
  return subscription.google.length > 0;
}

export function Subscriptions_setAppleReceipt(dispatch: IDispatch, receipt: string): void {
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("subscription")
        .p("apple")
        .recordModify((v) => {
          if (v.some((s) => s.value === receipt)) {
            dispatch(Thunk_postevent("same-apple-receipt"));
            return v;
          } else {
            dispatch(Thunk_postevent("new-apple-receipt"));
            return [
              ...v,
              {
                vtype: "subscription_receipt",
                value: receipt,
                id: UidFactory_generateUid(6),
                createdAt: Date.now(),
              },
            ];
          }
        }),
    ],
    "Set Apple receipt"
  );
}

export function Subscriptions_setGooglePurchaseToken(dispatch: IDispatch, purchaseToken: string): void {
  updateState(
    dispatch,
    [
      lb<IState>()
        .p("storage")
        .p("subscription")
        .p("google")
        .recordModify((v) => {
          if (v.some((s) => s.value === purchaseToken)) {
            return v;
          } else {
            return [
              ...v,
              {
                vtype: "subscription_receipt",
                value: purchaseToken,
                id: UidFactory_generateUid(6),
                createdAt: Date.now(),
              },
            ];
          }
        }),
    ],
    "Set Google purchase token"
  );
}

export function Subscriptions_cleanupOutdatedAppleReceipts(
  dispatch: IDispatch,
  userId: string,
  service: Service,
  subscription: ISubscription
): Promise<void> {
  return Promise.all(
    subscription.apple.map<Promise<[string, boolean]>>(async (value) => {
      return [value.value, await Subscriptions_verifyAppleReceipt(userId, service, value.value)];
    })
  ).then((results) => {
    const validReceipts = results.filter(([, result]) => result).map(([key]) => key);
    const validReceipt = validReceipts[validReceipts.length - 1];
    if (validReceipt) {
      updateState(
        dispatch,
        [
          lb<IState>()
            .p("storage")
            .p("subscription")
            .p("apple")
            .recordModify((apple) => {
              const existing = apple.find((r) => r.value === validReceipt);
              if (existing) {
                return [existing];
              } else {
                return [
                  {
                    vtype: "subscription_receipt",
                    value: validReceipt,
                    id: UidFactory_generateUid(6),
                    createdAt: Date.now(),
                  },
                ];
              }
            }),
        ],
        "Clean up outdated Apple receipts - leave only the valid one"
      );
    } else {
      updateState(
        dispatch,
        [lb<IState>().p("storage").p("subscription").p("apple").record([])],
        "Clean up outdated Apple receipts - remove all"
      );
    }
  });
}

export function Subscriptions_cleanupOutdatedGooglePurchaseTokens(
  dispatch: IDispatch,
  userId: string,
  service: Service,
  subscription: ISubscription
): Promise<void> {
  return Promise.all(
    subscription.google.map<Promise<[string, boolean]>>(async (token) => {
      return [token.id, await Subscriptions_verifyGooglePurchaseToken(service, userId, token.value)];
    })
  ).then((results) => {
    for (const [id, result] of results) {
      if (!result) {
        updateState(
          dispatch,
          [
            lb<IState>()
              .p("storage")
              .p("subscription")
              .p("google")
              .recordModify((r) => {
                return CollectionUtils_removeBy([...r], "id", id);
              }),
          ],
          "Cleanup outdated Google receipt"
        );
      }
    }
  });
}

export function Subscriptions_verifyAppleReceipt(userId: string, service: Service, receipt?: string): Promise<boolean> {
  if (receipt != null) {
    return service.verifyAppleReceipt(userId, receipt);
  } else {
    return Promise.resolve(false);
  }
}

export function Subscriptions_verifyGooglePurchaseToken(
  service: Service,
  userId: string,
  purchaseToken?: string
): Promise<boolean> {
  if (purchaseToken != null) {
    return service.verifyGooglePurchaseToken(userId, purchaseToken);
  } else {
    return Promise.resolve(false);
  }
}
