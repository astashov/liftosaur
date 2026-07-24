import { Platform, Pressable as RNPressable } from "react-native";
import { Pressable as GHPressable } from "react-native-gesture-handler";
import { withUniwind } from "uniwind";

const AndroidPressable = withUniwind(GHPressable);

export const Pressable: typeof RNPressable =
  Platform.OS === "android" ? (AndroidPressable as unknown as typeof RNPressable) : RNPressable;
