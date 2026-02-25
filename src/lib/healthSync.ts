import {
  SendMessage_isIos,
  SendMessage_iosAppVersion,
  SendMessage_iosVersion,
  SendMessage_isAndroid,
  SendMessage_androidAppVersion,
  SendMessage_androidVersion,
} from "../utils/sendMessage";

export function HealthSync_eligibleForAppleHealth(): boolean {
  return SendMessage_isIos() && SendMessage_iosAppVersion() >= 9 && SendMessage_iosVersion() >= 15;
}

export function HealthSync_eligibleForGoogleHealth(): boolean {
  return SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 18 && SendMessage_androidVersion() >= 14;
}
