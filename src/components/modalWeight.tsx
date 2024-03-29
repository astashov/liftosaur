import { IDispatch } from "../ducks/types";
import { JSX, h } from "preact";
import { useRef } from "preact/hooks";
import { Modal } from "./modal";
import { Button } from "./button";
import { Weight } from "../models/weight";
import { IProgramExercise, IUnit, IWeight } from "../types";
import { GroupHeader } from "./groupHeader";
import { SendMessage } from "../utils/sendMessage";

interface IModalWeightProps {
  dispatch: IDispatch;
  units: IUnit;
  weight: number | IWeight;
  programExercise?: IProgramExercise;
  isHidden: boolean;
}

export function ModalWeight(props: IModalWeightProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  return (
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={textInput}
      shouldShowClose={true}
      onClose={() => props.dispatch({ type: "ConfirmWeightAction", weight: undefined })}
    >
      <GroupHeader size="large" name="Please enter weight" />
      <h4 className="text-sm">
        It changes <strong>only for this workout!</strong> If you want to change for this and future workouts, change
        the weight in the program.
      </h4>
      <form onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          data-cy="modal-weight-input"
          className="block w-full px-4 py-2 text-base leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          value={Weight.is(props.weight) ? props.weight.value : props.weight}
          type={SendMessage.isIos() ? "number" : "tel"}
          min="0"
          placeholder={`Weight in ${props.units}`}
        />
        <div className="mt-4 text-right">
          <Button
            name="modal-weight-cancel"
            type="button"
            kind="grayv2"
            data-cy="modal-weight-cancel"
            className="mr-3"
            onClick={() => props.dispatch({ type: "ConfirmWeightAction", weight: undefined })}
          >
            Cancel
          </Button>
          <Button
            name="modal-weight-submit"
            kind="orange"
            data-cy="modal-weight-submit"
            className="ls-modal-set-weight"
            type="submit"
            onClick={() => {
              const value = textInput.current?.value;
              const numValue = value != null ? parseFloat(value) : undefined;
              props.dispatch({
                type: "ConfirmWeightAction",
                weight: numValue != null && !isNaN(numValue) ? Weight.build(numValue, props.units) : undefined,
                programExercise: props.programExercise,
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
