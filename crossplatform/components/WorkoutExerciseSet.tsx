import React, { useRef } from "react";
import type { JSX } from "react";
import { View, Text, Pressable } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import type { IDispatch } from "@shared/ducks/types";
import type {
  ISettings,
  ISet,
  IExerciseType,
  ISubscription,
  IProgramState,
  IHistoryRecord,
  IHistoryEntry,
} from "@shared/types";
import type { IPlannerProgramExercise } from "@shared/pages/planner/models/types";
import type { IByExercise } from "@shared/pages/planner/plannerEvaluator";
import { lb } from "lens-shmens";
import type { LensBuilder } from "lens-shmens";
import { updateProgress } from "@shared/models/state";
import { n } from "@shared/utils/math";
import { CollectionUtils_removeAt } from "@shared/utils/collection";
import { EditProgressEntry_showEditSetModal } from "@shared/models/editProgressEntry";
import {
  WorkoutExerciseUtils_getBorderColor100,
  WorkoutExerciseUtils_getBgColor50,
  WorkoutExerciseUtils_getIconColor,
  WorkoutExerciseUtils_setsStatusToTextColor,
} from "@shared/utils/workoutExerciseUtils";
import { Reps_enforceCompletedSet, Reps_setsStatus, Reps_avgUnilateralCompletedReps } from "@shared/models/set";
import {
  Weight_eq,
  Weight_calculatePlates,
  Weight_formatOneSide,
  Weight_isPct,
  Weight_getOneRepMax,
} from "@shared/models/weight";
import { Exercise_getIsUnilateral } from "@shared/models/exercise";
import { IconCheckCircle } from "./icons/IconCheckCircle";
import { InputNumber } from "./InputNumber";
import { InputWeight } from "./InputWeight";

interface IProps {
  exerciseType: IExerciseType;
  day: number;
  type: "warmup" | "workout";
  isCurrentProgress: boolean;
  lastSet?: ISet;
  set: ISet;
  isNext?: boolean;
  subscription?: ISubscription;
  isPlayground: boolean;
  entryIndex: number;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  setIndex: number;
  settings: ISettings;
  dispatch: IDispatch;
}

