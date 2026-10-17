import { useContext, useMemo } from "react";
import { Animated } from "react-native";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useCustomKeyboardAnimatedHeight } from "./CustomKeyboardContext";

export function useCustomKeyboardLift(): Animated.AnimatedInterpolation<number> {
  const keypadHeight = useCustomKeyboardAnimatedHeight();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  return useMemo(
    () =>
      Animated.subtract(keypadHeight, tabBarHeight).interpolate({
        inputRange: [0, 1],
        outputRange: [0, -1],
        extrapolateLeft: "clamp",
        extrapolateRight: "extend",
      }),
    [keypadHeight, tabBarHeight]
  );
}
