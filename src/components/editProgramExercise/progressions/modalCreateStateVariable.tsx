import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "../../primitives/text";
import { Modal } from "../../modal";
import { IPercentageUnit, IUnit } from "../../../types";
import { Button } from "../../button";
import { InputSelect } from "../../inputSelect";
import { MenuItemEditable } from "../../menuItemEditable";

interface IModalCreateStateVariableProps {
  onClose: () => void;
  onCreate: (name: string, type: IStateVariableType, isUserPrompted: boolean) => void;
}

type IStateVariableType = "number" | IUnit | IPercentageUnit;

export function ModalCreateStateVariableContent(props: IModalCreateStateVariableProps): JSX.Element {
  const [name, setName] = useState<string>("");
  const [type, setType] = useState<IStateVariableType | undefined>(undefined);
  const [showTypeError, setShowTypeError] = useState<boolean>(false);
  const [showNameError, setShowNameError] = useState<boolean>(false);
  const typeValues: [IStateVariableType, string][] = [
    ["number", "Number"],
    ["kg", "Weight (kg)"],
    ["lb", "Weight (lb)"],
    ["%", "Percentage"],
  ];
  const [isUserPrompted, setIsUserPrompted] = useState<boolean>(false);
  const nameIsValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

  return (
    <View className="items-center">
      <Text className="mb-1 text-lg font-bold text-center">Add New State Variable</Text>
      <Text className="mb-2 text-xs text-text-secondary">
        You can use state variables to store values between workouts, or parameterize your progress scripts. Use them
        via <Text className="font-bold">state.yourVariable</Text> in the script.
      </Text>
      <View className="w-full">
        <MenuItemEditable
          name="Variable name"
          type="text"
          value={name}
          onChange={(v) => {
            setName(v ?? "");
            setShowNameError(false);
          }}
        />
        {showNameError && !nameIsValid && (
          <Text className="text-xs text-text-error">
            Variable names must start with a letter or underscore, and can only contain letters, numbers, and
            underscores.
          </Text>
        )}
      </View>
      <View className="w-full pt-2">
        <InputSelect
          name="create-state-variable-type"
          label="Type"
          expandValue={true}
          placeholder="Select a type"
          values={typeValues}
          value={type}
          onChange={(v) => {
            if (v) {
              setType(v);
              setShowTypeError(false);
            } else {
              setType(undefined);
              setShowTypeError(true);
            }
          }}
        />
        {showTypeError && <Text className="text-xs text-text-error">Please select a type for the variable.</Text>}
      </View>
      <MenuItemEditable
        name="User Prompted?"
        type="boolean"
        nextLine={
          <View className="pb-2" style={{ marginTop: -8 }}>
            <Text className="text-xs text-text-secondary">Will be asked for value at the end of workout</Text>
          </View>
        }
        value={isUserPrompted ? "true" : "false"}
        onChange={(v) => {
          setIsUserPrompted(v === "true");
        }}
      />
      <View className="items-center mt-4">
        <Button
          kind="purple"
          name="modal-create-state-variable-submit"
          onClick={() => {
            if (!type) {
              setShowTypeError(true);
              return;
            }
            if (!nameIsValid) {
              setShowNameError(true);
              return;
            }
            props.onCreate(name, type, isUserPrompted);
            props.onClose();
          }}
        >
          Create
        </Button>
      </View>
    </View>
  );
}

export function ModalCreateStateVariable(props: IModalCreateStateVariableProps): JSX.Element {
  return (
    <Modal name="new-state-variable-modal" onClose={props.onClose} shouldShowClose={true}>
      <ModalCreateStateVariableContent {...props} />
    </Modal>
  );
}
