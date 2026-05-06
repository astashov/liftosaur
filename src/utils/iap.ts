import { IDispatch } from "../ducks/types";
import { IApplePromotionalOffer, IGooglePromotionalOffer } from "../models/state";
import { SendMessage_toIos, SendMessage_toAndroid } from "./sendMessage";

export interface IAPSubscribeArgs {
  applePromo?: IApplePromotionalOffer;
  googlePromo?: IGooglePromotionalOffer;
}

export async function IAP_initConnection(_dispatch: IDispatch): Promise<void> {
  return Promise.resolve();
}

export async function IAP_endConnection(): Promise<void> {
  return Promise.resolve();
}

export async function IAP_fetchProducts(_dispatch: IDispatch): Promise<void> {
  return Promise.resolve();
}

export async function IAP_subscribeMonthly(args?: IAPSubscribeArgs): Promise<void> {
  SendMessage_toIos({
    type: "subscribeMontly",
    offer: JSON.stringify(args?.applePromo),
  });
  SendMessage_toAndroid({
    type: "subscribeMontly",
    offer: JSON.stringify(args?.googlePromo),
  });
}

export async function IAP_subscribeYearly(args?: IAPSubscribeArgs): Promise<void> {
  SendMessage_toIos({
    type: "subscribeYearly",
    offer: JSON.stringify(args?.applePromo),
  });
  SendMessage_toAndroid({
    type: "subscribeYearly",
    offer: JSON.stringify(args?.googlePromo),
  });
}

export async function IAP_buyLifetime(): Promise<void> {
  SendMessage_toIos({ type: "subscribeLifetime" });
  SendMessage_toAndroid({ type: "subscribeLifetime" });
}

export async function IAP_restorePurchases(_dispatch?: IDispatch): Promise<void> {
  SendMessage_toIos({ type: "restoreSubscriptions" });
  SendMessage_toAndroid({ type: "restoreSubscriptions" });
}
