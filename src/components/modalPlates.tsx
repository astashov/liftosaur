import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { Modal } from "./modal";
import { IUnit } from "../models/weight";

interface IProps {
  units: IUnit;
  onInput: (value?: number) => void;
  isHidden: boolean;
}

export function ModalPlates(props: IProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <Modal isHidden={props.isHidden} autofocusInputRef={textInput}>
      <h3 className="pb-2 font-bold">Enter new plate weight</h3>
      <form onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          className="focus:outline-none focus:shadow-outline block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none"
          type="number"
          min="0"
          placeholder={`Plate weight in ${props.units}`}
        />
        <div className="mt-4 text-right">
          <Button type="button" kind="gray" className="mr-3" onClick={() => props.onInput(undefined)}>
            Cancel
          </Button>
          <Button
            kind="green"
            type="submit"
            className="ls-add-plate"
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
