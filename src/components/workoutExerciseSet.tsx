import type { JSX } from "react";
import { memo, useCallback, useMemo } from "react";
import Animated, { LayoutAnimationConfig } from "react-native-reanimated";
import { useExpandedRowRegistration, useRefocusAfterKeyboardComplete } from "./workoutCenterExpandedRow";
import { IDispatch } from "../ducks/types";
import {
  WorkoutBodyEntering,
  WorkoutBodyExiting,
  WorkoutLayoutClip,
  WorkoutLayoutTransition,
} from "./workoutLayoutTransition";
import {
  ISettings,
  ISet,
  IExerciseType,
  ISubscription,
  IProgramState,
  IHistoryRecord,
  IProgressMode,
  IWeight,
  IPercentage,
} from "../types";
import { n } from "../utils/math";
import { updateProgress } from "../models/state";
import { LensBuilder, lb } from "lens-shmens";
import { WorkoutExerciseUtils_getBorderColor100 } from "../utils/workoutExerciseUtils";
import { useRem } from "../utils/useRem";
import { CollectionUtils_removeAt } from "../utils/collection";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { EditProgressEntry_showEditSetModal } from "../models/editProgressEntry";
import { useTrackClick } from "../utils/clickTracking";
import { Reps_enforceCompletedSet } from "../models/set";
import { Weight_eq } from "../models/weight";
import { Exercise_getIsUnilateral } from "../models/exercise";
import { FocusedInputFlush_flush } from "../utils/focusedInputFlush";
import { IWorkoutSetPreviousLine } from "../utils/workoutSetPrevious";
import { IWorkoutSetPlatesLine, WorkoutSetPlates_line } from "../utils/workoutSetPlates";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IWorkoutSetType } from "./workoutExerciseSetFields";
import { WorkoutExerciseSetCompact } from "./workoutExerciseSetCompact";
import { WorkoutExerciseSetExpanded } from "./workoutExerciseSetExpanded";
import { SetCompleteHaptic_play } from "../utils/setCompleteHaptic";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const HAPTIC_OPTIONS = { enableVibrateFallback: false, ignoreAndroidSystemSettings: false };

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

// The set number badge and the check button hold an icon plus constant padding, so they need a
// fixed part and a scaling part rather than a flat rem multiple - a multiple over-reserves badly
// at large text sizes, and every point taken here comes out of the target label's flex-1 column.
// The reps and weight fields stay narrow on purpose: values longer than they fit shrink their own
// font instead of widening the column (see FitText_fontSize).
export function computeSetColumnWidths(remValue: number, isUnilateral: boolean, rpeLabel: string): ISetColumnWidths {
  const scale = remValue / 16;
  const labelW = isUnilateral ? remValue : 0;
  const rpe = computeRpeColumnWidth(rpeLabel, remValue);
  const iconWidth = 24 * scale;
  return {
    set: Math.round(iconWidth + 8),
    reps: Math.round(2.75 * remValue) + labelW,
    separator: Math.round(remValue),
    weight: Math.round(3.25 * remValue),
    rpe,
    check: Math.round(iconWidth + (rpe > 0 ? 20 : 32)),
  };
}

