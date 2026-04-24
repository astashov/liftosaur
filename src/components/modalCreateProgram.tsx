import { JSX, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { Modal } from "./modal";
import { IconSpinner } from "./icons/iconSpinner";
import { Input, IInputHandle, IValidationError } from "./input";
import { IEither } from "../utils/types";

interface IProps {
  onSelect: (name: string) => void;
  onClose: () => void;
  isLoading?: boolean;
  isHidden: boolean;
}

export function ModalCreateProgramContent(props: Omit<IProps, "isHidden">): JSX.Element {
  const [result, setResult] = useState<IEither<string, Set<IValidationError>>>();
  const inputHandle = useRef<IInputHandle>(null);

  return (
    <View>
      <Text className="py-2 text-xl font-bold text-center">Create Program</Text>
      <Input
        identifier="modal-create-program-input"
        label="Program Name"
        required={true}
        requiredMessage="Please enter a program name"
        placeholder="My Awesome Routine"
        changeType="oninput"
        changeHandler={setResult}
        handleRef={inputHandle}
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
            if (props.isLoading) {
              return;
            }
            if (result?.success) {
              props.onSelect(result.data);
            } else {
              inputHandle.current?.touch();
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
