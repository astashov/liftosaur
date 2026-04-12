import { JSX, useState } from "react";
import { View, TextInput, Modal, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";

interface IProps {
  onInput: (value?: string) => void;
  isHidden: boolean;
}

export function ModalNewEquipment(props: IProps): JSX.Element {
  const [value, setValue] = useState("");

  if (props.isHidden) {
    return <></>;
  }

  return (
    <Modal transparent animationType="fade" visible={!props.isHidden} onRequestClose={() => props.onInput(undefined)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <Pressable className="items-center justify-center flex-1 bg-black/50" onPress={() => props.onInput(undefined)}>
          <Pressable className="w-5/6 p-6 bg-background-default rounded-2xl" onPress={(e) => e.stopPropagation()}>
            <Text className="mb-4 text-lg font-bold">Enter new equipment name</Text>
            <TextInput
              autoFocus
              placeholder="Tummy Tormentor 3000"
              placeholderTextColor="#9ca3af"
              value={value}
              onChangeText={setValue}
              className="px-4 py-3 text-base border rounded-lg border-border-neutral bg-background-default"
              style={{ fontFamily: "Poppins" }}
            />
            <View className="flex-row justify-end mt-4" style={{ gap: 12 }}>
              <Button name="add-equipment-cancel" kind="grayv2" onClick={() => props.onInput(undefined)}>
                Cancel
              </Button>
              <Button
                name="add-equipment-submit"
                kind="purple"
                onClick={() => {
                  if (value) {
                    props.onInput(value);
                    setValue("");
                  }
                }}
              >
                Add
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
