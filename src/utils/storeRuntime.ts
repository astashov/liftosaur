import { Platform } from "react-native";

export function StoreRuntime_isIos(): boolean {
  return Platform.OS === "ios";
}

export function StoreRuntime_isAndroid(): boolean {
  return Platform.OS === "android";
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
