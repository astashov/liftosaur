import { IDispatch } from "../ducks/types";
import { JSX, h } from "preact";
import { useRef } from "preact/hooks";
import { Modal } from "./modal";
import { Button } from "./button";
import { Weight } from "../models/weight";
import { inputClassName } from "./input";
import { EditProgressEntry } from "../models/editProgressEntry";
import { IconQuestion } from "./icons/iconQuestion";
import { IUnit, ISet } from "../types";
import { GroupHeader } from "./groupHeader";

interface IModalWeightProps {
  dispatch: IDispatch;
  units: IUnit;
  isWarmup: boolean;
  progressId: number;
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
    <Modal
      isHidden={props.isHidden}
      autofocusInputRef={repsInput}
      shouldShowClose={true}
      onClose={() => {
        EditProgressEntry.hideEditSetModal(props.dispatch, props.progressId);
      }}
    >
      <GroupHeader size="large" name="Please enter reps and weight" />
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex items-center">
          <div className="w-24 mr-2">
            <input
              ref={repsInput}
              data-cy="modal-edit-set-reps-input"
              className={`${inputClassName}`}
              value={set?.reps}
              required
              type="tel"
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
              type="tel"
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
            kind="grayv2"
            data-cy="modal-edit-set-cancel"
            className="mr-3"
            onClick={() => {
              EditProgressEntry.hideEditSetModal(props.dispatch, props.progressId);
            }}
          >
            Cancel
          </Button>
          <Button
            kind="orange"
            data-cy="modal-edit-set-submit"
            className="ls-modal-edit-set"
            type="submit"
            onClick={() => {
              if (repsInput.current.validity.valid && weightInput.current.validity.valid) {
                const reps = parseInt(repsInput.current.value, 10);
                const weight = parseFloat(weightInput.current.value);
                const isAmrap = !!(isAmrapInput.current?.checked || false);
                if (!isNaN(reps) && !isNaN(weight)) {
                  const newSet: ISet = { reps, weight: Weight.build(weight, props.units), isAmrap };
                  EditProgressEntry.editSet(
                    props.dispatch,
                    props.progressId,
                    props.isWarmup,
                    newSet,
                    props.entryIndex,
                    props.setIndex
                  );
                } else {
                  EditProgressEntry.hideEditSetModal(props.dispatch, props.progressId);
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
