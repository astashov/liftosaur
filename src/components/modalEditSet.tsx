import { IDispatch } from "../ducks/types";
import { JSX, h } from "preact";
import { useRef } from "preact/hooks";
import { Modal } from "./modal";
import { Button } from "./button";
import { Weight } from "../models/weight";
import { inputClassName } from "./input";
import { EditProgressEntry } from "../models/editProgressEntry";
import { IconQuestion } from "./iconQuestion";
import { IUnit, ISet } from "../types";

interface IModalWeightProps {
  dispatch: IDispatch;
  units: IUnit;
  isWarmup: boolean;
  entryIndex: number;
  setIndex?: number;
  set?: ISet;
  isHidden: boolean;
}

export function ModalEditSet(props: IModalWeightProps): JSX.Element {
  const set = props.set;
  const repsInput = useRef<HTMLInputElement>(null);
  const weightInput = useRef<HTMLInputElement>(null);
  const isAmrapInput = useRef<HTMLInputElement>(null);
  return (
    <Modal isHidden={props.isHidden} autofocusInputRef={repsInput}>
      <h3 className="pb-2 font-bold">Please enter reps and weight</h3>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex items-center">
          <div className="w-24 mr-2">
            <input
              ref={repsInput}
              data-cy="modal-edit-set-reps-input"
              className={`${inputClassName}`}
              value={set?.reps}
              required
              type="number"
              min="1"
              placeholder="Reps"
            />
          </div>
          <div>x</div>
          <div className="w-24 mx-2">
            <input
              ref={weightInput}
              data-cy="modal-edit-set-weight-input"
              className={inputClassName}
              value={Weight.is(set?.weight) ? set?.weight.value : set?.weight}
              required
              type="number"
              step="0.05"
              min="0"
              placeholder="Weight"
            />
          </div>
          <div>{props.units}</div>
        </div>
        {!props.isWarmup && (
          <div className="mt-1 ml-1">
            <label>
              <input data-cy="modal-edit-set-amrap-input" ref={isAmrapInput} type="checkbox" checked={set?.isAmrap} />
              <strong className="ml-2">
                Is AMRAP?
                <button className="ml-1" onClick={() => alert("As Many Reps As Possible.")}>
                  <IconQuestion width={12} height={12} />
                </button>
              </strong>
            </label>
          </div>
        )}
        <div className="mt-4 text-right">
          <Button
            type="button"
            kind="gray"
            data-cy="modal-edit-set-cancel"
            className="mr-3"
            onClick={() => {
              EditProgressEntry.hideEditSetModal(props.dispatch);
            }}
          >
            Cancel
          </Button>
          <Button
            kind="green"
            data-cy="modal-edit-set-submit"
            className="ls-modal-edit-set"
            type="submit"
            onClick={() => {
              if (repsInput.current.validity.valid && weightInput.current.validity.valid) {
                const reps = parseInt(repsInput.current.value, 10);
                const weight = parseInt(weightInput.current.value, 10);
                const isAmrap = !!(isAmrapInput.current?.checked || false);
                if (!isNaN(reps) && !isNaN(weight)) {
                  const newSet: ISet = { reps, weight: Weight.build(weight, props.units), isAmrap };
                  EditProgressEntry.editSet(props.dispatch, props.isWarmup, newSet, props.entryIndex, props.setIndex);
                } else {
                  EditProgressEntry.hideEditSetModal(props.dispatch);
                }
              }
            }}
          >
            Done
          </Button>
        </div>
      </form>
    </Modal>
  );
}
