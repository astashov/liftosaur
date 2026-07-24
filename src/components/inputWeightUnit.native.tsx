import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IUnit } from "../types";
import { ActionSheet_show } from "../utils/actionSheet";

interface IInputWeightUnitProps {
  value: IUnit | "%";
  units: readonly (IUnit | "%")[];
  onChange: (unit: IUnit | "%") => void;
}

export function InputWeightUnit(props: IInputWeightUnitProps): JSX.Element {
  return (
    <Pressable
      data-testid="edit-weight-unit"
      testID="edit-weight-unit"
      onPress={() => {
        const options = [...props.units, "Cancel"];
        ActionSheet_show({ options, cancelButtonIndex: options.length - 1 }, (buttonIndex) => {
          if (buttonIndex != null && buttonIndex < props.units.length) {
            props.onChange(props.units[buttonIndex]);
          }
        });
      }}
      className="px-2 py-1 border rounded border-border-neutral bg-background-default"
    >
      <View className="flex-row items-center">
        <Text className="text-sm">{props.value}</Text>
        <Text className="ml-1 text-xs text-text-secondary">▾</Text>
      </View>
    </Pressable>
  );
}
