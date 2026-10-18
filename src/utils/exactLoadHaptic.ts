import { Platform } from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

export function ExactLoadHaptic_play(): void {
  if (Platform.OS === "web") {
    return;
  }
  ReactNativeHapticFeedback.trigger("impactLight", {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: false,
  });
}
