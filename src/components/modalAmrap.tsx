import { JSX, useState } from "react";
import { View } from "react-native";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Modal } from "./modal";
import { IHistoryRecord, IPercentage, IProgressUi, IProgramState, ISettings, IWeight } from "../types";
import { GroupHeader } from "./groupHeader";
import { ObjectUtils_keys } from "../utils/object";
import { Weight_build, Weight_is, Weight_isPct, Weight_buildPct } from "../models/weight";
import { InputWeight } from "./inputWeight";
import { InputNumber } from "./inputNumber";
import { MathUtils_round } from "../utils/math";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import {
  PlannerProgramExercise_getStateMetadata,
  PlannerProgramExercise_getState,
} from "../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { Exercise_getIsUnilateral } from "../models/exercise";

interface IModalAmrapProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
  isPlayground: boolean;
  settings: ISettings;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  onDone?: () => void;
}

export function ModalAmrap(props: IModalAmrapProps): JSX.Element {
  const amrapModal = props.progress?.ui?.amrapModal;
  return (
    <Modal maxWidth="480px" isHidden={!amrapModal} isFullWidth={true} shouldShowClose={true} onClose={props.onDone}>
      {amrapModal && (
        <ModalAmrapContent
          progress={props.progress}
          dispatch={props.dispatch}
          isPlayground={props.isPlayground}
          settings={props.settings}
          programExercise={props.programExercise}
          otherStates={props.otherStates}
          amrapModal={amrapModal}
          onDone={props.onDone}
        />
      )}
    </Modal>
  );
}

interface IModalAmrapContentProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
  isPlayground: boolean;
  settings: ISettings;
  amrapModal: NonNullable<IProgressUi["amrapModal"]>;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  onDone?: () => void;
}

