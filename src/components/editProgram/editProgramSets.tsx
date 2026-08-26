import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";

export function SetNumber(props: { setIndex: number; size?: "md" | "sm" }): JSX.Element {
  const isSmall = props.size === "sm";
  return (
    <View
      className={`items-center justify-center ${isSmall ? "w-scaled-5 h-scaled-5" : "w-scaled-6 h-scaled-6"} border rounded-full border-border-prominent`}
    >
      <Text className={`font-bold text-text-secondary ${isSmall ? "text-xs" : ""}`}>{props.setIndex + 1}</Text>
    </View>
  );
}
