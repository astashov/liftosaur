import { h, JSX, Fragment } from "preact";
import { useState } from "preact/hooks";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";
import { IHistoryRecord, IPercentage, IProgramState, ISettings, IWeight } from "../types";
import { GroupHeader } from "./groupHeader";
import { ObjectUtils } from "../utils/object";
import { Weight } from "../models/weight";
import { InputWeight } from "./inputWeight";
import { InputNumber } from "./inputNumber";
import { MathUtils } from "../utils/math";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../pages/planner/models/types";

interface IModalAmrapProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
  settings: ISettings;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  onDone?: () => void;
}

export function ModalAmrap(props: IModalAmrapProps): JSX.Element {
  const progress = props.progress;
  const amrapModal = progress?.ui?.amrapModal;
  const entryIndex = amrapModal?.entryIndex || 0;
  const setIndex = amrapModal?.setIndex || 0;
  const entry = progress.entries[entryIndex];
  const initialReps = entry?.sets[setIndex]?.completedReps ?? entry?.sets[setIndex]?.reps;
  const initialRpe = entry?.sets[setIndex]?.completedRpe ?? entry?.sets[setIndex]?.rpe;
  const initialWeight = entry?.sets[setIndex]?.weight;

  const isAmrap = !!amrapModal?.isAmrap;
  const logRpe = !!amrapModal?.logRpe;
  const askWeight = !!amrapModal?.askWeight;
  const userVars = !!amrapModal?.userVars;

  const [repsInputValue, setRepsInputValue] = useState<number | undefined>(initialReps);
  const [weightInputValue, setWeightInputValue] = useState<IWeight | IPercentage | undefined>(initialWeight);
  const [rpeInputValue, setRpeInputValue] = useState<number | undefined>(initialRpe);

  const stateMetadata = props.programExercise
    ? PlannerProgramExercise.getStateMetadata(props.programExercise) || {}
    : {};
  const stateMetadataKeys = ObjectUtils.keys(stateMetadata).filter((k) => stateMetadata[k]?.userPrompted);
  const state = props.programExercise ? PlannerProgramExercise.getState(props.programExercise) : {};
  const initialUserVarInputValues = stateMetadataKeys.reduce<
    Record<keyof typeof stateMetadata, number | IWeight | IPercentage>
  >((memo, k) => {
    memo[k] = state[k];
    return memo;
  }, {});
  const [userVarInputValues, setUserVarInputValues] = useState(initialUserVarInputValues);

  function onDone(
    amrapValue?: number,
    rpeValue?: number,
    weightValue?: IWeight,
    userVarValues: Record<string, number | IWeight | IPercentage> = {}
  ): void {
    props.dispatch({
      type: "ChangeAMRAPAction",
      amrapValue: amrapValue != null ? MathUtils.round(amrapValue, 1) : undefined,
      rpeValue: rpeValue != null ? MathUtils.round(rpeValue, 0.5) : undefined,
      weightValue,
      setIndex: setIndex,
      entryIndex: entryIndex,
      programExercise: props.programExercise,
      otherStates: props.otherStates,
      isAmrap: isAmrap,
      logRpe: logRpe,
      askWeight: askWeight,
      userVars: userVarValues,
    });
    if (props.onDone != null) {
      props.onDone();
    }
  }

  return (
    <Modal maxWidth="480px" isHidden={!amrapModal} isFullWidth={true} shouldShowClose={true} onClose={() => onDone()}>
      <form className="mx-1 my-4" onSubmit={(e) => e.preventDefault()}>
        {isAmrap && (
          <div className="mb-2">
            <InputNumber
              label="Completed reps"
              value={repsInputValue ?? 0}
              data-cy="modal-amrap-input"
              data-name="modal-input-autofocus"
              min={0}
              step={1}
              onUpdate={(newValue) => {
                setRepsInputValue(newValue);
              }}
            />
          </div>
        )}
        {askWeight && (
          <div className="mb-2">
            <InputWeight
              exerciseType={entry?.exercise || props.programExercise?.exerciseType}
              label="Weight"
              units={["kg", "lb"]}
              value={weightInputValue || Weight.build(0, props.settings.units)}
              data-cy="modal-amrap-weight-input"
              settings={props.settings}
              onUpdate={(newValue) => {
                setWeightInputValue(newValue);
              }}
            />
          </div>
        )}
        {logRpe && (
          <div className="mb-2">
            <InputNumber
              label="Completed RPE"
              value={rpeInputValue ?? 0}
              data-cy="modal-rpe-input"
              data-name="modal-rpe-autofocus"
              min={0}
              max={10}
              step={0.5}
              onUpdate={(newValue) => {
                setRpeInputValue(newValue);
              }}
            />
          </div>
        )}
        {props.programExercise && userVars && (
          <UserPromptedStateVars
            userVarInputValues={userVarInputValues}
            onUpdate={(key, value) => {
              setUserVarInputValues((prev) => {
                const previousValue = prev[key];
                const typedValue = Weight.is(previousValue)
                  ? Weight.build(value, previousValue.unit)
                  : Weight.isPct(previousValue)
                    ? Weight.buildPct(value)
                    : value;
                return { ...prev, [key]: typedValue };
              });
            }}
          />
        )}
        <div className="mt-4 text-right">
          <Button
            name="modal-amrap-clear"
            data-cy="modal-amrap-clear"
            type="button"
            kind="grayv2"
            className="mr-3"
            onClick={(e) => {
              e.preventDefault();
              onDone();
            }}
          >
            Cancel
          </Button>
          <Button
            name="modal-amrap-submit"
            kind="orange"
            type="submit"
            data-cy="modal-amrap-submit"
            className="ls-modal-set-amrap"
            onClick={(e) => {
              e.preventDefault();
              const amrapValue = isAmrap ? (repsInputValue ?? 0) : undefined;
              const rpeValue = logRpe ? rpeInputValue : undefined;
              const weightOrPctValue = askWeight
                ? (weightInputValue ?? Weight.build(0, props.settings.units))
                : undefined;
              const weightValue =
                weightOrPctValue != null && Weight.isPct(weightOrPctValue)
                  ? Weight.build(weightOrPctValue.value, props.settings.units)
                  : weightOrPctValue;

              onDone(amrapValue, rpeValue, weightValue, userVarInputValues);
            }}
          >
            Done
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface IUserPromptedStateVarsProps {
  userVarInputValues: Record<string, number | IWeight | IPercentage>;
  onUpdate: (key: string, value: number) => void;
}

export function UserPromptedStateVars(props: IUserPromptedStateVarsProps): JSX.Element {
  return (
    <>
      <GroupHeader size="large" name="Enter new state variables values" />
      {ObjectUtils.keys(props.userVarInputValues).map((key, i) => {
        return (
          <UserPromptedStateVar
            k={key}
            index={i}
            value={props.userVarInputValues[key]}
            onUpdate={(value) => props.onUpdate(key, value)}
          />
        );
      })}
    </>
  );
}

interface IUserPromptedStateVarProps {
  k: string;
  index: number;
  value: number | IWeight | IPercentage;
  onUpdate: (value: number) => void;
}

export function UserPromptedStateVar(props: IUserPromptedStateVarProps): JSX.Element {
  const { k: key, value } = props;
  const num = Weight.is(value) || Weight.isPct(value) ? value.value : value;
  const label = Weight.is(value) ? `${key}, ${value.unit}` : key;
  return (
    <div className={props.index !== 0 ? "mt-2" : ""}>
      <InputNumber
        data-cy={`modal-state-vars-user-prompt-input-${key}`}
        label={label}
        value={num}
        min={Weight.is(value) || Weight.isPct(value) ? 0 : undefined}
        step={1}
        onUpdate={props.onUpdate}
      />
    </div>
  );
}
