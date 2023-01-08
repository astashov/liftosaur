import { Service } from "../api/service";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { ISubscription } from "../types";

export namespace Subscriptions {
  export function hasSubscription(subscription: ISubscription): boolean {
    let subscriptionParam: string | undefined;
    if (window?.document?.location?.href) {
      const url = new URL(window.document.location.href);
      subscriptionParam = url.searchParams.get("subscription") || undefined;
    } else {
      subscriptionParam = undefined;
    }
    if (!subscriptionParam) {
      return true;
    }
    const hasApple = hasAppleSubscription(subscription);
    const hasGoogle = hasGoogleSubscription(subscription);
    return hasApple || hasGoogle;
  }

  export function hasAppleSubscription(subscription: ISubscription): boolean {
    return Object.keys(subscription.apple).length > 0;
  }

  export function hasGoogleSubscription(subscription: ISubscription): boolean {
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
    service: Service,
    subscription: ISubscription
  ): Promise<void> {
    return Promise.all(
      Object.keys(subscription.apple).map<Promise<[string, boolean]>>(async (key) => {
        return [key, await Subscriptions.verifyAppleReceipt(service, key)];
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
    service: Service,
    subscription: ISubscription
  ): Promise<void> {
    return Promise.all(
      Object.keys(subscription.google).map<Promise<[string, boolean]>>(async (key) => {
        return [key, await Subscriptions.verifyGooglePurchaseToken(service, key)];
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

  export function verifyAppleReceipt(service: Service, receipt?: string): Promise<boolean> {
    if (receipt != null) {
      return service.verifyAppleReceipt(receipt);
    } else {
      return Promise.resolve(false);
    }
  }

  export function verifyGooglePurchaseToken(service: Service, purchaseToken?: string): Promise<boolean> {
    if (purchaseToken != null) {
      return service.verifyGooglePurchaseToken(purchaseToken);
    } else {
      return Promise.resolve(false);
    }
  }
}
