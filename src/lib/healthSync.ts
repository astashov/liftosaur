import {
  SendMessage_isIos,
  SendMessage_iosAppVersion,
  SendMessage_iosVersion,
  SendMessage_isAndroid,
  SendMessage_androidAppVersion,
  SendMessage_androidVersion,
} from "../utils/sendMessage";

export class HealthSync {
  public static eligibleForAppleHealth(): boolean {
    return SendMessage_isIos() && SendMessage_iosAppVersion() >= 9 && SendMessage_iosVersion() >= 15;
  }

  public static eligibleForGoogleHealth(): boolean {
    return SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 18 && SendMessage_androidVersion() >= 14;
  }
}
