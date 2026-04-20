import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";

export function SetNumber(props: { setIndex: number; size?: "md" | "sm" }): JSX.Element {
  const isSmall = props.size === "sm";
  return (
    <View
      className={`items-center justify-center ${isSmall ? "w-5 h-5" : "w-6 h-6"} border rounded-full border-border-prominent`}
    >
      <Text className={`font-bold text-text-secondary ${isSmall ? "text-xs" : ""}`}>{props.setIndex + 1}</Text>
    </View>
  );
}
