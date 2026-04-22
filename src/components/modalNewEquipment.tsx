import { JSX, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { Input, IInputHandle, IValidationError } from "./input";
import { IEither } from "../utils/types";

interface IProps {
  onSelect: (name: string) => void;
  onClose: () => void;
}

export function ModalNewEquipmentContent(props: IProps): JSX.Element {
  const [result, setResult] = useState<IEither<string, Set<IValidationError>>>();
  const inputHandle = useRef<IInputHandle>(null);

  return (
    <View>
      <Text className="mb-4 text-lg font-bold">Enter new equipment name</Text>
      <Input
        label="Equipment name"
        required={true}
        requiredMessage="Please enter a name for the equipment"
        type="text"
        placeholder="Tummy Tormentor 3000"
        changeType="oninput"
        changeHandler={setResult}
        handleRef={inputHandle}
      />
      <View className="flex-row justify-end gap-3 mt-4">
        <Button name="add-equipment-cancel" kind="grayv2" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          name="add-equipment-submit"
          kind="purple"
          onClick={() => {
            if (result?.success) {
              props.onSelect(result.data);
            } else {
              inputHandle.current?.touch();
            }
          }}
        >
          Add
        </Button>
      </View>
    </View>
  );
}
