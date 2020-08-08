import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";

interface IModalAmrapProps {
  isHidden: boolean;
  dispatch: IDispatch;
}

export function ModalAmrap(props: IModalAmrapProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);

  return (
    <Modal isHidden={props.isHidden} autofocusInputRef={textInput}>
      <h3 className="pb-2 font-bold">Please enter number of AMRAP reps</h3>
      <form onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          data-name="modal-input-autofocus"
          className="block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type="number"
          min="0"
          placeholder="Number of completed reps"
        />
        <div className="mt-4 text-right">
          <Button
            type="button"
            kind="gray"
            className="mr-3"
            onClick={() => props.dispatch({ type: "ChangeAMRAPAction", value: undefined })}
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
                type: "ChangeAMRAPAction",
                value: numValue != null && !isNaN(numValue) ? numValue : undefined,
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
