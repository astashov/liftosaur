import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { ISettings, ISet, IExerciseType } from "../types";
import { n } from "../utils/math";
import { TimeUtils_formatMMSS } from "../utils/time";
import { FastText } from "./primitives/fastText";
import { StyledText, StyledText_cls } from "../utils/styledText";
import { useRem } from "../utils/useRem";
import { WorkoutExerciseUtils_setsStatusToTextColorValue } from "../utils/workoutExerciseUtils";
import { Reps_setsStatus, Reps_avgUnilateralCompletedReps } from "../models/set";
import {
  Weight_eq,
  Weight_rpeMultiplier,
  Weight_multiply,
  Weight_calculatePlates,
  Weight_formatOneSide,
  Weight_isPct,
  Weight_getOneRepMax,
} from "../models/weight";
import { Exercise_onerm } from "../models/exercise";

export type IWorkoutSetType = "program" | "warmup" | "adhoc";

interface IWorkoutExerciseSetTargetProps {
  setType: IWorkoutSetType;
  set: ISet;
  underlineRounded?: boolean;
  sizeClass?: string;
}

export function WorkoutExerciseSetTarget(props: IWorkoutExerciseSetTargetProps): JSX.Element {
  const cls = StyledText_cls(useRem());
  const sizeClass = props.sizeClass ?? "text-sm";
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
          <FastText text={built.text} fragments={built.fragments} {...cls(`${sizeClass} text-text-primary`)} />
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
        const underline = props.underlineRounded ? " underline" : "";
        builder.add(" ");
        builder.add(n(aSet.weight.value), cls(`font-semibold text-syntax-weight${underline}`));
        builder.add(aSet.weight.unit, cls(`text-xs text-syntax-weight${underline}`));
      }
      builder.add(
        `${aSet.originalWeight == null && aSet.askWeight ? " ?" : ""}${aSet.askWeight ? "+" : ""}${
          aSet.rpe ? ` @${n(Math.max(0, aSet.rpe))}` : ""
        }${aSet.rpe && aSet.logRpe ? "+" : ""}`,
        cls("font-semibold text-syntax-rpe")
      );
      if (aSet.setTimer != null) {
        const overflow = aSet.isOverflowSetTimer ? "+" : "";
        builder.add(` ${n(Math.max(0, aSet.setTimer))}`, cls("font-semibold text-syntax-timer"));
        builder.add("s", cls("text-xs text-syntax-timer"));
        builder.add(`${overflow}|`, cls("font-semibold text-syntax-timer"));
        if (aSet.timer != null) {
          builder.add(`${n(Math.max(0, aSet.timer))}`, cls("font-semibold text-syntax-timer"));
          builder.add("s", cls("text-xs text-syntax-timer"));
        } else {
          builder.add("?", cls("font-semibold text-syntax-timer"));
        }
      } else if (aSet.timer != null) {
        builder.add(` ${n(aSet.timer)}`, cls("text-syntax-timer"));
        builder.add("s", cls("text-xs text-syntax-timer"));
      }
      if (aSet.auto) {
        builder.add(" auto", cls("text-syntax-auto"));
      }
      const built = builder.build();
      return (
        <View>
          {aSet.label ? <Text className="text-xs text-text-secondary">{aSet.label}</Text> : null}
          {props.setType === "adhoc" && <Text className="text-xs text-text-secondary">Ad-hoc</Text>}
          {hasTarget ? (
            <FastText text={built.text} fragments={built.fragments} {...cls(`${sizeClass} text-text-primary`)} />
          ) : (
            <Text className={sizeClass}>None</Text>
          )}
        </View>
      );
    }
  }
}

interface IWorkoutExerciseLastSetProps {
  set?: ISet;
  sizeClass?: string;
}

export function WorkoutExerciseLastSet(props: IWorkoutExerciseLastSetProps): JSX.Element {
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
      <FastText
        text={built.text}
        fragments={built.fragments}
        {...cls(`${props.sizeClass ?? "text-sm"} text-text-primary`)}
      />
    </View>
  );
}

interface IRpeWeightHintProps {
  reps: number;
  rpe: number;
  settings: ISettings;
  exerciseType: IExerciseType;
}

