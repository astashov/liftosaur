import { View } from "react-native";
import { IPlannerState, IPlannerUiFocusedExercise, ISetResults, ISetSplit } from "../models/types";
import { ObjectUtils } from "../../../utils/object";
import { StringUtils } from "../../../utils/string";
import { PlannerWeekMuscles } from "./plannerWeekMuscles";
import { IExerciseKind } from "../../../models/exercise";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { LinkButton } from "../../../components/linkButton";
import { lb } from "lens-shmens";
import { useState } from "react";
import { CollectionUtils } from "../../../utils/collection";
import { IScreenMuscle, ISettings } from "../../../types";
import { n } from "../../../utils/math";
import { LftText } from "../../../components/lftText";

interface IPlannerWeekStatsProps {
  setResults: ISetResults;
  colorize: boolean;
  frequency: boolean;
  settings: ISettings;
  dispatch: ILensDispatch<IPlannerState>;
  focusedExercise?: IPlannerUiFocusedExercise;
}

export function PlannerStats(props: IPlannerWeekStatsProps): JSX.Element {
  const { setResults, settings, frequency, dispatch, focusedExercise } = props;
  const showLink = !frequency;
  return (
    <View className="mb-2 text-sm">
      <View>
        <LftText className="text-grayv2-main">Total Sets:</LftText> {setResults.total}
      </View>
      <View>
        <LftText className="text-grayv2-main">Strength Sets: </LftText>
        <LftText
          className={
            props.colorize ? colorPctValue(setResults.total, setResults.strength, settings.planner.strengthSetsPct) : ""
          }
        >
          {setResults.strength}
          {setResults.total > 0 ? `, ${Math.round((setResults.strength * 100) / setResults.total)}%` : ""}
        </LftText>
      </View>
      <View className="mb-2">
        <LftText className="text-grayv2-main">Hypertrophy Sets: </LftText>
        <LftText
          className={
            props.colorize
              ? colorPctValue(setResults.total, setResults.hypertrophy, settings.planner.hypertrophySetsPct)
              : ""
          }
        >
          {setResults.hypertrophy}
          {setResults.total > 0 ? `, ${Math.round((setResults.hypertrophy * 100) / setResults.total)}%` : ""}
        </LftText>
      </View>
      <View>
        {labelSet("Upper Sets", showLink, ["upper"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.upper} settings={settings} shouldIncludeFrequency={frequency} />
      </View>
      <View>
        {labelSet("Lower Sets", showLink, ["lower"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.lower} settings={settings} shouldIncludeFrequency={frequency} />
      </View>
      <View>
        {labelSet("Core Sets", showLink, ["core"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.core} settings={settings} shouldIncludeFrequency={frequency} />
      </View>
      <View>
        {labelSet("Push Sets", showLink, ["push"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.push} settings={settings} shouldIncludeFrequency={frequency} />
      </View>
      <View>
        {labelSet("Pull Sets", showLink, ["pull"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.pull} settings={settings} shouldIncludeFrequency={frequency} />
      </View>
      <View className="mb-4">
        {labelSet("Legs Sets", showLink, ["legs"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.legs} settings={settings} shouldIncludeFrequency={frequency} />
      </View>

      <View className="w-32 mb-2">
        <PlannerWeekMuscles settings={props.settings} data={setResults.muscleGroup} />
      </View>

      {ObjectUtils.keys(setResults.muscleGroup).map((muscleGroup) => {
        return (
          <View>
            {labelSet(StringUtils.capitalize(muscleGroup), showLink, [], [muscleGroup], dispatch, focusedExercise)}{" "}
            <PlannerSetSplit
              split={setResults.muscleGroup[muscleGroup]}
              settings={settings}
              shouldIncludeFrequency={frequency}
              muscle={props.colorize ? muscleGroup : undefined}
            />
          </View>
        );
      })}
    </View>
  );
}

export function labelSet(
  label: string,
  showLink: boolean,
  types: IExerciseKind[],
  muscleGroups: IScreenMuscle[],
  dispatch: ILensDispatch<IPlannerState>,
  focusedExercise?: IPlannerUiFocusedExercise
): JSX.Element {
  if (showLink && focusedExercise) {
    return (
      <LinkButton
        name={`planner-stats-${label}`}
        className="font-normal"
        onPress={() => {
          dispatch(
            lb<IPlannerState>().p("ui").p("modalExercise").record({
              focusedExercise,
              types,
              muscleGroups,
            })
          );
        }}
      >
        {label}:
      </LinkButton>
    );
  } else {
    return <LftText className="text-grayv2-main">{label}:</LftText>;
  }
}

export function PlannerSetSplit(props: {
  split: ISetSplit;
  settings: ISettings;
  shouldIncludeFrequency: boolean;
  muscle?: IScreenMuscle;
}): JSX.Element {
  const { split, settings, shouldIncludeFrequency, muscle } = props;
  const [showTooltip, setShowTooltip] = useState(false);
  const total = split.strength + split.hypertrophy;
  const frequency = Object.keys(split.frequency).length;
  const setColor = muscle
    ? colorRangeValue(
        total,
        settings.planner.weeklyRangeSets[muscle]?.[0] ?? 0,
        settings.planner.weeklyRangeSets[muscle]?.[1] ?? 0
      )
    : "";
  const setDirection = muscle
    ? directionValue(
        total,
        settings.planner.weeklyRangeSets[muscle]?.[0] ?? 0,
        settings.planner.weeklyRangeSets[muscle]?.[1] ?? 0
      )
    : "";
  const frequencyColor = muscle ? colorThresholdValue(frequency, settings.planner.weeklyFrequency[muscle] ?? 0) : "";

  return (
    <LftText onPress={() => setShowTooltip(!showTooltip)}>
      <LftText className={`cursor-auto relative ${setColor}`}>
        {n(total, 0)}
        {setDirection}
        {showTooltip && <PlannerStatsTooltip split={split} />}
      </LftText>{" "}
      {total > 0 && (
        <>
          ({split.strength > 0 && <abbr title="Strength Sets Number">{n(split.strength, 0)}s</abbr>}
          {split.strength > 0 && split.hypertrophy > 0 && ", "}
          {split.hypertrophy > 0 && <abbr title="Hypertrophy Sets Number">{n(split.hypertrophy, 0)}h</abbr>})
        </>
      )}
      {shouldIncludeFrequency && frequency > 0 && (
        <>
          ,{" "}
          <abbr className={frequencyColor} title="Frequency, days">
            {Object.keys(split.frequency).length}d
          </abbr>
        </>
      )}
    </LftText>
  );
}

export function colorPctValue(total: number, num: number, target: number): string {
  const strengthPct = total > 0 ? Math.round((num * 100) / total) : 0;
  if (strengthPct >= target) {
    return "text-greenv2-main";
  } else if (strengthPct >= target - 10) {
    return "text-yellowv2";
  } else {
    return "text-redv2-main";
  }
}

export function colorRangeValue(value: number, min: number, max: number): string {
  if (value >= min && value <= max) {
    return "text-greenv2-main";
  } else if (value >= min * 0.7 && value <= max * 1.3) {
    return "text-yellowv2";
  } else {
    return "text-redv2-main";
  }
}

export function directionValue(value: number, min: number, max: number): string {
  if (value < min) {
    return "↑";
  } else if (value > max) {
    return "↓";
  } else {
    return "";
  }
}

function colorThresholdValue(value: number, threshold: number): string {
  if (value >= threshold) {
    return "text-greenv2-main";
  } else if (value >= threshold * 0.5) {
    return "text-yellowv2";
  } else {
    return "text-redv2-main";
  }
}

function PlannerStatsTooltip(props: { split: ISetSplit }): JSX.Element | null {
  const split = props.split;
  const exercises = CollectionUtils.sort(split.exercises, (a, b) => {
    if ((a.isSynergist && b.isSynergist) || (!a.isSynergist && !b.isSynergist)) {
      return a.exerciseName.localeCompare(b.exerciseName);
    } else if (a.isSynergist) {
      return 1;
    } else {
      return -1;
    }
  });
  if (exercises.length === 0) {
    return null;
  }

  return (
    <View className="absolute z-10 px-3 py-2 text-xs bg-white border border-grayv2-400 rounded-xl text-blackv2 planner-stats-tooltip">
      <ul style={{ minWidth: "14rem" }}>
        {exercises.map((exercise) => {
          const totalSets = exercise.strengthSets + exercise.hypertrophySets;
          return (
            <li className={`font-bold ${exercise.isSynergist ? "text-grayv2-main" : "text-blackv2"}`}>
              {exercise.exerciseName}: {n(totalSets)} ({exercise.strengthSets}s, {n(exercise.hypertrophySets)}h)
            </li>
          );
        })}
      </ul>
    </View>
  );
}
