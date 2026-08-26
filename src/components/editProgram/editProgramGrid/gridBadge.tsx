import { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../primitives/text";

// A structural fact about an exercise — what the grid can't draw and the strip has no room to spell
// out. Shared by the strip and the dock so the same fact reads the same in both places.
//
// No vertical padding: the text's own line box sets the height, which keeps the pill proportional to
// the font scale without needing a fractional spacing step.
export function GridBadge(props: { label: string }): JSX.Element {
  return (
    <View className="px-1 ml-1 rounded shrink-0 bg-background-darkgray">
      <Text className="text-xs text-text-alwayswhite" numberOfLines={1}>
        {props.label}
      </Text>
    </View>
  );
}
