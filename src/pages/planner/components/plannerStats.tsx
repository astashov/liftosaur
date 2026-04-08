import { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../../components/primitives/text";
import { IPlannerState, IPlannerUiFocusedExercise, ISetResults, ISetSplit } from "../models/types";
import { ObjectUtils_keys } from "../../../utils/object";
import { PlannerWeekMuscles } from "./plannerWeekMuscles";
import { IExerciseKind } from "../../../models/exercise";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { LinkButton } from "../../../components/linkButton";
import { lb } from "lens-shmens";
import { IScreenMuscle, ISettings } from "../../../types";
import { n } from "../../../utils/math";
import { Muscle_getMuscleGroupName } from "../../../models/muscle";
import { navigationRef } from "../../../navigation/navigationRef";

interface IPlannerWeekStatsProps {
  setResults: ISetResults;
  colorize: boolean;
  frequency: boolean;
  settings: ISettings;
  dispatch: ILensDispatch<IPlannerState>;
  onEditSettings?: () => void;
  focusedExercise?: IPlannerUiFocusedExercise;
}

export function PlannerStats(props: IPlannerWeekStatsProps): JSX.Element {
  const { setResults, settings, frequency, dispatch, focusedExercise, onEditSettings } = props;
  const showLink = !frequency;
  return (
    <View className="mb-2 text-sm" data-cy="planner-stats">
      <Text>
        <Text className="text-text-secondary">Total Sets:</Text> {setResults.total}
      </Text>
      <Text>
        <Text className="text-text-secondary">Strength Sets: </Text>
        <Text
          className={
            props.colorize ? colorPctValue(setResults.total, setResults.strength, settings.planner.strengthSetsPct) : ""
          }
        >
          {setResults.strength}
          {setResults.total > 0 ? `, ${Math.round((setResults.strength * 100) / setResults.total)}%` : ""}
        </Text>
      </Text>
      <Text className="mb-2">
        <Text className="text-text-secondary">Hypertrophy Sets: </Text>
        <Text
          className={
            props.colorize
              ? colorPctValue(setResults.total, setResults.hypertrophy, settings.planner.hypertrophySetsPct)
              : ""
          }
        >
          {setResults.hypertrophy}
          {setResults.total > 0 ? `, ${Math.round((setResults.hypertrophy * 100) / setResults.total)}%` : ""}
        </Text>
      </Text>
      <Text>
        {labelSet("Upper Sets", showLink, ["upper"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.upper} settings={settings} shouldIncludeFrequency={frequency} />
      </Text>
      <Text>
        {labelSet("Lower Sets", showLink, ["lower"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.lower} settings={settings} shouldIncludeFrequency={frequency} />
      </Text>
      <Text>
        {labelSet("Core Sets", showLink, ["core"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.core} settings={settings} shouldIncludeFrequency={frequency} />
      </Text>
      <Text>
        {labelSet("Push Sets", showLink, ["push"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.push} settings={settings} shouldIncludeFrequency={frequency} />
      </Text>
      <Text>
        {labelSet("Pull Sets", showLink, ["pull"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.pull} settings={settings} shouldIncludeFrequency={frequency} />
      </Text>
      <Text className="mb-4">
        {labelSet("Legs Sets", showLink, ["legs"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.legs} settings={settings} shouldIncludeFrequency={frequency} />
      </Text>

      <View className="w-32 mb-2">
        <PlannerWeekMuscles settings={props.settings} data={setResults.muscleGroup} />
      </View>

      {onEditSettings && (
        <View className="py-2 text-xs">
          <LinkButton name="planner-stats-edit-settings" onClick={() => onEditSettings()}>
            Edit Weekly Muscle Range Settings
          </LinkButton>
        </View>
      )}

      {ObjectUtils_keys(setResults.muscleGroup).map((muscleGroup) => {
        return (
          <Text key={muscleGroup}>
            {labelSet(
              Muscle_getMuscleGroupName(muscleGroup, props.settings),
              showLink,
              [],
              [muscleGroup],
              dispatch,
              focusedExercise
            )}{" "}
            <PlannerSetSplit
              split={setResults.muscleGroup[muscleGroup]}
              settings={settings}
              shouldIncludeFrequency={frequency}
              muscle={props.colorize ? muscleGroup : undefined}
            />
          </Text>
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
        onClick={() => {
          dispatch(
            lb<IPlannerState>().p("ui").p("modalExercise").record({
              focusedExercise,
              types,
              muscleGroups,
            }),
            "Open exercise modal"
          );
        }}
      >
        {label}:
      </LinkButton>
    );
  } else {
    return <Text className="text-text-secondary">{label}:</Text>;
  }
}

export function PlannerSetSplit(props: {
  split: ISetSplit;
  settings: ISettings;
  shouldIncludeFrequency: boolean;
  muscle?: IScreenMuscle;
}): JSX.Element {
  const { split, settings, shouldIncludeFrequency, muscle } = props;
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

  const handlePress =
    split.exercises.length > 0
      ? () => navigationRef.navigate("setSplitModal", { exercises: split.exercises })
      : undefined;

  return (
    <Text onPress={handlePress}>
      <Text className={setColor}>
        {n(total, 0)}
        {setDirection}
      </Text>{" "}
      {total > 0 && (
        <Text>
          ({split.strength > 0 && <Text>{n(split.strength, 0)}s</Text>}
          {split.strength > 0 && split.hypertrophy > 0 && ", "}
          {split.hypertrophy > 0 && <Text>{n(split.hypertrophy, 0)}h</Text>})
        </Text>
      )}
      {shouldIncludeFrequency && frequency > 0 && (
        <Text className={frequencyColor}>
          , {Object.keys(split.frequency).length}d
        </Text>
      )}
    </Text>
  );
}

export function colorPctValue(total: number, num: number, target: number): string {
  const strengthPct = total > 0 ? Math.round((num * 100) / total) : 0;
  if (strengthPct >= target) {
    return "text-text-success";
  } else if (strengthPct >= target - 10) {
    return "text-icon-yellow";
  } else {
    return "text-text-error";
  }
}

export function colorRangeValue(value: number, min: number, max: number): string {
  if (value >= min && value <= max) {
    return "text-text-success";
  } else if (value >= min * 0.7 && value <= max * 1.3) {
    return "text-icon-yellow";
  } else {
    return "text-text-error";
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
    return "text-text-success";
  } else if (value >= threshold * 0.5) {
    return "text-icon-yellow";
  } else {
    return "text-text-error";
  }
}

