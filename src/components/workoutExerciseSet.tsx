import type { JSX } from "react";
import { memo, useCallback } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import {
  ISettings,
  ISet,
  IExerciseType,
  ISubscription,
  IProgramState,
  IHistoryRecord,
  IWeight,
  IPercentage,
} from "../types";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { n } from "../utils/math";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { InputNumber2 } from "./inputNumber2";
import { InputWeight2 } from "./inputWeight2";
import { updateProgress } from "../models/state";
import { LensBuilder } from "lens-shmens";
import {
  WorkoutExerciseUtils_getBorderColor100,
  WorkoutExerciseUtils_getBgColor50,
  WorkoutExerciseUtils_getIconColor,
  WorkoutExerciseUtils_setsStatusToTextColorValue,
} from "../utils/workoutExerciseUtils";
import { FastText } from "./primitives/fastText";
import { StyledText, StyledText_cls } from "../utils/styledText";
import { useRem } from "../utils/useRem";
import { SwipeableRow } from "./swipeableRow";
import { CollectionUtils_removeAt } from "../utils/collection";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { EditProgressEntry_showEditSetModal } from "../models/editProgressEntry";
import { Reps_enforceCompletedSet, Reps_setsStatus, Reps_avgUnilateralCompletedReps } from "../models/set";
import {
  Weight_eq,
  Weight_rpeMultiplier,
  Weight_multiply,
  Weight_calculatePlates,
  Weight_formatOneSide,
  Weight_isPct,
  Weight_getOneRepMax,
} from "../models/weight";
import { Exercise_getIsUnilateral, Exercise_onerm } from "../models/exercise";
import { FocusedInputFlush_flush } from "../utils/focusedInputFlush";

export interface ISetColumnWidths {
  set: number;
  reps: number;
  separator: number;
  weight: number;
  rpe: number;
  check: number;
}

function computeRpeColumnWidth(rpeLabel: string, remValue: number): number {
  if (!rpeLabel) {
    return 0;
  }
  let units = 0.3;
  for (const ch of rpeLabel) {
    if (ch === ".") {
      units += 0.5;
    } else if (ch === "@") {
      units += 0.5;
    } else {
      units += 0.42;
    }
  }
  return Math.max(Math.round(units * remValue), Math.round(1.75 * remValue));
}

export function computeSetColumnWidths(remValue: number, isUnilateral: boolean, rpeLabel: string): ISetColumnWidths {
  const labelW = isUnilateral ? remValue : 0;
  const rpe = computeRpeColumnWidth(rpeLabel, remValue);
  return {
    set: Math.round(2.5 * remValue),
    reps: Math.round(3.5 * remValue) + labelW,
    separator: Math.round(1.5 * remValue),
    weight: Math.round(4 * remValue),
    rpe,
    check: rpe > 0 ? Math.round(2.5 * remValue) : Math.round(3.5 * remValue),
  };
}

interface IWorkoutExerciseSet {
  exerciseType: IExerciseType;
  day: number;
  type: "warmup" | "workout";
  lbSet: LensBuilder<IHistoryRecord, ISet, {}>;
  lbSets: LensBuilder<IHistoryRecord, ISet[], {}>;
  isCurrentProgress: boolean;
  lastSet?: ISet;
  set: ISet;
  helps?: string[];
  onStopShowingHint?: () => void;
  isNext?: boolean;
  subscription?: ISubscription;
  isPlayground: boolean;
  entryIndex: number;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  setIndex: number;
  columnWidths: ISetColumnWidths;
  settings: ISettings;
  dispatch: IDispatch;
}

