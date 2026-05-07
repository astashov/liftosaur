import { Platform } from "react-native";
import {
  SendMessage_isIos,
  SendMessage_iosAppVersion,
  SendMessage_iosVersion,
  SendMessage_isAndroid,
  SendMessage_androidAppVersion,
  SendMessage_androidVersion,
} from "../utils/sendMessage";

export function HealthSync_eligibleForAppleHealth(): boolean {
  if (SendMessage_isIos()) {
    return SendMessage_iosAppVersion() >= 9 && SendMessage_iosVersion() >= 15;
  }
  return Platform.OS === "ios" && parseFloat(String(Platform.Version)) >= 15;
}

export function HealthSync_eligibleForGoogleHealth(): boolean {
  if (SendMessage_isAndroid()) {
    return SendMessage_androidAppVersion() >= 18 && SendMessage_androidVersion() >= 14;
  }
  // Platform.Version on Android is the API level, not the user-facing version. 34 = Android 14 (UPSIDE_DOWN_CAKE),
  // the minimum for Health Connect's runtime permission flow.
  return Platform.OS === "android" && Number(Platform.Version) >= 34;
}
