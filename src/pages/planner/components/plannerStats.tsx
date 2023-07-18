import { h, JSX, Fragment } from "preact";
import { IPlannerSettings, IPlannerState, IPlannerUiFocusedExercise, ISetResults, ISetSplit } from "../models/types";
import { IScreenMuscle } from "../../../models/muscle";
import { ObjectUtils } from "../../../utils/object";
import { StringUtils } from "../../../utils/string";
import { PlannerWeekMuscles } from "./plannerWeekMuscles";
import { IExerciseKind } from "../../../models/exercise";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { LinkButton } from "../../../components/linkButton";
import { lb } from "lens-shmens";

interface IPlannerWeekStatsProps {
  setResults: ISetResults;
  colorize: boolean;
  frequency: boolean;
  settings: IPlannerSettings;
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
            props.colorize ? colorPctValue(setResults.total, setResults.strength, settings.strengthSetsPct) : ""
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
            props.colorize ? colorPctValue(setResults.total, setResults.hypertrophy, settings.hypertrophySetsPct) : ""
          }
        >
          {setResults.hypertrophy}
          {setResults.total > 0 ? `, ${Math.round((setResults.hypertrophy * 100) / setResults.total)}%` : ""}
        </span>
      </div>
      <div>
        {labelSet("Upper Sets", showLink, ["upper"], [], dispatch, focusedExercise)}{" "}
        {formatSetSplit(setResults.upper, settings, props.frequency)}
      </div>
      <div>
        {labelSet("Lower Sets", showLink, ["lower"], [], dispatch, focusedExercise)}{" "}
        {formatSetSplit(setResults.lower, settings, frequency)}
      </div>
      <div>
        {labelSet("Core Sets", showLink, ["core"], [], dispatch, focusedExercise)}{" "}
        {formatSetSplit(setResults.core, settings, frequency)}
      </div>
      <div>
        {labelSet("Push Sets", showLink, ["push"], [], dispatch, focusedExercise)}{" "}
        {formatSetSplit(setResults.push, settings, frequency)}
      </div>
      <div>
        {labelSet("Pull Sets", showLink, ["pull"], [], dispatch, focusedExercise)}{" "}
        {formatSetSplit(setResults.pull, settings, frequency)}
      </div>
      <div className="mb-4">
        {labelSet("Legs Sets", showLink, ["legs"], [], dispatch, focusedExercise)}{" "}
        {formatSetSplit(setResults.legs, settings, frequency)}
      </div>

      {props.frequency && (
        <div className="w-32 mb-2">
          <PlannerWeekMuscles settings={props.settings} data={setResults.muscleGroup} />
        </div>
      )}

      {ObjectUtils.keys(setResults.muscleGroup).map((muscleGroup) => {
        return (
          <div>
            {labelSet(StringUtils.capitalize(muscleGroup), showLink, [], [muscleGroup], dispatch, focusedExercise)}{" "}
            {formatSetSplit(
              setResults.muscleGroup[muscleGroup],
              settings,
              frequency,
              props.colorize ? muscleGroup : undefined
            )}
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

function formatSetSplit(
  split: ISetSplit,
  settings: IPlannerSettings,
  shouldIncludeFrequency: boolean,
  muscle?: IScreenMuscle
): JSX.Element {
  const total = split.strength + split.hypertrophy;
  const frequency = Object.keys(split.frequency).length;
  const setColor = muscle
    ? colorRangeValue(total, settings.weeklyRangeSets[muscle][0], settings.weeklyRangeSets[muscle][1])
    : "";
  const frequencyColor = muscle ? colorThresholdValue(frequency, settings.weeklyFrequency[muscle]) : "";

  return (
    <span>
      <span className={setColor}>{total}</span>{" "}
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

function colorThresholdValue(value: number, threshold: number): string {
  if (value >= threshold) {
    return "text-greenv2-main";
  } else if (value >= threshold * 0.5) {
    return "text-yellowv2";
  } else {
    return "text-redv2-main";
  }
}