export const WorkoutExerciseSet = React.memo(function WorkoutExerciseSet(props: IProps): JSX.Element {
  const lbSets = lb<IHistoryRecord>().p("entries").i(props.entryIndex).p(props.type === "warmup" ? "warmupSets" : "sets");
  const lbSet = lbSets.i(props.setIndex);
  const set = props.set;
  const placeholderReps = `${set.minReps != null ? `${n(set.minReps)}-` : ""}${set.reps != null ? n(set.reps) : ""}${set.reps != null && set.isAmrap ? "+" : ""}`;
  const placeholderWeight = set.weight?.value != null ? `${n(set.weight.value)}${set.askWeight ? "+" : ""}` : undefined;
  const completedRpeValue = set.logRpe && set.completedRpe != null ? set.completedRpe : undefined;
  const borderClass = WorkoutExerciseUtils_getBorderColor100([props.set], false);
  const bgClass = WorkoutExerciseUtils_getBgColor50([set], props.type === "warmup");
  const isUnilateral = Exercise_getIsUnilateral(props.exerciseType, props.settings);
  const hasEdit = props.type === "workout";
  const swipeActionWidth = hasEdit ? 128 : 64;
  const swipeableRef = useRef<Swipeable>(null);

  const closeSwipe = (): void => {
    swipeableRef.current?.close();
  };

  const renderRightActions = (): JSX.Element => {
    return (
      <View style={{ flexDirection: "row", width: swipeActionWidth }}>
        {hasEdit && (
          <Pressable
            className="items-center justify-center flex-1 bg-background-darkgray"
            data-cy="edit-set-target"
            onPress={() => {
              closeSwipe();
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
          >
            <Text className="text-text-alwayswhite">Edit</Text>
          </Pressable>
        )}
        <Pressable
          className="items-center justify-center flex-1 bg-background-darkred"
          data-cy="delete-set"
          onPress={() => {
            closeSwipe();
            updateProgress(
              props.dispatch,
              [
                lbSets.recordModify((s) => {
                  const newSets = CollectionUtils_removeAt(s, props.setIndex);
                  for (let i = 0; i < newSets.length; i++) {
                    newSets[i].index = i;
                  }
                  return newSets;
                }),
              ],
              "delete-set"
            );
          }}
        >
          <Text className="text-text-alwayswhite">Delete</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={swipeActionWidth / 3}
      overshootRight={false}
      friction={2}
    >
      <View className={`flex-row items-center py-2 ${bgClass} border-b ${borderClass}`}>
        <View className="items-center justify-center px-2" style={{ width: 40 }}>
          <View
            className={`w-6 h-6 items-center justify-center rounded-full${
              props.isNext ? " bg-button-primarybackground" : ""
            }`}
          >
            <Text
              className={
                props.isNext
                  ? `text-text-alwayswhite font-bold ${props.type === "warmup" ? "text-xs" : "text-sm"}`
                  : props.type === "warmup"
                    ? "text-xs"
                    : "text-sm"
              }
            >
              {props.type === "warmup" ? "W" : props.setIndex + 1}
            </Text>
          </View>
        </View>
        <View className="flex-1" data-cy="workout-set-target">
          <SetTargetField
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
        <View className="items-center" style={{ width: 48 }}>
          {isUnilateral && (
            <View className="flex-row items-center mb-1">
              <Text className="text-xs text-text-secondary" style={{ width: 16 }}>
                L:
              </Text>
              <InputNumber
                width={2.5}
                data-cy="left-reps-value"
                name="set-left-reps"
                onInput={(value) => {
                  if (value != null && !isNaN(value) && value >= 0) {
                    updateProgress(
                      props.dispatch,
                      [lbSet.recordModify((s) => ({ ...s, completedRepsLeft: Math.round(value) }))],
                      "input-left-reps"
                    );
                  }
                }}
                onBlur={(value) => {
                  updateProgress(
                    props.dispatch,
                    [lbSet.recordModify((s) => ({ ...s, completedRepsLeft: value }))],
                    "blur-left-reps"
                  );
                }}
                placeholder={placeholderReps}
                initialValue={set.reps}
                value={set.completedRepsLeft != null ? set.completedRepsLeft : undefined}
                min={0}
                max={9999}
                step={1}
              />
            </View>
          )}
          <View className="flex-row items-center">
            {isUnilateral && (
              <Text className="text-xs text-text-secondary" style={{ width: 16 }}>
                R:
              </Text>
            )}
            <InputNumber
              width={2.5}
              data-cy="reps-value"
              name="set-reps"
              onInput={(value) => {
                if (value != null && !isNaN(value) && value >= 0) {
                  updateProgress(
                    props.dispatch,
                    [
                      lbSet.recordModify((s) =>
                        Reps_enforceCompletedSet({ ...s, completedReps: Math.round(value) })
                      ),
                    ],
                    "input-reps"
                  );
                }
              }}
              onBlur={(value) => {
                updateProgress(
                  props.dispatch,
                  [lbSet.recordModify((s) => Reps_enforceCompletedSet({ ...s, completedReps: value }))],
                  "blur-reps"
                );
              }}
              placeholder={placeholderReps}
              initialValue={set.reps}
              value={set.completedReps != null ? set.completedReps : undefined}
              min={0}
              max={9999}
              step={1}
            />
          </View>
        </View>
        <Text className="text-sm text-text-secondary" style={{ width: 14, textAlign: "center" }}>
          ×
        </Text>
        <View style={{ width: 64 }}>
          <View className="flex-row items-center">
            <InputWeight
              name="set-weight"
              exerciseType={props.exerciseType}
              data-cy="weight-value"
              onBlur={(value) => {
                updateProgress(
                  props.dispatch,
                  [lbSet.recordModify((s) => Reps_enforceCompletedSet({ ...s, completedWeight: value }))],
                  "blur-weight"
                );
              }}
              onInput={(value) => {
                if (value != null) {
                  updateProgress(
                    props.dispatch,
                    [lbSet.recordModify((s) => Reps_enforceCompletedSet({ ...s, completedWeight: value }))],
                    "input-weight"
                  );
                }
              }}
              subscription={props.subscription}
              placeholder={placeholderWeight}
              initialValue={set.weight}
              value={set.completedWeight ?? undefined}
              max={9999}
              min={-9999}
              settings={props.settings}
            />
            {completedRpeValue != null && (
              <Text className="ml-1 text-xs font-semibold text-text-success">@{n(completedRpeValue)}</Text>
            )}
          </View>
        </View>
        <View className="pr-4 pl-1" style={{ width: 56 }}>
          <Pressable
            className="items-center justify-center px-3 py-2"
            data-cy="complete-set"
            onPress={() => {
              console.log(`[PERF] CompleteSetAction tap (RN): entry=${props.entryIndex}, set=${props.setIndex}`);
              const t0 = Date.now();
              props.dispatch({
                type: "CompleteSetAction",
                setIndex: props.setIndex,
                entryIndex: props.entryIndex,
                programExercise: props.programExercise,
                otherStates: props.otherStates,
                isPlayground: props.isPlayground,
                mode: props.type,
                forceUpdateEntryIndex: props.type === "workout" && !props.set.isCompleted,
                isExternal: false,
              });
              console.log(`[PERF] CompleteSetAction dispatch returned (RN): ${Date.now() - t0}ms`);
            }}
          >
            <IconCheckCircle
              size={24}
              isChecked={true}
              color={WorkoutExerciseUtils_getIconColor([set], props.type === "warmup")}
            />
          </Pressable>
        </View>
      </View>
    </Swipeable>
  );
});

interface ISetTargetFieldProps {
  setType: "program" | "warmup" | "adhoc";
  set: ISet;
  lastSet?: ISet;
  settings: ISettings;
  exerciseType: IExerciseType;
}

function SetTargetField(props: ISetTargetFieldProps): JSX.Element {
  switch (props.settings.workoutSettings.targetType) {
    case "target":
      return <SetTarget set={props.set} setType={props.setType} />;
    case "lasttime":
      return <SetLastTime set={props.lastSet} />;
    case "platescalculator":
      return <SetPlatesCalc set={props.set} settings={props.settings} exerciseType={props.exerciseType} />;
    case "e1rm":
      return <SetE1RM set={props.set} settings={props.settings} />;
  }
  return <View />;
}

function SetTarget(props: { set: ISet; setType: "program" | "warmup" | "adhoc" }): JSX.Element {
  const set = props.set;
  if (props.setType === "warmup") {
    return (
      <View>
        <Text className="text-xs text-text-secondary">Warmup</Text>
        <Text className="text-sm text-text-secondary">
          {set.reps != null && <Text className="font-semibold">{n(Math.max(0, set.reps))}</Text>}
          {set.reps != null && set.weight != null && <Text> × </Text>}
          {set.weight != null && (
            <Text>
              <Text className="font-semibold">{n(set.weight.value)}</Text>
              <Text className="text-xs">{set.weight.unit}</Text>
            </Text>
          )}
        </Text>
      </View>
    );
  }

  const isDiffWeight = set.weight && set.originalWeight && !Weight_eq(set.weight, set.originalWeight);
  const hasTarget = set.reps != null || set.weight != null;
  return (
    <View>
      {set.label ? <Text className="text-xs text-text-secondary">{set.label}</Text> : null}
      {props.setType === "adhoc" && <Text className="text-xs text-text-secondary">Ad-hoc</Text>}
      {hasTarget ? (
        <Text className="text-sm">
          {set.reps != null && (
            <Text className="font-semibold text-syntax-reps">
              {set.minReps != null ? `${n(Math.max(0, set.minReps))}-` : ""}
              {n(Math.max(0, set.reps))}
              {set.isAmrap ? "+" : ""}
            </Text>
          )}
          {set.reps != null && set.weight != null && <Text className="text-text-secondary"> × </Text>}
          {set.originalWeight && set.weight && isDiffWeight && (
            <Text style={{ textDecorationLine: "line-through" }} className="text-text-secondary">
              {n(set.originalWeight.value)}
              <Text className="text-xs">{set.originalWeight.unit}</Text>
            </Text>
          )}
          {set.originalWeight && set.weight && !isDiffWeight && (
            <Text className="font-semibold text-syntax-weight">
              {n(set.originalWeight.value)}
              <Text className="text-xs">{set.originalWeight.unit}</Text>
            </Text>
          )}
          {set.weight && isDiffWeight && (
            <Text className="text-syntax-weight">
              {" "}
              <Text className="font-semibold">{n(set.weight.value)}</Text>
              <Text className="text-xs">{set.weight.unit}</Text>
            </Text>
          )}
          <Text className="font-semibold text-syntax-rpe">
            {set.originalWeight == null && set.askWeight ? " ?" : ""}
            {set.askWeight ? "+" : ""}
            {set.rpe ? ` @${n(Math.max(0, set.rpe))}` : null}
            {set.rpe && set.logRpe ? "+" : ""}
          </Text>
          {set.timer != null ? (
            <Text className="text-syntax-timer">
              {" "}
              {n(set.timer)}
              <Text className="text-xs">s</Text>
            </Text>
          ) : null}
        </Text>
      ) : (
        <Text className="text-sm">None</Text>
      )}
    </View>
  );
}

function SetLastTime(props: { set?: ISet }): JSX.Element {
  const set = props.set;
  if (set == null) {
    return <Text className="text-xs text-text-secondary">No last set</Text>;
  }
  const setStatus = Reps_setsStatus([set]);
  const textColor = WorkoutExerciseUtils_setsStatusToTextColor(setStatus);
  return (
    <View>
      {set.label ? <Text className="text-xs text-text-secondary">{set.label}</Text> : null}
      <Text className="text-sm">
        <Text className={`font-semibold ${textColor}`}>{set.completedReps != null ? n(set.completedReps) : "-"}</Text>
        <Text className="text-text-secondary"> × </Text>
        <Text className={`font-semibold ${textColor}`}>
          {set.completedWeight ? String(set.completedWeight.value) : "-"}
          <Text className="text-xs">{set.completedWeight?.unit}</Text>
        </Text>
      </Text>
    </View>
  );
}

function SetPlatesCalc(props: { set: ISet; settings: ISettings; exerciseType: IExerciseType }): JSX.Element {
  const setWeight = props.set.weight;
  if (setWeight == null) {
    return <Text className="text-sm font-semibold">None</Text>;
  }
  const { plates, totalWeight: weight } = Weight_calculatePlates(
    props.set.completedWeight ?? setWeight,
    props.settings,
    setWeight.unit,
    props.exerciseType
  );
  const formattedPlates = plates.length > 0 ? Weight_formatOneSide(props.settings, plates, props.exerciseType) : "None";
  return (
    <Text className="text-sm font-semibold">
      <Text
        className={Weight_eq(weight, props.set.completedWeight ?? setWeight) ? "text-text-primary" : "text-text-error"}
      >
        {formattedPlates}
      </Text>
    </Text>
  );
}

function SetE1RM(props: { set: ISet; settings: ISettings }): JSX.Element {
  const set = props.set;
  const isCompleted = !!set.isCompleted;
  const weight = set.completedWeight ?? set.weight ?? set.originalWeight;
  const reps = Reps_avgUnilateralCompletedReps(set) ?? set.reps;
  const rpe = set.completedRpe ?? set.rpe ?? 10;
  if (weight == null || Weight_isPct(weight) || reps == null) {
    return <Text className="text-sm">Unknown</Text>;
  }
  const e1RM = Weight_getOneRepMax(weight, reps, rpe);
  return (
    <Text className={`text-sm ${isCompleted ? "" : "opacity-40"}`}>
      <Text className="font-semibold">{n(e1RM.value)}</Text>
      <Text className="text-xs">{e1RM.unit}</Text>
    </Text>
  );
}
