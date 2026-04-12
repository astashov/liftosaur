import { JSX, useState } from "react";
import { View, TextInput } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";

export function ModalImportFromLinkContent(props: { onSubmit: (value?: string) => void }): JSX.Element {
  const [link, setLink] = useState("");
  return (
    <View>
      <Text className="my-2 text-lg font-bold">Paste link from /program web editor</Text>
      <TextInput
        autoFocus
        placeholder="https://www.liftosaur.com/..."
        placeholderTextColor="#9ca3af"
        value={link}
        onChangeText={setLink}
        autoCapitalize="none"
        autoCorrect={false}
        className="w-full px-4 py-2 text-base border rounded-lg border-border-prominent bg-background-default"
        style={{ fontFamily: "Poppins" }}
      />
      <View className="flex-row justify-end mt-4" style={{ gap: 12 }}>
        <Button name="modal-import-from-link-cancel" kind="grayv2" onClick={() => props.onSubmit(undefined)}>
          Cancel
        </Button>
        <Button name="modal-import-from-link-submit" kind="purple" onClick={() => props.onSubmit(link || undefined)}>
          Add
        </Button>
      </View>
    </View>
  );
}