export function RpeWeightHint(props: IRpeWeightHintProps): JSX.Element {
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

interface IWorkoutExerciseSetRpeTimeProps {
  set: ISet;
  isUnilateral: boolean;
  completedRpeValue?: number;
  width?: number;
  sizeClass?: string;
  onEditSetTimer?: () => void;
}

export function WorkoutExerciseSetRpeTime(props: IWorkoutExerciseSetRpeTimeProps): JSX.Element {
  const { set, isUnilateral, completedRpeValue } = props;
  const sizeClass = props.sizeClass ?? "text-xs";
  return (
    <View
      className="items-center justify-center py-2 ml-1"
      style={props.width != null ? { width: props.width } : undefined}
    >
      {completedRpeValue != null ? (
        <Text
          numberOfLines={1}
          data-testid="rpe-value"
          testID="rpe-value"
          className={`${sizeClass} font-semibold text-text-success`}
        >
          @{n(completedRpeValue)}
        </Text>
      ) : null}
      {set.completedSetTimer != null || set.completedSetTimerLeft != null ? (
        <Pressable
          data-testid="set-timer-value"
          testID="set-timer-value"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={props.onEditSetTimer}
        >
          {isUnilateral && (
            <Text
              numberOfLines={1}
              data-testid="set-timer-value-left"
              testID="set-timer-value-left"
              className={`${sizeClass} font-semibold text-syntax-timer`}
            >
              L {set.completedSetTimerLeft != null ? TimeUtils_formatMMSS(set.completedSetTimerLeft * 1000) : "-"}
            </Text>
          )}
          <Text numberOfLines={1} className={`${sizeClass} font-semibold text-syntax-timer`}>
            {isUnilateral ? "R " : ""}
            {set.completedSetTimer != null ? TimeUtils_formatMMSS(set.completedSetTimer * 1000) : "-"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function WorkoutExerciseSet_dataCy(set: ISet): string {
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
  setType: IWorkoutSetType;
  set: ISet;
  lastSet?: ISet;
  settings: ISettings;
  exerciseType: IExerciseType;
  underlineRounded?: boolean;
  sizeClass?: string;
  dimIncomplete?: boolean;
}

export function WorkoutExerciseSetTargetField(props: IWorkoutExerciseSetTargetFieldProps): JSX.Element {
  switch (props.settings.workoutSettings.targetType) {
    case "target": {
      return (
        <WorkoutExerciseSetTarget
          set={props.set}
          setType={props.setType}
          underlineRounded={props.underlineRounded}
          sizeClass={props.sizeClass}
        />
      );
    }
    case "lasttime": {
      return <WorkoutExerciseLastSet set={props.lastSet} sizeClass={props.sizeClass} />;
    }
    case "platescalculator": {
      return (
        <WorkoutExercisePlatesCalculator
          set={props.set}
          settings={props.settings}
          exerciseType={props.exerciseType}
          sizeClass={props.sizeClass}
        />
      );
    }
    case "e1rm": {
      return (
        <WorkoutExerciseE1RMSet
          set={props.set}
          settings={props.settings}
          sizeClass={props.sizeClass}
          dimIncomplete={props.dimIncomplete}
        />
      );
    }
  }
  return <View />;
}

interface IWorkoutExercisePlatesCalculatorProps {
  set: ISet;
  settings: ISettings;
  exerciseType: IExerciseType;
  sizeClass?: string;
}

function WorkoutExercisePlatesCalculator(props: IWorkoutExercisePlatesCalculatorProps): JSX.Element {
  const sizeClass = props.sizeClass ?? "text-sm";
  const setWeight = props.set.weight;
  if (setWeight == null) {
    return (
      <Text className={`${sizeClass} font-semibold`} data-testid="plates-list" testID="plates-list">
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
      className={`${sizeClass} font-semibold ${Weight_eq(weight, props.set.completedWeight ?? setWeight) ? "text-text-primary" : "text-text-error"}`}
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
  sizeClass?: string;
  dimIncomplete?: boolean;
}

function WorkoutExerciseE1RMSet(props: IWorkoutExerciseE1RMSetProps): JSX.Element {
  const cls = StyledText_cls(useRem());
  const sizeClass = props.sizeClass ?? "text-sm";
  const set = props.set;
  const isCompleted = !!set.isCompleted;
  const weight = set.completedWeight ?? set.weight ?? set.originalWeight;
  const reps = Reps_avgUnilateralCompletedReps(set) ?? set.reps;
  const rpe = set.completedRpe ?? set.rpe ?? 10;
  if (weight == null || Weight_isPct(weight) || reps == null) {
    return <Text className={sizeClass}>Unknown</Text>;
  }
  const e1RM = Weight_getOneRepMax(weight, reps, rpe);
  const built = new StyledText().add(n(e1RM.value), cls("font-semibold")).add(e1RM.unit, cls("text-xs")).build();
  return (
    <FastText
      text={built.text}
      fragments={built.fragments}
      {...cls(`${sizeClass} text-text-primary`)}
      style={isCompleted || props.dimIncomplete === false ? undefined : { opacity: 0.4 }}
    />
  );
}
