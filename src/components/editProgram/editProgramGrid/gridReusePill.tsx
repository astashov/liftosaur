import { JSX, memo } from "react";
import { View } from "react-native";
import { Text } from "../../primitives/text";
import { Pressable } from "../../primitives/pressable";
import { IconArrowUp } from "../../icons/iconArrowUp";
import { IconArrowDown2 } from "../../icons/iconArrowDown2";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { IGridReuseLocator } from "./useGridReuseLocator";

// Where the selected exercise's reuse source went, when it is off screen. Only as wide as its
// words, so it reads as a note attached to the selection rather than as another bar.
//
// It is rendered at whichever edge it points to — under the week header when the source is above,
// over the dock when it is below (see EditProgramGrid and GridActionDock). Pointing up from the
// bottom of the screen makes the reader work out the direction twice: once from the arrow, and
// once to reconcile it with where the arrow is.
//
// Tappable, because "which way is it" and "take me there" are the same question a beat apart.
export const GridReusePill = memo(function GridReusePill(props: { reuse: IGridReuseLocator }): JSX.Element {
  const { reuse } = props;
  return (
    <Pressable
      className="flex-row items-center gap-1 px-2 py-1 border rounded-full nm-grid-reuse-locator"
      style={{
        borderColor: Tailwind_semantic().border.cardpurple,
        backgroundColor: Tailwind_semantic().background.cardpurple,
      }}
      testID="grid-reuse-locator"
      accessibilityLabel={`Scroll to ${reuse.name}, ${reuse.direction === "up" ? "above" : "below"}`}
      onPress={reuse.onGoTo}
    >
      {/* The app's own chevrons rather than "↑"/"↓": an arrow glyph is at the mercy of whether
          Poppins carries it, and a fallback font would put a stranger's arrow in the middle of a
          pill. */}
      {reuse.direction === "up" ? (
        <IconArrowUp color={Tailwind_semantic().text.link} />
      ) : (
        <IconArrowDown2 color={Tailwind_semantic().text.link} />
      )}
      <Text className="text-xs font-semibold text-text-link" numberOfLines={1}>
        {reuse.name}
      </Text>
    </Pressable>
  );
});

// The pill floating over the grid at one of its edges, rather than sitting in a row of its own. A
// row would push the grid down by its height the moment a selection was made, which moves the very
// strip that was just tapped.
export function GridReusePillFloat(props: { reuse: IGridReuseLocator }): JSX.Element {
  return (
    // box-none, not none: the strip underneath has to stay tappable everywhere the pill isn't, and
    // this band covers the full width of the grid.
    <View pointerEvents="box-none" className="items-center">
      <GridReusePill reuse={props.reuse} />
    </View>
  );
}
