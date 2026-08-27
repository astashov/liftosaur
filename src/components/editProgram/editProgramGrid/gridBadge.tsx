import { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../primitives/text";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";

// A structural fact about an exercise — what the grid can't draw and the strip has no room to spell
// out. Shared by the strip and the dock so the same fact reads the same in both places.
//
// No vertical padding: the text's own line box sets the height, which keeps the pill proportional to
// the font scale without needing a fractional spacing step.
//
// `isInverse` is for a selected strip, whose fill is the strong end of its color family: the solid
// grey pill goes muddy on it, so the badge becomes an outline in the same inverse color as the text
// around it. Android's Uniwind drops utilities from a className that changes with state, so the
// radius and the border live in `style`.
export function GridBadge(props: { label: string; isInverse?: boolean }): JSX.Element {
  return (
    <View
      className={`px-1 ml-1 shrink-0 ${props.isInverse ? "" : "bg-background-darkgray"}`}
      style={{
        borderRadius: 4,
        borderWidth: props.isInverse ? 1 : 0,
        borderColor: Tailwind_semantic().text.primaryinverse,
      }}
    >
      <Text
        className={`text-xs ${props.isInverse ? "text-text-primaryinverse" : "text-text-alwayswhite"}`}
        numberOfLines={1}
      >
        {props.label}
      </Text>
    </View>
  );
}
