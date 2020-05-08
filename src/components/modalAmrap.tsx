import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";

export function ModalAmrap(props: { dispatch: IDispatch }): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <Modal>
      <h3 className="font-bold pb-2">Please enter number of AMRAP reps</h3>
      <form>
        <input
          ref={textInput}
          className="bg-white focus:outline-none focus:shadow-outline border border-gray-300 rounded-lg py-2 px-4 block w-full appearance-none leading-normal"
          type="number"
          min="0"
          placeholder="Number of completed reps"
          autofocus
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
