import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { Modal } from "./modal";
import { IAllEquipment, IEquipment, IUnit } from "../types";
import { GroupHeader } from "./groupHeader";
import { SendMessage } from "../utils/sendMessage";
import { equipmentName } from "../models/exercise";

interface IProps {
  units: IUnit;
  equipment: IEquipment;
  onInput: (value?: number) => void;
  isHidden: boolean;
  allEquipment: IAllEquipment;
}

export function ModalNewFixedWeight(props: IProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const name = equipmentName(props.equipment, props.allEquipment);
  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => props.onInput(undefined)}
    >
      <GroupHeader size="large" name={`Enter new ${name} fixed weight`} />
      <form onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          className="block w-full px-4 py-2 text-base leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type={SendMessage.isIos() ? "number" : "tel"}
          min="0"
          placeholder={`${name} weight in ${props.units}`}
        />
        <div className="mt-4 text-right">
          <Button
            name="modal-new-fixed-weight-cancel"
            type="button"
            kind="grayv2"
            className="mr-3"
            onClick={() => props.onInput(undefined)}
          >
            Cancel
          </Button>
          <Button
            kind="orange"
            type="submit"
            className="ls-add-plate"
            name="modal-new-fixed-weight-submit"
            onClick={() => {
              const value = textInput.current?.value;
              const numValue = value != null ? parseFloat(value) : undefined;
              props.onInput(numValue != null && !isNaN(numValue) ? numValue : undefined);
            }}
          >
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}