interface IWorkoutExerciseSet {
  exerciseType: IExerciseType;
  day: number;
  type: IProgressMode;
  lbSet: LensBuilder<IHistoryRecord, ISet, {}>;
  lbSets: LensBuilder<IHistoryRecord, ISet[], {}>;
  isCurrentProgress: boolean;
  lastSet?: ISet;
  set: ISet;
  isNext?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (mode: IProgressMode, setIndex: number) => void;
  onCompleteExpansion?: (mode: IProgressMode, setIndex: number) => void;
  previousLines?: IWorkoutSetPreviousLine[];
  onMenuOpenChange?: (isOpen: boolean) => void;
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

export interface IWorkoutExerciseSetBodyProps {
  set: ISet;
  type: IProgressMode;
  setType: IWorkoutSetType;
  setIndex: number;
  isNext: boolean;
  isUnilateral: boolean;
  labelW: number;
  repsInputWidth: number;
  weightInputWidth: number;
  columnWidths: ISetColumnWidths;
  placeholderReps: string;
  placeholderWeight?: string;
  completedRpeValue?: number;
  borderColor: string;
  isRoundedWeight: boolean;
  lastSet?: ISet;
  previousLines?: IWorkoutSetPreviousLine[];
  settings: ISettings;
  exerciseType: IExerciseType;
  subscription?: ISubscription;
  onInputLeftReps: (value: number | undefined) => void;
  onBlurLeftReps: (value: number | undefined) => void;
  onInputReps: (value: number | undefined) => void;
  onBlurReps: (value: number | undefined) => void;
  onInputWeight: (value: IWeight | IPercentage | undefined) => void;
  onBlurWeight: (value: IWeight | IPercentage | undefined) => void;
  onCompleteSet: () => void;
  onEditSetTimer?: () => void;
  onOpenRoundingInfo: () => void;
  onToggleExpand?: () => void;
  onEditTarget?: () => void;
  onLongPressSet?: () => void;
  onDeleteSet: () => void;
  onMenuOpenChange?: (isOpen: boolean) => void;
  platesLine?: IWorkoutSetPlatesLine;
  onOpenSubscription: () => void;
}

function WorkoutExerciseSetInner(props: IWorkoutExerciseSet): JSX.Element {
  const trackClick = useTrackClick();
  const set = props.set;
  const placeholderReps = `${set.minReps != null ? `${n(set.minReps)}-` : ""}${set.reps != null ? n(set.reps) : ""}${set.reps != null && set.isAmrap ? "+" : ""}`;
  const placeholderWeight = set.weight?.value != null ? `${n(set.weight.value)}${set.askWeight ? "+" : ""}` : undefined;
  const completedRpeValue = set.logRpe && set.completedRpe != null ? set.completedRpe : undefined;
  const borderColor = WorkoutExerciseUtils_getBorderColor100([props.set], false);
  const hasEdit = props.type === "workout";
  const isUnilateral = Exercise_getIsUnilateral(props.exerciseType, props.settings);
  const remValue = useRem();
  const labelW = isUnilateral ? remValue : 0;
  const repsInputWidth = (props.columnWidths.reps - labelW) / remValue;
  const weightInputWidth = props.columnWidths.weight / remValue;

  const { dispatch, lbSet, lbSets, setIndex, entryIndex, programExercise, otherStates, isPlayground, type } = props;
  const { onToggleExpand: onToggleExpandProp, onCompleteExpansion, exerciseType, settings } = props;

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
  const refocus = useRefocusAfterKeyboardComplete();
  const onCompleteSet = useCallback(() => {
    FocusedInputFlush_flush();
    refocus();
    if (!set.isCompleted) {
      SetCompleteHaptic_play();
    }
    onCompleteExpansion?.(type, setIndex);
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
  }, [
    dispatch,
    setIndex,
    entryIndex,
    programExercise,
    otherStates,
    isPlayground,
    type,
    set.isCompleted,
    refocus,
    onCompleteExpansion,
  ]);
  const onEditSetTimer = useCallback(() => {
    trackClick("workout-set-timer-edit-open");
    updateProgress(
      dispatch,
      [lb<IHistoryRecord>().pi("ui", {}).p("setTimerEditModal").record({ entryIndex, setIndex })],
      "open-set-timer-edit"
    );
  }, [dispatch, entryIndex, setIndex, trackClick]);
  const onOpenRoundingInfo = useCallback(() => {
    trackClick("workout-rounding-info");
    updateProgress(
      dispatch,
      [lb<IHistoryRecord>().pi("ui", {}).p("roundingModal").record({ entryIndex, setIndex })],
      "open-rounding-info"
    );
  }, [dispatch, entryIndex, setIndex, trackClick]);
  const onToggleExpand = useCallback(() => {
    onToggleExpandProp?.(type, setIndex);
  }, [onToggleExpandProp, type, setIndex]);
  const onOpenSubscription = useCallback(() => {
    dispatch(Thunk_pushScreen("subscription"));
  }, [dispatch]);
  const platesLine = useMemo(
    () => (props.isExpanded ? WorkoutSetPlates_line(set, settings, exerciseType) : undefined),
    [props.isExpanded, set, settings, exerciseType]
  );
  const onEditTarget = useCallback(() => {
    trackClick("workout-set-edit");
    EditProgressEntry_showEditSetModal(
      dispatch,
      settings,
      type === "warmup",
      entryIndex,
      setIndex,
      programExercise,
      exerciseType,
      set
    );
  }, [trackClick, dispatch, settings, type, entryIndex, setIndex, programExercise, exerciseType, set]);
  const onLongPressSet = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactMedium", HAPTIC_OPTIONS);
    onEditTarget();
  }, [onEditTarget]);
  const onDeleteSet = useCallback(() => {
    trackClick("workout-set-delete");
    updateProgress(
      dispatch,
      [
        lbSets.recordModify((s) => {
          const newSets = CollectionUtils_removeAt(s, setIndex);
          for (let i = 0; i < newSets.length; i += 1) {
            newSets[i].index = i;
          }
          return newSets;
        }),
      ],
      "delete-set"
    );
  }, [trackClick, dispatch, lbSets, setIndex]);
  const isRoundedWeight =
    props.type !== "warmup" &&
    props.settings.workoutSettings.targetType === "target" &&
    set.weight != null &&
    set.originalWeight != null &&
    !Weight_eq(set.weight, set.originalWeight);
  const setType: IWorkoutSetType =
    props.type === "warmup" ? "warmup" : props.isCurrentProgress && props.programExercise == null ? "adhoc" : "program";

  const body: IWorkoutExerciseSetBodyProps = {
    set,
    type: props.type,
    setType,
    setIndex,
    isNext: !!props.isNext,
    isUnilateral,
    labelW,
    repsInputWidth,
    weightInputWidth,
    columnWidths: props.columnWidths,
    placeholderReps,
    placeholderWeight,
    completedRpeValue,
    borderColor,
    isRoundedWeight,
    lastSet: props.lastSet,
    previousLines: props.previousLines,
    settings: props.settings,
    exerciseType: props.exerciseType,
    subscription: props.subscription,
    onInputLeftReps,
    onBlurLeftReps,
    onInputReps,
    onBlurReps,
    onInputWeight,
    onBlurWeight,
    onCompleteSet,
    onEditSetTimer: props.type === "workout" ? onEditSetTimer : undefined,
    onOpenRoundingInfo,
    onToggleExpand: onToggleExpandProp ? onToggleExpand : undefined,
    onEditTarget: hasEdit ? onEditTarget : undefined,
    onLongPressSet: hasEdit ? onLongPressSet : undefined,
    onDeleteSet,
    onMenuOpenChange: props.onMenuOpenChange,
    platesLine,
    onOpenSubscription,
  };

  const rowRef = useExpandedRowRegistration(entryIndex, !!props.isExpanded);
  return (
    <Animated.View ref={rowRef} layout={WorkoutLayoutTransition} style={WorkoutLayoutClip}>
      {/* Only a swap between the two bodies fades, never the row mounting with the screen.
          The distinct keys make the swap an unmount and a mount, which entering and exiting need. */}
      <LayoutAnimationConfig skipEntering skipExiting>
        {props.isExpanded ? (
          <Animated.View key="expanded" entering={WorkoutBodyEntering} exiting={WorkoutBodyExiting}>
            <WorkoutExerciseSetExpanded {...body} />
          </Animated.View>
        ) : (
          <Animated.View key="compact" entering={WorkoutBodyEntering} exiting={WorkoutBodyExiting}>
            <WorkoutExerciseSetCompact {...body} />
          </Animated.View>
        )}
      </LayoutAnimationConfig>
    </Animated.View>
  );
}

export const WorkoutExerciseSet = memo(WorkoutExerciseSetInner);
