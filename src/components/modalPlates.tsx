import React, { JSX } from "react";
import { useRef } from "react";
import { Button } from "./button";
import { Modal } from "./modal";
import { IUnit } from "../types";
import { GroupHeader } from "./groupHeader";
import { SendMessage } from "../utils/sendMessage";

interface IProps {
  units: IUnit;
  onInput: (value?: number) => void;
  isHidden: boolean;
}

export function ModalPlates(props: IProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => props.onInput(undefined)}
    >
      <GroupHeader size="large" name="Enter new plate weight" />
      <form onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          data-cy="plate-input"
          className="block w-full px-4 py-2 text-base leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type={SendMessage.isIos() ? "number" : "tel"}
          min="0"
          placeholder={`Plate weight in ${props.units}`}
        />
        <div className="mt-4 text-right">
          <Button
            name="modal-new-plate-weight-cancel"
            type="button"
            kind="grayv2"
            className="mr-3"
            onClick={() => props.onInput(undefined)}
          >
            Cancel
          </Button>
          <Button
            kind="orange"
            name="modal-new-plate-weight-submit"
            type="submit"
            data-cy="add-plate"
            className="ls-add-plate"
            onClick={() => {
              const value = textInput.current!.value;
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
