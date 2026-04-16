import { JSX, useState } from "react";
import { View, TextInput } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  onSelect: (name: string) => void;
  onClose: () => void;
}

export function ModalNewGymContent(props: IProps): JSX.Element {
  const [value, setValue] = useState("");

  return (
    <View>
      <Text className="mb-2 text-lg font-bold">New Gym</Text>
      <Text className="mb-4 text-xs text-text-secondary">
        You can add a new gym with a set of exercises, and when you switch between gyms, the exercises will use the
        equipment from the selected gym.
      </Text>
      <TextInput
        autoFocus
        placeholder="Home Gym"
        placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
        value={value}
        onChangeText={setValue}
        className="px-4 py-3 text-base border rounded-lg border-border-neutral bg-background-default"
        style={{ fontFamily: "Poppins" }}
      />
      <View className="flex-row justify-end gap-3 mt-4">
        <Button name="add-gym-cancel" kind="grayv2" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          name="add-gym-submit"
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
