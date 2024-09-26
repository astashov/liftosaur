import { SendMessage } from "../utils/sendMessage";

export class HealthSync {
  public static eligibleForAppleHealth(): boolean {
    return SendMessage.isIos() && SendMessage.iosAppVersion() >= 9 && SendMessage.iosVersion() >= 15;
  }

  public static eligibleForGoogleHealth(): boolean {
    return SendMessage.isAndroid() && SendMessage.androidAppVersion() >= 18 && SendMessage.androidVersion() >= 14;
  }
}
