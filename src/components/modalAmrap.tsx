import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";
import { Input } from "./input";

interface IModalAmrapProps {
  isHidden: boolean;
  dispatch: IDispatch;
  initialReps?: number;
  initialRpe?: number;
  isAmrap: boolean;
  logRpe: boolean;
  onDone?: () => void;
}

export function ModalAmrap(props: IModalAmrapProps): JSX.Element {
  const amrapInput = useRef<HTMLInputElement>(null);
  const rpeInput = useRef<HTMLInputElement>(null);

  function onDone(amrapValue?: number, rpeValue?: number): void {
    props.dispatch({ type: "ChangeAMRAPAction", amrapValue, rpeValue, isAmrap: props.isAmrap, logRpe: props.logRpe });
    if (props.onDone != null) {
      props.onDone();
    }
  }

  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={props.isAmrap ? amrapInput : props.logRpe ? rpeInput : undefined}
      shouldShowClose={true}
      onClose={() => onDone(undefined, undefined)}
    >
      <form onSubmit={(e) => e.preventDefault()}>
        {props.isAmrap && (
          <div className="mb-2">
            <Input
              label="Number of completed reps"
              defaultValue={props.initialReps}
              ref={amrapInput}
              data-cy="modal-amrap-input"
              data-name="modal-input-autofocus"
              type="tel"
              min="0"
            />
          </div>
        )}
        {props.logRpe && (
          <div className="mb-2">
            <Input
              label="Completed RPE"
              defaultValue={props.initialRpe}
              ref={rpeInput}
              data-cy="modal-rpe-input"
              type="number"
              min="0"
              max="10"
            />
          </div>
        )}
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
              const amrapValue = amrapInput.current?.value;
              const amrapNumValue = amrapValue != null ? parseInt(amrapValue, 10) : undefined;

              const rpeValue = rpeInput.current?.value;
              const rpeNumValue = rpeValue != null ? parseFloat(rpeValue) : undefined;

              onDone(
                amrapNumValue != null && !isNaN(amrapNumValue) ? amrapNumValue : undefined,
                rpeNumValue != null && !isNaN(rpeNumValue) ? rpeNumValue : undefined
              );
            }}
          >
            Done
          </Button>
        </div>
      </form>
    </Modal>
  );
}
