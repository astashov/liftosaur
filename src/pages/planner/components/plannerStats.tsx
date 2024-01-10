import { h, JSX, Fragment } from "preact";
import { IPlannerState, IPlannerUiFocusedExercise, ISetResults, ISetSplit } from "../models/types";
import { ObjectUtils } from "../../../utils/object";
import { StringUtils } from "../../../utils/string";
import { PlannerWeekMuscles } from "./plannerWeekMuscles";
import { IExerciseKind } from "../../../models/exercise";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { LinkButton } from "../../../components/linkButton";
import { lb } from "lens-shmens";
import { useState } from "preact/hooks";
import { CollectionUtils } from "../../../utils/collection";
import { IScreenMuscle, ISettings } from "../../../types";

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
    <div className="mb-2 text-sm">
      <div>
        <span className="text-grayv2-main">Total Sets:</span> {setResults.total}
      </div>
      <div>
        <span className="text-grayv2-main">Strength Sets: </span>
        <span
          className={
            props.colorize ? colorPctValue(setResults.total, setResults.strength, settings.planner.strengthSetsPct) : ""
          }
        >
          {setResults.strength}
          {setResults.total > 0 ? `, ${Math.round((setResults.strength * 100) / setResults.total)}%` : ""}
        </span>
      </div>
      <div className="mb-2">
        <span className="text-grayv2-main">Hypertrophy Sets: </span>
        <span
          className={
            props.colorize
              ? colorPctValue(setResults.total, setResults.hypertrophy, settings.planner.hypertrophySetsPct)
              : ""
          }
        >
          {setResults.hypertrophy}
          {setResults.total > 0 ? `, ${Math.round((setResults.hypertrophy * 100) / setResults.total)}%` : ""}
        </span>
      </div>
      <div>
        {labelSet("Upper Sets", showLink, ["upper"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.upper} settings={settings} shouldIncludeFrequency={frequency} />
      </div>
      <div>
        {labelSet("Lower Sets", showLink, ["lower"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.lower} settings={settings} shouldIncludeFrequency={frequency} />
      </div>
      <div>
        {labelSet("Core Sets", showLink, ["core"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.core} settings={settings} shouldIncludeFrequency={frequency} />
      </div>
      <div>
        {labelSet("Push Sets", showLink, ["push"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.push} settings={settings} shouldIncludeFrequency={frequency} />
      </div>
      <div>
        {labelSet("Pull Sets", showLink, ["pull"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.pull} settings={settings} shouldIncludeFrequency={frequency} />
      </div>
      <div className="mb-4">
        {labelSet("Legs Sets", showLink, ["legs"], [], dispatch, focusedExercise)}{" "}
        <PlannerSetSplit split={setResults.legs} settings={settings} shouldIncludeFrequency={frequency} />
      </div>

      <div className="w-32 mb-2">
        <PlannerWeekMuscles settings={props.settings} data={setResults.muscleGroup} />
      </div>

      {ObjectUtils.keys(setResults.muscleGroup).map((muscleGroup) => {
        return (
          <div>
            {labelSet(StringUtils.capitalize(muscleGroup), showLink, [], [muscleGroup], dispatch, focusedExercise)}{" "}
            <PlannerSetSplit
              split={setResults.muscleGroup[muscleGroup]}
              settings={settings}
              shouldIncludeFrequency={frequency}
              muscle={props.colorize ? muscleGroup : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

function labelSet(
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
            })
          );
        }}
      >
        {label}:
      </LinkButton>
    );
  } else {
    return <span className="text-grayv2-main">{label}:</span>;
  }
}

function PlannerSetSplit(props: {
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
    <span onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      <span className={`cursor-auto relative ${setColor}`}>
        {total}
        {setDirection}
        {showTooltip && <PlannerStatsTooltip split={split} />}
      </span>{" "}
      {total > 0 && (
        <>
          ({split.strength > 0 && <abbr title="Strength Sets Number">{split.strength}s</abbr>}
          {split.strength > 0 && split.hypertrophy > 0 && ", "}
          {split.hypertrophy > 0 && <abbr title="Hypertrophy Sets Number">{split.hypertrophy}h</abbr>})
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
    </span>
  );
}

function colorPctValue(total: number, num: number, target: number): string {
  const strengthPct = total > 0 ? Math.round((num * 100) / total) : 0;
  if (strengthPct >= target) {
    return "text-greenv2-main";
  } else if (strengthPct >= target - 10) {
    return "text-yellowv2";
  } else {
    return "text-redv2-main";
  }
}

function colorRangeValue(value: number, min: number, max: number): string {
  if (value >= min && value <= max) {
    return "text-greenv2-main";
  } else if (value >= min * 0.7 && value <= max * 1.3) {
    return "text-yellowv2";
  } else {
    return "text-redv2-main";
  }
}

function directionValue(value: number, min: number, max: number): string {
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
    <div className="absolute z-10 px-3 py-2 text-xs bg-white border border-grayv2-400 rounded-xl text-blackv2 planner-stats-tooltip">
      <ul style={{ minWidth: "14rem" }}>
        {exercises.map((exercise) => {
          const totalSets = exercise.strengthSets + exercise.hypertrophySets;
          return (
            <li className={`font-bold ${exercise.isSynergist ? "text-grayv2-main" : "text-blackv2"}`}>
              {exercise.exerciseName}: {totalSets} ({exercise.strengthSets}s, {exercise.hypertrophySets}h)
            </li>
          );
        })}
      </ul>
    </div>
  );
}
