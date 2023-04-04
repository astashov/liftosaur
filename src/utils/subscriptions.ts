import { Service } from "../api/service";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { ISubscription } from "../types";

export namespace Subscriptions {
  export function hasSubscription(subscription: ISubscription): boolean {
    if (subscription.key && subscription.key !== "unclaimed") {
      return true;
    }
    const hasApple = hasAppleSubscription(subscription);
    const hasGoogle = hasGoogleSubscription(subscription);
    return hasApple || hasGoogle;
  }

  export function listOfSubscriptions(subscription: ISubscription): string[] {
    const arr: string[] = [];
    if (Object.keys(subscription.apple || []).length > 0) {
      arr.push("apple");
    }
    if (Object.keys(subscription.google || []).length > 0) {
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
    return Object.keys(subscription.apple).length > 0;
  }

  function hasGoogleSubscription(subscription: ISubscription): boolean {
    return Object.keys(subscription.google).length > 0;
  }

  export function setAppleReceipt(dispatch: IDispatch, receipt: string): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("subscription")
        .p("apple")
        .recordModify((v) => {
          return { ...v, [receipt]: null };
        }),
    ]);
  }

  export function setGooglePurchaseToken(dispatch: IDispatch, purchaseToken: string): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("subscription")
        .p("google")
        .recordModify((v) => {
          return { ...v, [purchaseToken]: null };
        }),
    ]);
  }

  export function cleanupOutdatedAppleReceipts(
    dispatch: IDispatch,
    userId: string,
    service: Service,
    subscription: ISubscription
  ): Promise<void> {
    return Promise.all(
      Object.keys(subscription.apple).map<Promise<[string, boolean]>>(async (key) => {
        return [key, await Subscriptions.verifyAppleReceipt(userId, service, key)];
      })
    ).then((results) => {
      for (const [key, result] of results) {
        if (!result) {
          updateState(dispatch, [
            lb<IState>()
              .p("storage")
              .p("subscription")
              .p("apple")
              .recordModify((r) => {
                const copy = { ...r };
                delete copy[key];
                return copy;
              }),
          ]);
        }
      }
    });
  }

  export function cleanupOutdatedGooglePurchaseTokens(
    dispatch: IDispatch,
    userId: string,
    service: Service,
    subscription: ISubscription
  ): Promise<void> {
    return Promise.all(
      Object.keys(subscription.google).map<Promise<[string, boolean]>>(async (key) => {
        return [key, await Subscriptions.verifyGooglePurchaseToken(service, userId, key)];
      })
    ).then((results) => {
      for (const [key, result] of results) {
        if (!result) {
          updateState(dispatch, [
            lb<IState>()
              .p("storage")
              .p("subscription")
              .p("google")
              .recordModify((r) => {
                const copy = { ...r };
                delete copy[key];
                return copy;
              }),
          ]);
        }
      }
    });
  }

  export function verifyAppleReceipt(userId: string, service: Service, receipt?: string): Promise<boolean> {
    if (receipt != null) {
      return service.verifyAppleReceipt(userId, receipt);
    } else {
      return Promise.resolve(false);
    }
  }

  export function verifyGooglePurchaseToken(
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
}
