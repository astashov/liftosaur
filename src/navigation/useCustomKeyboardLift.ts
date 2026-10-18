import { useContext, useMemo } from "react";
import { Animated } from "react-native";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCustomKeyboardAnimatedHeight } from "./CustomKeyboardContext";

export function useCustomKeyboardLift(): { lift: Animated.AnimatedInterpolation<number>; bottomInset: number } {
  const keypadHeight = useCustomKeyboardAnimatedHeight();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const insets = useSafeAreaInsets();
  const bottomInset = tabBarHeight > 0 ? 0 : insets.bottom;
  const lift = useMemo(
    () =>
      Animated.subtract(keypadHeight, tabBarHeight + bottomInset).interpolate({
        inputRange: [0, 1],
        outputRange: [0, -1],
        extrapolateLeft: "clamp",
        extrapolateRight: "extend",
      }),
    [keypadHeight, tabBarHeight, bottomInset]
  );
  return { lift, bottomInset };
}
