import { JSX, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { Input, IInputHandle, IValidationError } from "./input";
import { IEither } from "../utils/types";
import { IUnit } from "../types";

interface IProps {
  units: IUnit;
  name: string;
  onSelect: (value: number) => void;
  onClose: () => void;
}

export function ModalNewFixedWeightContent(props: IProps): JSX.Element {
  const [result, setResult] = useState<IEither<string, Set<IValidationError>>>();
  const inputHandle = useRef<IInputHandle>(null);

  return (
    <View>
      <Text className="mb-4 text-lg font-bold">{`Enter new ${props.name} fixed weight`}</Text>
      <Input
        type="number"
        required={true}
        requiredMessage="Please enter a weight"
        placeholder={`${props.name} weight in ${props.units}`}
        changeType="oninput"
        changeHandler={setResult}
        handleRef={inputHandle}
      />
      <View className="flex-row justify-end gap-3 mt-4">
        <Button name="modal-new-fixed-weight-cancel" kind="grayv2" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          name="modal-new-fixed-weight-submit"
          kind="purple"
          onClick={() => {
            if (result?.success) {
              const numValue = parseFloat(result.data);
              if (!isNaN(numValue)) {
                props.onSelect(numValue);
                return;
              }
            }
            inputHandle.current?.touch();
          }}
        >
          Add
        </Button>
      </View>
    </View>
  );
}
