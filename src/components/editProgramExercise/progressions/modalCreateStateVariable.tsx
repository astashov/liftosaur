import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "../../primitives/text";
import { Modal } from "../../modal";
import { IPercentageUnit, IUnit } from "../../../types";
import { Button } from "../../button";
import { InputSelect } from "../../inputSelect";
import { Input } from "../../input";
import { MenuItemEditable } from "../../menuItemEditable";
import { LiftoEditorStateVars_nameError } from "../../primitives/liftoEditorStateVars";

interface IModalCreateStateVariableProps {
  // The names already declared, so a duplicate is caught before it silently shadows one.
  existingNames?: string[];
  onClose: () => void;
  onCreate: (name: string, type: IStateVariableType, isUserPrompted: boolean) => void;
}

export type IStateVariableType = "number" | IUnit | IPercentageUnit;

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
  const nameError = LiftoEditorStateVars_nameError(name, props.existingNames);

  return (
    <View className="items-center pb-4 bg-background-default">
      <Text className="mb-2 text-xs text-text-secondary">
        You can use state variables to store values between workouts, or parameterize your progress scripts. Use them
        via <Text className="text-xs font-bold">state.yourVariable</Text> in the script.
      </Text>
      <View className="w-full">
        <Input
          label="Variable name"
          identifier="create-state-variable-name"
          // Scripts reference the name verbatim ('state.increment'), so an autocapitalized
          // first letter is a typo the user can't see. On input, not on blur: Create can be
          // tapped without ever blurring the field.
          autoCapitalize="none"
          autoCorrect={false}
          changeType="oninput"
          changeHandler={(r) => {
            if (r.success) {
              setName(r.data.trim());
            }
          }}
        />
        {showNameError && nameError != null && <Text className="text-xs text-text-error">{nameError}</Text>}
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
            if (nameError != null) {
              setShowNameError(true);
            }
            if (!type) {
              setShowTypeError(true);
            }
            if (nameError != null || !type) {
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
