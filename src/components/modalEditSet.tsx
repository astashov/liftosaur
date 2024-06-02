import { IDispatch } from "../ducks/types";
import { JSX, h } from "preact";
import { useRef, useState } from "preact/hooks";
import { Modal } from "./modal";
import { Button } from "./button";
import { Weight } from "../models/weight";
import { EditProgressEntry } from "../models/editProgressEntry";
import { IconQuestion } from "./icons/iconQuestion";
import { ISet, IProgramExercise, ISubscription, ISettings, IExerciseType } from "../types";
import { GroupHeader } from "./groupHeader";
import { Subscriptions } from "../utils/subscriptions";
import { ProgramExercise } from "../models/programExercise";
import { InputNumber } from "./inputNumber";
import { InputWeight } from "./inputWeight";
import { MathUtils } from "../utils/math";

interface IModalWeightProps {
  subscription: ISubscription;
  dispatch: IDispatch;
  settings: ISettings;
  isWarmup: boolean;
  progressId: number;
  exerciseType?: IExerciseType;
  programExercise?: IProgramExercise;
  allProgramExercises?: IProgramExercise[];
  entryIndex: number;
  setIndex?: number;
  setsLength: number;
  set?: ISet;
  isTimerDisabled?: boolean;
  isHidden: boolean;
}

function getPlatesStr(
  subscription: ISubscription,
  weight: number,
  settings: ISettings,
  exerciseType: IExerciseType
): string | undefined {
  if (Subscriptions.hasSubscription(subscription)) {
    const value = Weight.build(weight, settings.units);
    const plates = Weight.calculatePlates(value, settings, exerciseType);
    const oneside = Weight.formatOneSide(settings, plates.plates, exerciseType);
    return oneside;
  } else {
    return undefined;
  }
}

export function ModalEditSet(props: IModalWeightProps): JSX.Element {
  const set = props.set;
  const isAmrapInput = useRef<HTMLInputElement>(null);
  const [roundedWeight, setRoundedWeight] = useState(
    Weight.round(set?.weight || Weight.build(0, props.settings.units), props.settings, props.exerciseType)
  );
  const initialRpe = set?.rpe;
  const [rpe, setRpe] = useState(initialRpe ?? 0);
  const [reps, setReps] = useState(set?.reps ?? 5);
  const quickAddSets = props.programExercise
    ? ProgramExercise.getQuickAddSets(props.programExercise, props.allProgramExercises || [])
    : false;
  const enableRpe = props.programExercise
    ? ProgramExercise.getEnableRpe(props.programExercise, props.allProgramExercises || [])
    : false;

  const [platesStr, setPlatesStr] = useState<string | undefined>(
    props.set && props.exerciseType
      ? getPlatesStr(props.subscription, roundedWeight.value, props.settings, props.exerciseType)
      : undefined
  );
  return (
    <Modal
      isHidden={props.isHidden}
      isFullWidth={true}
      shouldShowClose={true}
      maxWidth="480px"
      onClose={() => {
        EditProgressEntry.hideEditSetModal(props.dispatch);
      }}
    >
      <GroupHeader size="large" name="Please enter reps and weight" />
      {!quickAddSets && (
        <h4 className="mb-2 text-xs text-grayv2-main">
          It changes reps and weight <strong>only for this workout!</strong> If you want to change them for this and the
          future workouts, make changes <strong>in the program</strong>.
        </h4>
      )}
      <form onSubmit={(e) => e.preventDefault()}>
        <div>
          <div className="mb-2">
            <InputNumber
              data-cy="modal-edit-set-reps-input"
              value={reps}
              required
              min={1}
              label="Reps"
              onUpdate={(newValue) => {
                setReps(newValue);
              }}
            />
          </div>
          <div className="mb-2">
            <InputWeight
              units={["kg", "lb"]}
              settings={props.settings}
              exerciseType={props.exerciseType}
              data-cy="modal-edit-set-weight-input"
              onUpdate={(newWeight) => {
                if (Weight.is(newWeight)) {
                  setRoundedWeight(newWeight);
                  if (Subscriptions.hasSubscription(props.subscription) && props.exerciseType) {
                    const plates = Weight.calculatePlates(newWeight, props.settings, props.exerciseType);
                    const oneside = Weight.formatOneSide(props.settings, plates.plates, props.exerciseType);
                    setPlatesStr(oneside);
                  }
                }
              }}
              value={roundedWeight}
              label="Weight"
            />
          </div>
          {!props.isWarmup && enableRpe && (
            <div className="mb-2">
              <InputNumber
                data-cy="modal-edit-set-reps-input"
                value={rpe}
                min={0}
                max={10}
                step={0.5}
                label="RPE"
                onUpdate={(newValue) => {
                  setRpe(newValue);
                }}
              />
            </div>
          )}
        </div>
        {!props.isWarmup && (
          <div className="mt-1 ml-1">
            <label>
              <input data-cy="modal-edit-set-amrap-input" ref={isAmrapInput} type="checkbox" checked={set?.isAmrap} />
              <strong className="ml-2">
                Is AMRAP?
                <button className="ml-1 nm-is-amrap" onClick={() => alert("As Many Reps As Possible.")}>
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
            name="modal-edit-set-cancel"
            type="button"
            kind="grayv2"
            data-cy="modal-edit-set-cancel"
            className="mr-3"
            onClick={() => {
              EditProgressEntry.hideEditSetModal(props.dispatch);
            }}
          >
            Cancel
          </Button>
          <Button
            name="modal-edit-set-submit"
            kind="orange"
            data-cy="modal-edit-set-submit"
            className="ls-modal-edit-set"
            type="submit"
            onClick={() => {
              const repsValue = MathUtils.round(MathUtils.clamp(reps, 1), 1);
              const weightValue = Weight.round(roundedWeight, props.settings, props.exerciseType);
              const rpeValue = enableRpe ? MathUtils.round(MathUtils.clamp(rpe, 0, 10), 0.5) : undefined;
              const isAmrap = !!(isAmrapInput.current?.checked || false);
              const newSet: ISet = {
                reps: repsValue,
                weight: weightValue,
                isAmrap,
                completedReps:
                  props.programExercise != null && quickAddSets && props.setIndex == null ? repsValue : undefined,
                rpe: rpeValue != null ? rpe : undefined,
                completedRpe:
                  props.programExercise != null && quickAddSets && rpeValue != null && props.setIndex == null
                    ? rpeValue
                    : undefined,
              };
              EditProgressEntry.editSet(props.dispatch, props.isWarmup, newSet, props.entryIndex, props.setIndex);
              if (!props.isTimerDisabled && quickAddSets && !props.isWarmup) {
                props.dispatch({
                  type: "StartTimer",
                  timestamp: new Date().getTime(),
                  mode: "workout",
                  entryIndex: props.entryIndex,
                  setIndex: props.setIndex ?? props.setsLength,
                });
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
