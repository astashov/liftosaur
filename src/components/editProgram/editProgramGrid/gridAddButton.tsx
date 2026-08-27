import { JSX, memo, useCallback, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { Text } from "../../primitives/text";
import { Pressable } from "../../primitives/pressable";
import { IconPlus2 } from "../../icons/iconPlus2";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { useRem } from "../../../utils/useRem";

export interface IAddButtonProps {
  label: string;
  testID: string;
  onPress: () => void;
}

export const AddButton = memo(function AddButton(props: IAddButtonProps): JSX.Element {
  return (
    <Pressable
      className={`flex-row items-center justify-center px-1 py-1 border rounded nm-${props.testID}`}
      // A filled placeholder rather than an outline: against the warm day box an unfilled button
      // reads as part of the box, and "+ Exercise" in particular went unnoticed. The pale purple is
      // the exercise strip's own colour, drained — an empty slot waiting for one.
      style={{
        borderStyle: "dashed",
        borderColor: Tailwind_semantic().border.cardpurple,
        backgroundColor: Tailwind_semantic().background.cardpurple,
      }}
      testID={props.testID}
      accessibilityLabel={`Add ${props.label}`}
      onPress={props.onPress}
    >
      <IconPlus2 size={10} color={Tailwind_semantic().text.link} />
      <Text className="ml-1 text-xs font-semibold text-text-link" numberOfLines={1}>
        {props.label}
      </Text>
    </Pressable>
  );
});

const VERTICAL_LABEL_LENGTH = 5;
// Roughly two thirds of a phone's grid viewport, so whatever the vertical scroll position, at least
// one label is on screen without the rail turning into a column of repeated text.
const VERTICAL_LABEL_SPACING = 22;

export const VerticalAddButton = memo(function VerticalAddButton(props: IAddButtonProps): JSX.Element {
  const rem = useRem();
  const [height, setHeight] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height), []);
  // The rail is as tall as the whole grid, which on any real program is taller than the screen, so
  // one label — wherever it were placed — would be scrolled past. It repeats instead, and how many
  // times is only knowable once laid out.
  const labels = Math.max(1, Math.round(height / (VERTICAL_LABEL_SPACING * rem)));
  return (
    <Pressable
      className={`items-center border rounded nm-${props.testID}`}
      style={{
        flex: 1,
        borderStyle: "dashed",
        borderColor: Tailwind_semantic().border.cardpurple,
        backgroundColor: Tailwind_semantic().background.cardpurple,
      }}
      testID={props.testID}
      accessibilityLabel={`Add ${props.label}`}
      onPress={props.onPress}
      onLayout={onLayout}
    >
      {Array.from({ length: labels }, (_, i) => i).map((i) => (
        // The label below is sized for its *unrotated* width, so its box is wider than the rail and
        // hangs over the grid on one side and past the last column on the other. Clipped, because
        // once rotated it renders well inside the rail and the overhang is pure layout — left to
        // stand it added a sliver of horizontal scroll past the right edge of a grid that otherwise
        // fits exactly. Deaf to the pointer for the same reason: on web the overhang still
        // hit-tests, and it covered the resize handles of the last week's strips, making a repeat
        // impossible to drag there. Presses inside the rail still reach its own Pressable.
        // alignSelf, because the rail centres its children and so sizes them to their content —
        // which here is the label's unrotated width. Stretching takes the rail's width instead, and
        // the clip then bites on the label rather than on nothing.
        <View
          key={i}
          pointerEvents="none"
          className="items-center justify-center overflow-hidden"
          style={{ flex: 1, alignSelf: "stretch" }}
        >
          {/* Rotation doesn't change layout, so the label needs its own length along what becomes
              the vertical axis; it overflows the narrow rail before rotating and fits after. */}
          <View
            className="flex-row items-center justify-center"
            style={{ width: VERTICAL_LABEL_LENGTH * rem, transform: [{ rotate: "-90deg" }] }}
          >
            <IconPlus2 size={10} color={Tailwind_semantic().text.link} />
            <Text className="ml-1 text-xs font-semibold text-text-link" numberOfLines={1}>
              {props.label}
            </Text>
          </View>
        </View>
      ))}
    </Pressable>
  );
});