export function ModalAmrapContent(props: IModalAmrapContentProps): JSX.Element {
  const progress = props.progress;
  const { entryIndex, setIndex } = props.amrapModal;
  const entry = progress.entries[entryIndex];
  const isUnilateral = Exercise_getIsUnilateral(entry?.exercise || props.programExercise?.exerciseType, props.settings);

  const initialReps = entry?.sets[setIndex]?.completedReps ?? entry?.sets[setIndex]?.reps;
  const initialRepsLeft = isUnilateral
    ? (entry?.sets[setIndex]?.completedRepsLeft ?? entry?.sets[setIndex]?.reps)
    : undefined;
  const initialRpe = entry?.sets[setIndex]?.completedRpe ?? entry?.sets[setIndex]?.rpe;
  const initialWeight = entry?.sets[setIndex]?.weight;

  const isAmrap = !!props.amrapModal.isAmrap;
  const logRpe = !!props.amrapModal.logRpe;
  const askWeight = !!props.amrapModal.askWeight;
  const userVars = !!props.amrapModal.userVars;

  const [repsInputValue, setRepsInputValue] = useState<number | undefined>(initialReps);
  const [repsLeftInputValue, setRepsLeftInputValue] = useState<number | undefined>(initialRepsLeft);
  const [weightInputValue, setWeightInputValue] = useState<IWeight | IPercentage | undefined>(initialWeight);
  const [rpeInputValue, setRpeInputValue] = useState<number | undefined>(initialRpe);

  const stateMetadata = props.programExercise
    ? PlannerProgramExercise_getStateMetadata(props.programExercise) || {}
    : {};
  const stateMetadataKeys = ObjectUtils_keys(stateMetadata).filter((k) => stateMetadata[k]?.userPrompted);
  const state = props.programExercise ? PlannerProgramExercise_getState(props.programExercise) : {};
  const initialUserVarInputValues = stateMetadataKeys.reduce<
    Record<keyof typeof stateMetadata, number | IWeight | IPercentage>
  >((memo, k) => {
    memo[k] = state[k];
    return memo;
  }, {});
  const [userVarInputValues, setUserVarInputValues] = useState(initialUserVarInputValues);

  function onDone(
    amrapValue?: number,
    amrapLeftValue?: number,
    rpeValue?: number,
    weightValue?: IWeight,
    userVarValues: Record<string, number | IWeight | IPercentage> = {}
  ): void {
    props.dispatch({
      type: "ChangeAMRAPAction",
      amrapValue: amrapValue != null ? MathUtils_round(amrapValue, 1) : undefined,
      amrapLeftValue: amrapLeftValue != null ? MathUtils_round(amrapLeftValue, 1) : undefined,
      rpeValue: rpeValue != null ? MathUtils_round(rpeValue, 0.5) : undefined,
      weightValue,
      setIndex: setIndex,
      entryIndex: entryIndex,
      programExercise: props.programExercise,
      isPlayground: props.isPlayground,
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
    <View className="mx-1 my-4">
      {isAmrap && (
        <View>
          {isUnilateral && (
            <View className="mb-2">
              <InputNumber
                label="Completed reps (left)"
                value={repsLeftInputValue ?? 0}
                data-cy="modal-amrap-left-input" data-testid="modal-amrap-left-input" testID="modal-amrap-left-input"
                data-name="modal-input-left-autofocus"
                min={0}
                step={1}
                onUpdate={(newValue) => {
                  setRepsLeftInputValue(newValue);
                }}
              />
            </View>
          )}
          <View className="mb-2">
            <InputNumber
              label={isUnilateral ? "Completed reps (right)" : "Completed reps"}
              value={repsInputValue ?? 0}
              data-cy="modal-amrap-input" data-testid="modal-amrap-input" testID="modal-amrap-input"
              data-name="modal-input-autofocus"
              min={0}
              step={1}
              onUpdate={(newValue) => {
                setRepsInputValue(newValue);
              }}
            />
          </View>
        </View>
      )}
      {askWeight && (
        <View className="mb-2">
          <InputWeight
            exerciseType={entry?.exercise || props.programExercise?.exerciseType}
            label="Weight"
            units={["kg", "lb"]}
            value={weightInputValue || Weight_build(0, props.settings.units)}
            data-cy="modal-amrap-weight-input" data-testid="modal-amrap-weight-input" testID="modal-amrap-weight-input"
            settings={props.settings}
            onUpdate={(newValue) => {
              setWeightInputValue(newValue);
            }}
          />
        </View>
      )}
      {logRpe && (
        <View className="mb-2">
          <InputNumber
            label="Completed RPE"
            value={rpeInputValue ?? 0}
            data-cy="modal-rpe-input" data-testid="modal-rpe-input" testID="modal-rpe-input"
            data-name="modal-rpe-autofocus"
            min={0}
            max={10}
            step={0.5}
            onUpdate={(newValue) => {
              setRpeInputValue(newValue);
            }}
          />
        </View>
      )}
      {props.programExercise && userVars && (
        <UserPromptedStateVars
          userVarInputValues={userVarInputValues}
          onUpdate={(key, value) => {
            setUserVarInputValues((prev) => {
              const previousValue = prev[key];
              const typedValue = Weight_is(previousValue)
                ? Weight_build(value, previousValue.unit)
                : Weight_isPct(previousValue)
                  ? Weight_buildPct(value)
                  : value;
              return { ...prev, [key]: typedValue };
            });
          }}
        />
      )}
      <View className="flex-row justify-end gap-3 mt-4">
        <Button
          name="modal-amrap-clear"
          data-cy="modal-amrap-clear" data-testid="modal-amrap-clear" testID="modal-amrap-clear"
          kind="grayv2"
          onClick={() => {
            onDone();
          }}
        >
          Cancel
        </Button>
        <Button
          name="modal-amrap-submit"
          kind="purple"
          data-cy="modal-amrap-submit" data-testid="modal-amrap-submit" testID="modal-amrap-submit"
          className="ls-modal-set-amrap"
          onClick={() => {
            const amrapValue = isAmrap ? (repsInputValue ?? 0) : undefined;
            const amrapLeftValue = isAmrap && isUnilateral ? (repsLeftInputValue ?? 0) : undefined;
            const rpeValue = logRpe ? rpeInputValue : undefined;
            const weightOrPctValue = askWeight
              ? (weightInputValue ?? Weight_build(0, props.settings.units))
              : undefined;
            const weightValue =
              weightOrPctValue != null && Weight_isPct(weightOrPctValue)
                ? Weight_build(weightOrPctValue.value, props.settings.units)
                : weightOrPctValue;

            onDone(amrapValue, amrapLeftValue, rpeValue, weightValue, userVarInputValues);
          }}
        >
          Done
        </Button>
      </View>
    </View>
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
      {ObjectUtils_keys(props.userVarInputValues).map((key, i) => {
        return (
          <UserPromptedStateVar
            key={key}
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
  const num = Weight_is(value) || Weight_isPct(value) ? value.value : value;
  const label = Weight_is(value) ? `${key}, ${value.unit}` : key;
  return (
    <View className={props.index !== 0 ? "mt-2" : ""}>
      <InputNumber
        data-cy={`modal-state-vars-user-prompt-input-${key}`} data-testid={`modal-state-vars-user-prompt-input-${key}`} testID={`modal-state-vars-user-prompt-input-${key}`}
        label={label}
        value={num}
        min={Weight_is(value) || Weight_isPct(value) ? 0 : undefined}
        step={1}
        onUpdate={props.onUpdate}
      />
    </View>
  );
}
