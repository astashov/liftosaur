import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";
import { GroupHeader } from "./groupHeader";

interface IModalAmrapProps {
  isHidden: boolean;
  dispatch: IDispatch;
  onDone?: () => void;
}

export function ModalAmrap(props: IModalAmrapProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);

  function onDone(value?: number): void {
    props.dispatch({ type: "ChangeAMRAPAction", value });
    if (props.onDone != null) {
      props.onDone();
    }
  }

  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => onDone(undefined)}
    >
      <GroupHeader size="large" name="Please enter number of AMRAP reps" />
      <form onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          data-cy="modal-amrap-input"
          data-name="modal-input-autofocus"
          className="block w-full px-4 py-2 text-base leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type="tel"
          min="0"
          placeholder="Number of completed reps"
        />
        <div className="mt-4 text-right">
          <Button
            data-cy="modal-amrap-clear"
            type="button"
            kind="grayv2"
            className="mr-3"
            onClick={() => onDone(undefined)}
          >
            Clear
          </Button>
          <Button
            kind="orange"
            type="submit"
            data-cy="modal-amrap-submit"
            className="ls-modal-set-amrap"
            onClick={() => {
              const value = textInput.current?.value;
              const numValue = value != null ? parseInt(value, 10) : undefined;
              onDone(numValue != null && !isNaN(numValue) ? numValue : undefined);
            }}
          >
            Done
          </Button>
        </div>
      </form>
    </Modal>
  );
}
