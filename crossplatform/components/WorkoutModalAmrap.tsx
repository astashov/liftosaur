import React, { useState } from "react";
import { View, Text } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import type { IHistoryRecord, IPercentage, IProgramState, ISettings, IWeight } from "@shared/types";
import type { IPlannerProgramExercise } from "@shared/pages/planner/models/types";
import type { IByExercise } from "@shared/pages/planner/plannerEvaluator";
import { ObjectUtils_keys } from "@shared/utils/object";
import { Weight_build, Weight_is, Weight_isPct, Weight_buildPct } from "@shared/models/weight";
import { MathUtils_round } from "@shared/utils/math";
import {
  PlannerProgramExercise_getStateMetadata,
  PlannerProgramExercise_getState,
} from "@shared/pages/planner/models/plannerProgramExercise";
import { Exercise_getIsUnilateral } from "@shared/models/exercise";
import { BottomSheetOrModal } from "./BottomSheetOrModal";
import { Button } from "./Button";
import { GroupHeader } from "./GroupHeader";
import { InputNumber } from "./InputNumber";
import { InputWeight } from "./InputWeight";

interface IProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
  isPlayground: boolean;
  settings: ISettings;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  onDone?: () => void;
}

export function WorkoutModalAmrap(props: IProps): React.ReactElement | null {
  const progress = props.progress;
  const amrapModal = progress?.ui?.amrapModal;
  if (!amrapModal) {
    return null;
  }
  const entryIndex = amrapModal.entryIndex || 0;
  const setIndex = amrapModal.setIndex || 0;
  const entry = progress.entries[entryIndex];
  const isUnilateral = Exercise_getIsUnilateral(entry?.exercise || props.programExercise?.exerciseType, props.settings);

  const initialReps = entry?.sets[setIndex]?.completedReps ?? entry?.sets[setIndex]?.reps;
  const initialRepsLeft = isUnilateral
    ? (entry?.sets[setIndex]?.completedRepsLeft ?? entry?.sets[setIndex]?.reps)
    : undefined;
  const initialRpe = entry?.sets[setIndex]?.completedRpe ?? entry?.sets[setIndex]?.rpe;
  const initialWeight = entry?.sets[setIndex]?.weight;

  const isAmrap = !!amrapModal.isAmrap;
  const logRpe = !!amrapModal.logRpe;
  const askWeight = !!amrapModal.askWeight;
  const userVars = !!amrapModal.userVars;

  return (
    <AmrapContent
      dispatch={props.dispatch}
      settings={props.settings}
      isPlayground={props.isPlayground}
      programExercise={props.programExercise}
      otherStates={props.otherStates}
      entry={entry}
      entryIndex={entryIndex}
      setIndex={setIndex}
      isAmrap={isAmrap}
      logRpe={logRpe}
      askWeight={askWeight}
      userVars={userVars}
      isUnilateral={isUnilateral}
      initialReps={initialReps}
      initialRepsLeft={initialRepsLeft}
      initialRpe={initialRpe}
      initialWeight={initialWeight}
      onDone={props.onDone}
    />
  );
}

interface IAmrapContentProps {
  dispatch: IDispatch;
  settings: ISettings;
  isPlayground: boolean;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  entry: IHistoryRecord["entries"][0];
  entryIndex: number;
  setIndex: number;
  isAmrap: boolean;
  logRpe: boolean;
  askWeight: boolean;
  userVars: boolean;
  isUnilateral: boolean;
  initialReps?: number;
  initialRepsLeft?: number;
  initialRpe?: number;
  initialWeight?: IWeight;
  onDone?: () => void;
}