function WorkoutExerciseSetInner(props: IWorkoutExerciseSet): JSX.Element {
  const set = props.set;
  const placeholderReps = `${set.minReps != null ? `${n(set.minReps)}-` : ""}${set.reps != null ? n(set.reps) : ""}${set.reps != null && set.isAmrap ? "+" : ""}`;
  const placeholderWeight = set.weight?.value != null ? `${n(set.weight.value)}${set.askWeight ? "+" : ""}` : undefined;
  const completedRpeValue = set.logRpe && set.completedRpe != null ? set.completedRpe : undefined;
  const borderColor = WorkoutExerciseUtils_getBorderColor100([props.set], false);
  const hasEdit = props.type === "workout";
  const isUnilateral = Exercise_getIsUnilateral(props.exerciseType, props.settings);
  const remValue = props.settings.textSize ?? 16;
  const labelW = isUnilateral ? remValue : 0;
  const repsInputWidth = (props.columnWidths.reps - labelW) / remValue;
  const weightInputWidth = props.columnWidths.weight / remValue;

  const { dispatch, lbSet, setIndex, entryIndex, programExercise, otherStates, isPlayground, type } = props;

  const onInputLeftReps = useCallback(
    (value: number | undefined) => {
      if (value != null && !isNaN(value) && value >= 0) {
        updateProgress(
          dispatch,
          [lbSet.recordModify((s) => ({ ...s, completedRepsLeft: Math.round(value) }))],
          "input-left-reps"
        );
      }
    },
    [dispatch, lbSet]
  );
  const onBlurLeftReps = useCallback(
    (value: number | undefined) => {
      updateProgress(dispatch, [lbSet.recordModify((s) => ({ ...s, completedRepsLeft: value }))], "blur-left-reps");
    },
    [dispatch, lbSet]
  );
  const onInputReps = useCallback(
    (value: number | undefined) => {
      if (value != null && !isNaN(value) && value >= 0) {
        updateProgress(
          dispatch,
          [
            lbSet.recordModify((s) => {
              const newSet = { ...s, completedReps: Math.round(value) };
              return Reps_enforceCompletedSet(newSet);
            }),
          ],
          "input-reps"
        );
      }
    },
    [dispatch, lbSet]
  );
  const onBlurReps = useCallback(
    (value: number | undefined) => {
      updateProgress(
        dispatch,
        [
          lbSet.recordModify((s) => {
            const newSet = { ...s, completedReps: value };
            return Reps_enforceCompletedSet(newSet);
          }),
        ],
        "blur-reps"
      );
    },
    [dispatch, lbSet]
  );
  const onBlurWeight = useCallback(
    (value: IWeight | IPercentage | undefined) => {
      if (value == null || value.unit !== "%") {
        updateProgress(
          dispatch,
          [
            lbSet.recordModify((s) => {
              const newSet = { ...s, completedWeight: value };
              return Reps_enforceCompletedSet(newSet);
            }),
          ],
          "blur-weight"
        );
      }
    },
    [dispatch, lbSet]
  );
  const onInputWeight = useCallback(
    (value: IWeight | IPercentage | undefined) => {
      if (value != null && value.unit !== "%") {
        updateProgress(
          dispatch,
          [
            lbSet.recordModify((s) => {
              const newSet = { ...s, completedWeight: value };
              return Reps_enforceCompletedSet(newSet);
            }),
          ],
          "input-weight"
        );
      }
    },
    [dispatch, lbSet]
  );
  const onCompleteSet = useCallback(() => {
    FocusedInputFlush_flush();
    dispatch({
      type: "CompleteSetAction",
      setIndex,
      entryIndex,
      programExercise,
      otherStates,
      isPlayground,
      mode: type,
      forceUpdateEntryIndex: type === "workout" && !set.isCompleted,
      isExternal: false,
    });
  }, [dispatch, setIndex, entryIndex, programExercise, otherStates, isPlayground, type, set.isCompleted]);

  return (
    <SwipeableRow
      width={hasEdit ? 128 : 64}
      openThreshold={hasEdit ? 30 : 15}
      closeThreshold={hasEdit ? 110 : 55}
      scrollThreshold={7}
      initiateTreshold={8}
      onPointerDown={props.onStopShowingHint}
    >
      {({ style, close, moveRef }) => (
        <View
          ref={moveRef as unknown as React.RefObject<View>}
          className={`${WorkoutExerciseUtils_getBgColor50([set], props.type === "warmup")}`}
          style={style as object}
          data-testid={getDataCy(set)}
          testID={getDataCy(set)}
        >
          <View className={`flex-row items-center border-b ${borderColor}`}>
            <View className="items-center justify-center py-1" style={{ width: props.columnWidths.set }}>
              <View
                className="w-6 h-6 items-center justify-center"
                style={{
                  borderRadius: 9999,
                  overflow: "hidden",
                  backgroundColor: props.isNext ? Tailwind_semantic().button.primarybackground : "transparent",
                }}
              >
                {props.type === "warmup" ? (
                  <Text className={`text-xs ${props.isNext ? "text-text-alwayswhite font-bold" : ""}`}>W</Text>
                ) : (
                  <Text className={props.isNext ? "text-text-alwayswhite font-bold" : ""}>{props.setIndex + 1}</Text>
                )}
              </View>
            </View>

            <View className="flex-1" data-testid="workout-set-target" testID="workout-set-target">
              <WorkoutExerciseSetTargetField
                set={set}
                lastSet={props.lastSet}
                setType={
                  props.type === "warmup"
                    ? "warmup"
                    : props.isCurrentProgress && props.programExercise == null
                      ? "adhoc"
                      : "program"
                }
                settings={props.settings}
                exerciseType={props.exerciseType}
              />
            </View>

            <View className="items-center justify-center py-2" style={{ width: props.columnWidths.reps }}>
              {isUnilateral && (
                <View className="flex-row items-center justify-center mb-1">
                  <Text className="text-xs text-text-secondary" style={{ width: labelW }}>
                    L:
                  </Text>
                  <InputNumber2
                    width={repsInputWidth}
                    name="set-left-reps"
                    onInput={onInputLeftReps}
                    onBlur={onBlurLeftReps}
                    placeholder={placeholderReps}
                    initialValue={set.reps}
                    value={set.completedRepsLeft != null ? set.completedRepsLeft : undefined}
                    min={0}
                    max={9999}
                    step={1}
                    inputCommitMode="blur"
                  />
                </View>
              )}
              <View className="flex-row items-center justify-center">
                {isUnilateral && (
                  <Text className="text-xs text-text-secondary" style={{ width: labelW }}>
                    R:
                  </Text>
                )}
                <InputNumber2
                  width={repsInputWidth}
                  name="set-reps"
                  onInput={onInputReps}
                  onBlur={onBlurReps}
                  placeholder={placeholderReps}
                  initialValue={set.reps}
                  value={set.completedReps != null ? set.completedReps : undefined}
                  min={0}
                  max={9999}
                  step={1}
                  inputCommitMode="blur"
                />
              </View>
            </View>

            <View className="items-center justify-center py-2" style={{ width: props.columnWidths.separator }}>
              <Text className="text-text-secondary">×</Text>
            </View>

            <View className="items-start justify-center py-2" style={{ width: props.columnWidths.weight }}>
              <InputWeight2
                width={weightInputWidth}
                name="set-weight"
                exerciseType={props.exerciseType}
                inputCommitMode="blur"
                onBlur={onBlurWeight}
                onInput={onInputWeight}
                addOn={
                  set.rpe != null && set.reps != null
                    ? () => (
                        <RpeWeightHint
                          reps={set.completedReps ?? set.reps ?? 0}
                          rpe={set.completedRpe ?? set.rpe!}
                          settings={props.settings}
                          exerciseType={props.exerciseType}
                        />
                      )
                    : undefined
                }
                subscription={props.subscription}
                placeholder={placeholderWeight}
                initialValue={set.weight}
                value={set.completedWeight || undefined}
                max={9999}
                min={-9999}
                settings={props.settings}
              />
            </View>

            {props.columnWidths.rpe > 0 ? (
              <View className="items-start justify-center py-2 ml-1" style={{ width: props.columnWidths.rpe }}>
                {completedRpeValue != null ? (
                  <Text
                    numberOfLines={1}
                    data-testid="rpe-value"
                    testID="rpe-value"
                    className="text-xs font-semibold text-text-success"
                  >
                    @{n(completedRpeValue)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View className="items-end justify-center" style={{ width: props.columnWidths.check }}>
              <Pressable
                className={props.columnWidths.rpe > 0 ? "pl-1 pr-4 py-3" : "px-4 py-3"}
                data-testid="complete-set"
                testID="complete-set"
                onPress={onCompleteSet}
              >
                <IconCheckCircle
                  size={24}
                  isChecked={true}
                  color={WorkoutExerciseUtils_getIconColor([set], props.type === "warmup")}
                />
              </Pressable>
            </View>
          </View>

          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "100%",
              flexDirection: "row",
              width: hasEdit ? 128 : 64,
              marginLeft: 1,
            }}
          >
            {hasEdit && (
              <Pressable
                data-testid="edit-set-target"
                testID="edit-set-target"
                onPress={() => {
                  close();
                  EditProgressEntry_showEditSetModal(
                    props.dispatch,
                    props.settings,
                    props.type === "warmup",
                    props.entryIndex,
                    props.setIndex,
                    props.programExercise,
                    props.exerciseType,
                    set
                  );
                }}
                style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
                className="bg-background-darkgray"
              >
                <Text className="text-text-alwayswhite">Edit</Text>
              </Pressable>
            )}
            <Pressable
              data-testid="delete-set"
              testID="delete-set"
              onPress={() => {
                close();
                updateProgress(
                  props.dispatch,
                  [
                    props.lbSets.recordModify((s) => {
                      const newSets = CollectionUtils_removeAt(s, props.setIndex);
                      for (let i = 0; i < newSets.length; i += 1) {
                        newSets[i].index = i;
                      }
                      return newSets;
                    }),
                  ],
                  "delete-set"
                );
              }}
              style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
              className="bg-background-darkred"
            >
              <Text className="text-text-alwayswhite">Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SwipeableRow>
  );
}

export const WorkoutExerciseSet = memo(WorkoutExerciseSetInner);

interface IWorkoutExerciseSetTargetProps {
  setType: "program" | "warmup" | "adhoc";
  set: ISet;
}

function WorkoutExerciseSetTarget(props: IWorkoutExerciseSetTargetProps): JSX.Element {
  const cls = StyledText_cls(useRem());
  switch (props.setType) {
    case "warmup": {
      const set = props.set;
      const builder = new StyledText();
      if (set.reps != null) {
        builder.add(n(Math.max(0, set.reps)), cls("font-semibold"));
      }
      if (set.reps != null && set.weight != null) {
        builder.add(" × ", cls("text-text-secondary"));
      }
      if (set.weight != null) {
        builder.add(n(set.weight.value), cls("font-semibold"));
        builder.add(set.weight.unit, cls("text-xs"));
      }
      const built = builder.build();
      return (
        <View>
          <Text className="text-xs text-text-secondary">Warmup</Text>
          <FastText text={built.text} fragments={built.fragments} {...cls("text-sm text-text-primary")} />
        </View>
      );
    }
    case "adhoc":
    case "program": {
      const aSet = props.set;
      const isDiffWeight = aSet.weight && aSet.originalWeight && !Weight_eq(aSet.weight, aSet.originalWeight);
      const hasTarget = aSet.reps != null || aSet.weight != null;
      const builder = new StyledText();
      if (aSet.reps != null) {
        builder.add(
          `${aSet.minReps != null ? `${n(Math.max(0, aSet.minReps))}-` : ""}${n(Math.max(0, aSet.reps))}${aSet.isAmrap ? "+" : ""}`,
          cls("font-semibold text-syntax-reps")
        );
      }
      if (aSet.reps != null && aSet.weight != null) {
        builder.add(" × ", cls("text-text-secondary"));
      }
      if (aSet.originalWeight && aSet.weight) {
        if (isDiffWeight) {
          builder.add(n(aSet.originalWeight.value), cls("line-through text-text-secondary"));
          builder.add(aSet.originalWeight.unit, cls("text-xs line-through text-text-secondary"));
        } else {
          builder.add(n(aSet.originalWeight.value), cls("font-semibold text-syntax-weight"));
          builder.add(aSet.originalWeight.unit, cls("text-xs text-syntax-weight"));
        }
      }
      if (aSet.weight && isDiffWeight) {
        builder.add(" ");
        builder.add(n(aSet.weight.value), cls("font-semibold text-syntax-weight"));
        builder.add(aSet.weight.unit, cls("text-xs text-syntax-weight"));
      }
      builder.add(
        `${aSet.originalWeight == null && aSet.askWeight ? " ?" : ""}${aSet.askWeight ? "+" : ""}${
          aSet.rpe ? ` @${n(Math.max(0, aSet.rpe))}` : ""
        }${aSet.rpe && aSet.logRpe ? "+" : ""}`,
        cls("font-semibold text-syntax-rpe")
      );
      if (aSet.timer != null) {
        builder.add(` ${n(aSet.timer)}`, cls("text-syntax-timer"));
        builder.add("s", cls("text-xs text-syntax-timer"));
      }
      const built = builder.build();
      return (
        <View>
          {aSet.label ? <Text className="text-xs text-text-secondary">{aSet.label}</Text> : null}
          {props.setType === "adhoc" && <Text className="text-xs text-text-secondary">Ad-hoc</Text>}
          {hasTarget ? (
            <FastText text={built.text} fragments={built.fragments} {...cls("text-sm text-text-primary")} />
          ) : (
            <Text className="text-sm">None</Text>
          )}
        </View>
      );
    }
  }
}

interface IWorkoutExerciseLastSetProps {
  set?: ISet;
}

function WorkoutExerciseLastSet(props: IWorkoutExerciseLastSetProps): JSX.Element {
  const cls = StyledText_cls(useRem());
  const set = props.set;
  if (set == null) {
    return <Text className="text-xs text-text-secondary">No last set</Text>;
  }
  const statusColor = WorkoutExerciseUtils_setsStatusToTextColorValue(Reps_setsStatus([set]));
  const semibold = { ...cls("font-semibold"), color: statusColor };
  const builder = new StyledText();
  builder.add(set.completedReps != null ? n(set.completedReps) : "-", semibold);
  builder.add(" × ", cls("text-text-secondary"));
  builder.add(set.completedWeight ? set.completedWeight.value.toString() : "-", semibold);
  builder.add(set.completedWeight?.unit, { ...cls("text-xs"), color: statusColor });
  builder.add(
    set.completedRpe != null
      ? ` @${n(Math.max(0, set.completedRpe))}+`
      : set.rpe != null
        ? ` @${n(Math.max(0, set.rpe))}`
        : "",
    semibold
  );
  const built = builder.build();
  return (
    <View>
      {set.label ? <Text className="text-xs text-text-secondary">{set.label}</Text> : null}
      <FastText text={built.text} fragments={built.fragments} {...cls("text-sm text-text-primary")} />
    </View>
  );
}

interface IRpeWeightHintProps {
  reps: number;
  rpe: number;
  settings: ISettings;
  exerciseType: IExerciseType;
}

function RpeWeightHint(props: IRpeWeightHintProps): JSX.Element {
  const cls = StyledText_cls(useRem());
  const multiplier = Weight_rpeMultiplier(props.reps, props.rpe);
  const onerm = Exercise_onerm(props.exerciseType, props.settings);
  const weight = Weight_multiply(onerm, multiplier);
  const builder = new StyledText();
  builder.add(`${props.reps}`, cls("font-bold text-syntax-reps"));
  builder.add(" × ");
  builder.add(`@${props.rpe}`, cls("font-bold text-syntax-rpe"));
  builder.add(" - ");
  builder.add(`${n(multiplier * 100, 0)}%`, cls("font-bold text-text-primary"));
  builder.add(" of 1RM - ");
  builder.add(n(weight.value), cls("font-bold text-text-primary"));
  builder.add(weight.unit);
  const built = builder.build();
  return (
    <View>
      <FastText text={built.text} fragments={built.fragments} {...cls("text-xs text-text-secondary")} />
    </View>
  );
}

function getDataCy(set: ISet): string {
  if (set.isAmrap) {
    if (!set.isCompleted || !set.completedReps) {
      return "set-amrap-nonstarted";
    } else if (set.minReps != null && set.completedReps < set.minReps) {
      return "set-amrap-incompleted";
    } else if (set.minReps != null && set.reps != null && set.completedReps < set.reps) {
      return "set-amrap-in-range";
    } else if (set.reps != null && set.completedReps < set.reps) {
      return "set-amrap-incompleted";
    } else {
      return "set-amrap-completed";
    }
  } else if (set.completedReps == null || !set.isCompleted) {
    return "set-nonstarted";
  } else {
    if (set.reps == null || set.completedReps >= set.reps) {
      return "set-completed";
    } else if (set.minReps != null && set.completedReps >= set.minReps) {
      return "set-in-range";
    } else {
      return "set-incompleted";
    }
  }
}

interface IWorkoutExerciseSetTargetFieldProps {
  setType: "program" | "warmup" | "adhoc";
  set: ISet;
  lastSet?: ISet;
  settings: ISettings;
  exerciseType: IExerciseType;
}

function WorkoutExerciseSetTargetField(props: IWorkoutExerciseSetTargetFieldProps): JSX.Element {
  switch (props.settings.workoutSettings.targetType) {
    case "target": {
      return <WorkoutExerciseSetTarget set={props.set} setType={props.setType} />;
    }
    case "lasttime": {
      return <WorkoutExerciseLastSet set={props.lastSet} />;
    }
    case "platescalculator": {
      return (
        <WorkoutExercisePlatesCalculator set={props.set} settings={props.settings} exerciseType={props.exerciseType} />
      );
    }
    case "e1rm": {
      return <WorkoutExerciseE1RMSet set={props.set} settings={props.settings} />;
    }
  }
  return <View />;
}

interface IWorkoutExercisePlatesCalculatorProps {
  set: ISet;
  settings: ISettings;
  exerciseType: IExerciseType;
}

function WorkoutExercisePlatesCalculator(props: IWorkoutExercisePlatesCalculatorProps): JSX.Element {
  const setWeight = props.set.weight;
  if (setWeight == null) {
    return (
      <Text className="text-sm font-semibold" data-testid="plates-list" testID="plates-list">
        None
      </Text>
    );
  }

  const { plates, totalWeight: weight } = Weight_calculatePlates(
    props.set.completedWeight ?? setWeight,
    props.settings,
    setWeight.unit,
    props.exerciseType
  );
  const formattedPlates = plates.length > 0 ? Weight_formatOneSide(props.settings, plates, props.exerciseType) : "None";
  return (
    <Text
      className={`text-sm font-semibold ${Weight_eq(weight, props.set.completedWeight ?? setWeight) ? "text-text-primary" : "text-text-error"}`}
      data-testid="plates-list"
      testID="plates-list"
    >
      {formattedPlates}
    </Text>
  );
}

interface IWorkoutExerciseE1RMSetProps {
  set: ISet;
  settings: ISettings;
}

function WorkoutExerciseE1RMSet(props: IWorkoutExerciseE1RMSetProps): JSX.Element {
  const cls = StyledText_cls(useRem());
  const set = props.set;
  const isCompleted = !!set.isCompleted;
  const weight = set.completedWeight ?? set.weight ?? set.originalWeight;
  const reps = Reps_avgUnilateralCompletedReps(set) ?? set.reps;
  const rpe = set.completedRpe ?? set.rpe ?? 10;
  if (weight == null || Weight_isPct(weight) || reps == null) {
    return <Text className="text-sm">Unknown</Text>;
  }
  const e1RM = Weight_getOneRepMax(weight, reps, rpe);
  const built = new StyledText().add(n(e1RM.value), cls("font-semibold")).add(e1RM.unit, cls("text-xs")).build();
  return (
    <FastText
      text={built.text}
      fragments={built.fragments}
      {...cls("text-sm text-text-primary")}
      style={isCompleted ? undefined : { opacity: 0.4 }}
    />
  );
}
