import { Platform } from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

export function SetCompleteHaptic_play(): void {
  if (Platform.OS === "web") {
    return;
  }
  ReactNativeHapticFeedback.trigger("impactMedium", {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: false,
  });
}