function AmrapContent(props: IAmrapContentProps): React.ReactElement {
  const [repsInputValue, setRepsInputValue] = useState<number | undefined>(props.initialReps);
  const [repsLeftInputValue, setRepsLeftInputValue] = useState<number | undefined>(props.initialRepsLeft);
  const [weightInputValue, setWeightInputValue] = useState<IWeight | IPercentage | undefined>(props.initialWeight);
  const [rpeInputValue, setRpeInputValue] = useState<number | undefined>(props.initialRpe);

  const stateMetadata = props.programExercise
    ? PlannerProgramExercise_getStateMetadata(props.programExercise) || {}
    : {};
  const stateMetadataKeys = ObjectUtils_keys(stateMetadata).filter((k) => stateMetadata[k]?.userPrompted);
  const state = props.programExercise ? PlannerProgramExercise_getState(props.programExercise) : {};
  const initialUserVarInputValues = stateMetadataKeys.reduce<Record<string, number | IWeight | IPercentage>>(
    (memo, k) => {
      memo[k] = state[k];
      return memo;
    },
    {}
  );
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
      setIndex: props.setIndex,
      entryIndex: props.entryIndex,
      programExercise: props.programExercise,
      isPlayground: props.isPlayground,
      otherStates: props.otherStates,
      isAmrap: props.isAmrap,
      logRpe: props.logRpe,
      askWeight: props.askWeight,
      userVars: userVarValues,
    });
    props.onDone?.();
  }

  return (
    <BottomSheetOrModal isHidden={false} shouldShowClose={true} onClose={() => onDone()}>
      <View className="mx-4 my-4">
        {props.isAmrap && (
          <View>
            {props.isUnilateral && (
              <View className="mb-2">
                <Text className="mb-1 text-sm font-semibold">Completed reps (left)</Text>
                <InputNumber
                  data-cy="modal-amrap-left-input"
                  value={repsLeftInputValue ?? 0}
                  min={0}
                  step={1}
                  onBlur={(v) => setRepsLeftInputValue(v)}
                  width={4}
                />
              </View>
            )}
            <View className="mb-2">
              <Text className="mb-1 text-sm font-semibold">
                {props.isUnilateral ? "Completed reps (right)" : "Completed reps"}
              </Text>
              <InputNumber
                data-cy="modal-amrap-input"
                value={repsInputValue ?? 0}
                min={0}
                step={1}
                onBlur={(v) => setRepsInputValue(v)}
                width={4}
              />
            </View>
          </View>
        )}
        {props.askWeight && (
          <View className="mb-2">
            <Text className="mb-1 text-sm font-semibold">Weight</Text>
            <InputWeight
              data-cy="modal-amrap-weight-input"
              value={weightInputValue as IWeight | undefined}
              settings={props.settings}
              onBlur={(v) => setWeightInputValue(v)}
            />
          </View>
        )}
        {props.logRpe && (
          <View className="mb-2">
            <Text className="mb-1 text-sm font-semibold">Completed RPE</Text>
            <InputNumber
              data-cy="modal-rpe-input"
              value={rpeInputValue ?? 0}
              min={0}
              max={10}
              step={1}
              onBlur={(v) => setRpeInputValue(v)}
              width={4}
            />
          </View>
        )}
        {props.programExercise && props.userVars && (
          <View>
            <GroupHeader name="Enter new state variables values" />
            {ObjectUtils_keys(userVarInputValues).map((key, i) => {
              const value = userVarInputValues[key];
              const num = Weight_is(value) || Weight_isPct(value) ? value.value : (value as number);
              const label = Weight_is(value) ? `${key}, ${value.unit}` : String(key);
              return (
                <View key={String(key)} className={i !== 0 ? "mt-2" : ""}>
                  <Text className="mb-1 text-sm font-semibold">{label}</Text>
                  <InputNumber
                    data-cy={`modal-state-vars-user-prompt-input-${String(key)}`}
                    value={num}
                    min={0}
                    step={1}
                    onBlur={(newValue) => {
                      if (newValue != null) {
                        setUserVarInputValues((prev) => {
                          const previousValue = prev[key];
                          const typedValue = Weight_is(previousValue)
                            ? Weight_build(newValue, previousValue.unit)
                            : Weight_isPct(previousValue)
                              ? Weight_buildPct(newValue)
                              : newValue;
                          return { ...prev, [key]: typedValue };
                        });
                      }
                    }}
                    width={4}
                  />
                </View>
              );
            })}
          </View>
        )}
        <View className="flex-row justify-end gap-3 mt-4">
          <Button
            name="modal-amrap-clear"
            data-cy="modal-amrap-clear"
            kind="grayv2"
            buttonSize="md"
            onPress={() => onDone()}
          >
            Cancel
          </Button>
          <Button
            name="modal-amrap-submit"
            data-cy="modal-amrap-submit"
            kind="purple"
            buttonSize="md"
            onPress={() => {
              const amrapValue = props.isAmrap ? (repsInputValue ?? 0) : undefined;
              const amrapLeftValue = props.isAmrap && props.isUnilateral ? (repsLeftInputValue ?? 0) : undefined;
              const rpeValue = props.logRpe ? rpeInputValue : undefined;
              const weightOrPctValue = props.askWeight
                ? (weightInputValue ?? Weight_build(0, props.settings.units))
                : undefined;
              const weightValue =
                weightOrPctValue != null && Weight_isPct(weightOrPctValue)
                  ? Weight_build(weightOrPctValue.value, props.settings.units)
                  : (weightOrPctValue as IWeight | undefined);
              onDone(amrapValue, amrapLeftValue, rpeValue, weightValue, userVarInputValues);
            }}
          >
            Done
          </Button>
        </View>
      </View>
    </BottomSheetOrModal>
  );
}
