import { IDispatch } from "../ducks/types";
import { JSX, h } from "preact";
import { useRef } from "preact/hooks";
import { Modal } from "./modal";
import { Button } from "./button";

export function ModalWeight(props: { dispatch: IDispatch; weight: number }): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <Modal>
      <h3 className="pb-2 font-bold">Please enter weight</h3>
      <form>
        <input
          ref={textInput}
          className="block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          value={props.weight}
          type="number"
          min="0"
          placeholder="Weight in lbs"
          autofocus
        />
        <div className="mt-4 text-right">
          <Button
            type="button"
            kind="gray"
            className="mr-3"
            onClick={() => props.dispatch({ type: "ConfirmWeightAction", weight: undefined })}
          >
            Clear
          </Button>
          <Button
            kind="green"
            type="submit"
            onClick={() => {
              const value = textInput.current?.value;
              const numValue = value != null ? parseInt(value, 10) : undefined;
              props.dispatch({
                type: "ConfirmWeightAction",
                weight: numValue != null && !isNaN(numValue) ? numValue : undefined,
              });
            }}
          >
            Done
          </Button>
        </div>
      </form>
    </Modal>
  );
}
