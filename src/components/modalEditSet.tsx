import { IDispatch } from "../ducks/types";
import { JSX, h } from "preact";
import { useRef, useState } from "preact/hooks";
import { Modal } from "./modal";
import { Button } from "./button";
import { Weight } from "../models/weight";
import { inputClassName, selectInputOnFocus } from "./input";
import { EditProgressEntry } from "../models/editProgressEntry";
import { IconQuestion } from "./icons/iconQuestion";
import { ISet, IProgramExercise, ISubscription, IEquipment, ISettings } from "../types";
import { GroupHeader } from "./groupHeader";
import { Subscriptions } from "../utils/subscriptions";

interface IModalWeightProps {
  subscription: ISubscription;
  dispatch: IDispatch;
  settings: ISettings;
  isWarmup: boolean;
  progressId: number;
  equipment?: IEquipment;
  programExercise?: IProgramExercise;
  entryIndex: number;
  setIndex?: number;
  set?: ISet;
  isHidden: boolean;
}

function getPlatesStr(
  subscription: ISubscription,
  weight: number,
  settings: ISettings,
  equipment?: IEquipment
): string | undefined {
  if (Subscriptions.hasSubscription(subscription)) {
    const value = Weight.build(weight, settings.units);
    const plates = Weight.calculatePlates(value, settings, equipment);
    const oneside = Weight.formatOneSide(settings, plates.plates, equipment);
    return oneside;
  } else {
    return undefined;
  }
}

export function ModalEditSet(props: IModalWeightProps): JSX.Element {
  const set = props.set;
  const repsInput = useRef<HTMLInputElement>(null);
  const weightInput = useRef<HTMLInputElement>(null);
  const isAmrapInput = useRef<HTMLInputElement>(null);
  const initialWeight = Weight.is(set?.weight) ? set?.weight.value : set?.weight;

  const [platesStr, setPlatesStr] = useState<string | undefined>(
    props.set ? getPlatesStr(props.subscription, initialWeight || 0, props.settings, props.equipment) : undefined
  );
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
      {!props.programExercise?.quickAddSets && (
        <h4 className="mb-2 text-xs text-grayv2-main">
          It changes reps and weight <strong>only for this workout!</strong> If you want to change them for this and the
          future workouts, make changes <strong>in the program</strong>.
        </h4>
      )}
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex items-center">
          <div className="w-24 mr-2">
            <input
              ref={repsInput}
              data-cy="modal-edit-set-reps-input"
              onFocus={selectInputOnFocus}
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
              onFocus={selectInputOnFocus}
              className={inputClassName}
              onInput={(e) => {
                const target = e.target;
                if (Subscriptions.hasSubscription(props.subscription) && target instanceof HTMLInputElement) {
                  const value = Weight.build(parseFloat(target.value), props.settings.units);
                  const plates = Weight.calculatePlates(value, props.settings, props.equipment);
                  const oneside = Weight.formatOneSide(props.settings, plates.plates, props.equipment);
                  setPlatesStr(oneside);
                }
              }}
              // @ts-ignore
              defaultValue={initialWeight}
              required
              type="tel"
              step="0.05"
              min="0"
              placeholder="Weight"
            />
          </div>
          <div>{props.settings.units}</div>
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
        {platesStr != null && (
          <div className="mt-1 text-xs text-grayv2-main">
            Plates: <strong>{platesStr || "None"}</strong>
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
                const w = parseFloat(weightInput.current.value);
                const isAmrap = !!(isAmrapInput.current?.checked || false);
                if (!isNaN(reps) && !isNaN(w)) {
                  const newSet: ISet = {
                    reps,
                    weight: Weight.build(w, props.settings.units),
                    isAmrap,
                    completedReps:
                      props.programExercise != null && props.programExercise.quickAddSets ? reps : undefined,
                  };
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
