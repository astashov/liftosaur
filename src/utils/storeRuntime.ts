import { Platform } from "react-native";
import { SendMessage_isIos, SendMessage_isAndroid } from "./sendMessage";

export function StoreRuntime_isIos(): boolean {
  return SendMessage_isIos() || Platform.OS === "ios";
}

export function StoreRuntime_isAndroid(): boolean {
  return SendMessage_isAndroid() || Platform.OS === "android";
}

export function StoreRuntime_isNative(): boolean {
  return StoreRuntime_isIos() || StoreRuntime_isAndroid();
}

export function StoreRuntime_storeName(): string {
  if (StoreRuntime_isIos()) {
    return "App Store";
  }
  return StoreRuntime_isAndroid() ? "Google Play" : "App Store / Play Store";
}
