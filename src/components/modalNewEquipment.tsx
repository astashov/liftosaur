import { JSX, useState } from "react";
import { View, TextInput } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  onSelect: (name: string) => void;
  onClose: () => void;
}

export function ModalNewEquipmentContent(props: IProps): JSX.Element {
  const [value, setValue] = useState("");

  return (
    <View>
      <Text className="mb-4 text-lg font-bold">Enter new equipment name</Text>
      <TextInput
        autoFocus
        placeholder="Tummy Tormentor 3000"
        placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
        value={value}
        onChangeText={setValue}
        className="px-4 py-3 text-base border rounded-lg border-border-neutral bg-background-default"
        style={{ fontFamily: "Poppins" }}
      />
      <View className="flex-row justify-end gap-3 mt-4">
        <Button name="add-equipment-cancel" kind="grayv2" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          name="add-equipment-submit"
          kind="purple"
          onClick={() => {
            if (value) {
              props.onSelect(value);
            }
          }}
        >
          Add
        </Button>
      </View>
    </View>
  );
}
