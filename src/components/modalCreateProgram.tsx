import { JSX, useState } from "react";
import { View, TextInput } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { Modal } from "./modal";
import { IconSpinner } from "./icons/iconSpinner";

interface IProps {
  onSelect: (name: string) => void;
  onClose: () => void;
  isLoading?: boolean;
  isHidden: boolean;
}

export function ModalCreateProgramContent(props: Omit<IProps, "isHidden">): JSX.Element {
  const [name, setName] = useState("");
  return (
    <View>
      <Text className="py-2 text-xl font-bold text-center">Create Program</Text>
      <Text className="mb-1 text-sm text-text-secondary">Program Name</Text>
      <TextInput
        testID="modal-create-program-input"
        data-cy="modal-create-program-input"
        autoFocus
        placeholder="My Awesome Routine"
        placeholderTextColor="#9ca3af"
        value={name}
        onChangeText={setName}
        className="w-full px-4 py-2 text-base border rounded-lg border-border-prominent bg-background-default"
        style={{ fontFamily: "Poppins" }}
      />
      <View className="flex-row justify-center mt-4" style={{ gap: 12 }}>
        <Button name="modal-create-program-cancel" kind="grayv2" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          name="modal-create-program-submit"
          kind="purple"
          disabled={props.isLoading}
          onClick={() => {
            if (!props.isLoading && name) {
              props.onSelect(name);
            }
          }}
        >
          {props.isLoading ? <IconSpinner color="white" width={18} height={18} /> : "Create"}
        </Button>
      </View>
    </View>
  );
}

export function ModalCreateProgram(props: IProps): JSX.Element {
  return (
    <Modal zIndex={70} isHidden={props.isHidden} onClose={props.onClose} shouldShowClose={true}>
      <ModalCreateProgramContent onSelect={props.onSelect} onClose={props.onClose} isLoading={props.isLoading} />
    </Modal>
  );
}
