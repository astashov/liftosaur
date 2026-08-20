import { JSX, memo } from "react";
import { Text } from "../../primitives/text";
import { Pressable } from "../../primitives/pressable";
import { IconPlus2 } from "../../icons/iconPlus2";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";

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
