import { Platform } from "react-native";

export function HealthSync_eligibleForAppleHealth(): boolean {
  return Platform.OS === "ios" && parseFloat(String(Platform.Version)) >= 15;
}

export function HealthSync_eligibleForGoogleHealth(): boolean {
  // Platform.Version on Android is the API level, not the user-facing version. 34 = Android 14 (UPSIDE_DOWN_CAKE),
  // the minimum for Health Connect's runtime permission flow.
  return Platform.OS === "android" && Number(Platform.Version) >= 34;
}
