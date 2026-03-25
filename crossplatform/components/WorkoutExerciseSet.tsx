import React, { useRef, useCallback } from "react";
import { View, Text, Pressable, Animated, PanResponder } from "react-native";
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
import { LensBuilder } from "lens-shmens";
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
  Weight_rpeMultiplier,
  Weight_multiply,
  Weight_calculatePlates,
  Weight_formatOneSide,
  Weight_isPct,
  Weight_getOneRepMax,
} from "@shared/models/weight";
import { Exercise_getIsUnilateral, Exercise_onerm } from "@shared/models/exercise";
import { IconCheckCircle } from "./icons/IconCheckCircle";
import { InputNumber } from "./InputNumber";
import { InputWeight } from "./InputWeight";

interface IProps {
  exerciseType: IExerciseType;
  day: number;
  type: "warmup" | "workout";
  lbSet: LensBuilder<IHistoryRecord, ISet, {}>;
  lbSets: LensBuilder<IHistoryRecord, ISet[], {}>;
  isCurrentProgress: boolean;
  lastSet?: ISet;
  set: ISet;
  isNext?: boolean;
  subscription?: ISubscription;
  isPlayground: boolean;
  progress: IHistoryRecord;
  entry: IHistoryEntry;
  entryIndex: number;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
  setIndex: number;
  settings: ISettings;
  dispatch: IDispatch;
}

export function WorkoutExerciseSet(props: IProps): React.ReactElement {
  const set = props.set;
  const placeholderReps = `${set.minReps != null ? `${n(set.minReps)}-` : ""}${set.reps != null ? n(set.reps) : ""}${set.reps != null && set.isAmrap ? "+" : ""}`;
  const placeholderWeight = set.weight?.value != null ? `${n(set.weight.value)}${set.askWeight ? "+" : ""}` : undefined;
  const completedRpeValue = set.logRpe && set.completedRpe != null ? set.completedRpe : undefined;
  const borderClass = WorkoutExerciseUtils_getBorderColor100([props.set], false);
  const bgClass = WorkoutExerciseUtils_getBgColor50([set], props.type === "warmup");
  const isUnilateral = Exercise_getIsUnilateral(props.exerciseType, props.settings);
  const hasEdit = props.type === "workout";
  const swipeActionWidth = hasEdit ? 128 : 64;
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(Math.max(gs.dx, -swipeActionWidth));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -swipeActionWidth / 3) {
          Animated.spring(translateX, { toValue: -swipeActionWidth, useNativeDriver: true, bounciness: 0 }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
    })
  ).current;

  const closeSwipe = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  }, [translateX]);

  return (
    <View style={{ overflow: "hidden" }}>
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: swipeActionWidth,
          flexDirection: "row",
        }}
      >
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
                props.lbSets.recordModify((s) => {
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
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
        className={`flex-row items-center ${bgClass} border-b ${borderClass}`}
      >
        <View className="items-center justify-center px-2" style={{ width: 40 }}>
          <View
            className={`w-6 h-6 items-center justify-center rounded-full${
              props.isNext ? " bg-button-primarybackground" : ""
            }`}
          >
            <Text className={props.isNext ? "text-text-alwayswhite font-bold text-sm" : "text-sm"}>
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
        <View className="items-center" style={{ width: 60 }}>
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
                      [props.lbSet.recordModify((s) => ({ ...s, completedRepsLeft: Math.round(value) }))],
                      "input-left-reps"
                    );
                  }
                }}
                onBlur={(value) => {
                  updateProgress(
                    props.dispatch,
                    [props.lbSet.recordModify((s) => ({ ...s, completedRepsLeft: value }))],
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
                      props.lbSet.recordModify((s) =>
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
                  [props.lbSet.recordModify((s) => Reps_enforceCompletedSet({ ...s, completedReps: value }))],
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
        <Text className="px-1 text-sm text-text-secondary">×</Text>
        <View style={{ width: 80 }}>
          <View className="flex-row items-center">
            <InputWeight
              name="set-weight"
              exerciseType={props.exerciseType}
              data-cy="weight-value"
              onBlur={(value) => {
                if (value == null || value.unit !== "%") {
                  updateProgress(
                    props.dispatch,
                    [props.lbSet.recordModify((s) => Reps_enforceCompletedSet({ ...s, completedWeight: value }))],
                    "blur-weight"
                  );
                }
              }}
              onInput={(value) => {
                if (value != null && value.unit !== "%") {
                  updateProgress(
                    props.dispatch,
                    [props.lbSet.recordModify((s) => Reps_enforceCompletedSet({ ...s, completedWeight: value }))],
                    "input-weight"
                  );
                }
              }}
              subscription={props.subscription}
              placeholder={placeholderWeight}
              initialValue={set.weight}
              value={set.completedWeight || undefined}
              max={9999}
              min={-9999}
              settings={props.settings}
            />
            {completedRpeValue != null && (
              <Text className="ml-1 text-xs font-semibold text-text-success">@{n(completedRpeValue)}</Text>
            )}
          </View>
        </View>
        <View className="pr-2 pl-1" style={{ width: 50 }}>
          <Pressable
            className="items-center justify-center p-2"
            data-cy="complete-set"
            onPress={() => {
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
            }}
          >
            <IconCheckCircle
              size={24}
              isChecked={true}
              color={WorkoutExerciseUtils_getIconColor([set], props.type === "warmup")}
            />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

interface ISetTargetFieldProps {
  setType: "program" | "warmup" | "adhoc";
  set: ISet;
  lastSet?: ISet;
  settings: ISettings;
  exerciseType: IExerciseType;
}

function SetTargetField(props: ISetTargetFieldProps): React.ReactElement {
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

function SetTarget(props: { set: ISet; setType: "program" | "warmup" | "adhoc" }): React.ReactElement {
  const set = props.set;
  if (props.setType === "warmup") {
    return (
      <View>
        <Text className="text-xs text-text-secondary">Warmup</Text>
        <Text className="text-sm">
          {set.reps != null && <Text className="font-semibold">{n(Math.max(0, set.reps))}</Text>}
          {set.reps != null && set.weight != null && <Text className="text-text-secondary"> × </Text>}
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
            <Text className="line-through text-text-secondary">
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
          {set.rpe ? (
            <Text className="font-semibold text-syntax-rpe">
              {" "}
              @{n(Math.max(0, set.rpe))}
              {set.logRpe ? "+" : ""}
            </Text>
          ) : null}
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

function SetLastTime(props: { set?: ISet }): React.ReactElement {
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

function SetPlatesCalc(props: { set: ISet; settings: ISettings; exerciseType: IExerciseType }): React.ReactElement {
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

function SetE1RM(props: { set: ISet; settings: ISettings }): React.ReactElement {
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
