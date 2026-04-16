import { JSX, useState } from "react";
import { View, TextInput } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IUnit } from "../types";

interface IProps {
  units: IUnit;
  name: string;
  onSelect: (value: number) => void;
  onClose: () => void;
}

export function ModalNewFixedWeightContent(props: IProps): JSX.Element {
  const [value, setValue] = useState("");

  return (
    <View>
      <Text className="mb-4 text-lg font-bold">{`Enter new ${props.name} fixed weight`}</Text>
      <TextInput
        autoFocus
        keyboardType="numeric"
        placeholder={`${props.name} weight in ${props.units}`}
        placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
        value={value}
        onChangeText={setValue}
        className="px-4 py-3 text-base border rounded-lg border-border-neutral bg-background-default"
        style={{ fontFamily: "Poppins" }}
      />
      <View className="flex-row justify-end gap-3 mt-4">
        <Button name="modal-new-fixed-weight-cancel" kind="grayv2" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          name="modal-new-fixed-weight-submit"
          kind="purple"
          onClick={() => {
            const numValue = value !== "" ? parseFloat(value) : undefined;
            if (numValue != null && !isNaN(numValue)) {
              props.onSelect(numValue);
            }
          }}
        >
          Add
        </Button>
      </View>
    </View>
  );
}
