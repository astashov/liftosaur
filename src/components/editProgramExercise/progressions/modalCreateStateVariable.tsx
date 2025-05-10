import { h, JSX } from "preact";
import { Input } from "../../input";
import { Modal } from "../../modal";
import { IPercentageUnit, IUnit } from "../../../types";
import { useRef, useState } from "preact/hooks";
import { Button } from "../../button";
import { InputSelect } from "../../inputSelect";

interface IModalCreateStateVariableProps {
  onClose: () => void;
  onCreate: (name: string, type: IStateVariableType) => void;
}

type IStateVariableType = "number" | IUnit | IPercentageUnit;

export function ModalCreateStateVariable(props: IModalCreateStateVariableProps): JSX.Element {
  const textInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string>("");
  const [type, setType] = useState<IStateVariableType | undefined>(undefined);
  const [showTypeError, setShowTypeError] = useState<boolean>(false);
  const typeValues: [IStateVariableType, string][] = [
    ["number", "Number"],
    ["kg", "Weight (kg)"],
    ["lb", "Weight (lb)"],
    ["%", "Percentage"],
  ];

  return (
    <Modal name="new-state-variable-modal" onClose={props.onClose} shouldShowClose={true}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const isValid = textInputRef.current?.checkValidity();
          if (!type) {
            setShowTypeError(true);
            return;
          }
          if (name && isValid) {
            props.onCreate(name, type);
            props.onClose();
          }
        }}
        className="flex flex-col items-center"
      >
        <h2 className="mb-1 text-lg font-bold text-center">Add New State Variable</h2>
        <p className="mb-2 text-xs text-grayv3-main">
          You can use state variables to store values between workouts, or parameterize your progress scripts. Use them
          via <strong>state.yourVariable</strong> in the script.
        </p>
        <Input
          label="Variable name"
          type="text"
          placeholder="MyVariable"
          ref={textInputRef}
          pattern="^[a-zA-Z_][a-zA-Z0-9_]*$"
          patternMessage="Variable names must start with a letter or underscore, and can only contain letters, numbers, and underscores."
          value={name}
          required={true}
          requiredMessage="Please enter a name for the variable"
          onInput={(e) => {
            setName((e.target as HTMLInputElement).value);
          }}
        />
        <div className="w-full py-2">
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
          {showTypeError && <div className="text-xs text-redv2-main">Please select a type for the variable.</div>}
        </div>
        <div className="mt-4 text-center">
          <Button kind="orange" name="modal-create-state-variable-submit">
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
