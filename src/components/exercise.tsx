import { h, JSX, Fragment } from "preact";
import { ExerciseSetView } from "./exerciseSet";
import { Exercise, IExerciseType } from "../models/exercise";
import { IDispatch } from "../ducks/types";
import { IProgressMode } from "../models/progress";
import { Weight, IWeight } from "../models/weight";
import { Reps } from "../models/set";
import { IHistoryEntry } from "../models/history";
import { CollectionUtils } from "../utils/collection";
import { ISettings } from "../models/settings";
import { IProgramExercise } from "../models/program";
import { ProgressStateChanges } from "./progressStateChanges";

interface IProps {
  entry: IHistoryEntry;
  settings: ISettings;
  day: number;
  programExercise?: IProgramExercise;
  index?: number;
  isCurrent?: boolean;
  forceShowStateChanges?: boolean;
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode) => void;
}

export function ExerciseView(props: IProps): JSX.Element {
  const { entry } = props;
  let className = "px-4 pt-4 pb-2 mb-2 border rounded-lg";
  let dataCy;
  if (Reps.isFinished(entry.sets)) {
    if (Reps.isCompleted(entry.sets)) {
      dataCy = "exercise-completed";
      className += " bg-green-100 border-green-300";
    } else {
      dataCy = "exercise-finished";
      className += " bg-red-100 border-red-300";
    }
  } else {
    dataCy = "exercise-progress";
    className += " bg-gray-100 border-gray-300";
  }
  return (
    <section data-cy={dataCy} className={className}>
      <ExerciseContentView {...props} />
      {props.programExercise && (
        <ProgressStateChanges
          entry={props.entry}
          forceShow={props.forceShowStateChanges}
          settings={props.settings}
          day={props.day}
          state={props.programExercise.state}
          script={props.programExercise.finishDayExpr}
        />
      )}
    </section>
  );
}

function ExerciseContentView(props: IProps): JSX.Element {
  const exercise = Exercise.get(props.entry.exercise);
  const nextSet = [...props.entry.warmupSets, ...props.entry.sets].filter((s) => s.completedReps == null)[0];
  const workoutWeights = CollectionUtils.compatBy(
    props.entry.sets.map((s) => Weight.roundConvertTo(s.weight, props.settings, props.entry.exercise.bar)),
    (w) => w.value.toString()
  );
  workoutWeights.sort(Weight.compare);
  const warmupSets = props.entry.warmupSets;
  const warmupWeights = CollectionUtils.compatBy(
    props.entry.warmupSets.map((s) => Weight.roundConvertTo(s.weight, props.settings, props.entry.exercise.bar)),
    (w) => w.value.toString()
  ).filter((w) => Object.keys(Weight.calculatePlates(w, props.settings, props.entry.exercise.bar).plates).length > 0);
  warmupWeights.sort(Weight.compare);
  return (
    <Fragment>
      <header className="flex">
        <div className="flex-1 mr-auto">{exercise.name}</div>
        <div className="text-right">
          {warmupWeights.map((w) => {
            const className =
              nextSet != null &&
              Weight.eq(Weight.roundConvertTo(nextSet.weight, props.settings, props.entry.exercise.bar), w)
                ? "font-bold"
                : "";
            return (
              <div className={className}>
                <WeightView weight={w} exercise={props.entry.exercise} settings={props.settings} />
                <span className="text-gray-500">
                  {w.value} {w.unit}
                </span>
              </div>
            );
          })}
          {workoutWeights.map((w, i) => {
            const className =
              nextSet != null &&
              Weight.eq(Weight.roundConvertTo(nextSet.weight, props.settings, props.entry.exercise.bar), w)
                ? "font-bold"
                : "";
            return (
              <div className={className}>
                <WeightView weight={w} exercise={props.entry.exercise} settings={props.settings} />
                <button
                  data-help-id={props.index === 0 && i === 0 ? "progress-change-weight" : undefined}
                  data-help="Press here to change weight of the sets."
                  data-help-offset-x={-80}
                  data-help-width={140}
                  data-cy="change-weight"
                  className="text-blue-500 underline cursor-pointer"
                  style={{ fontWeight: "inherit" }}
                  onClick={() =>
                    props.dispatch({ type: "ChangeWeightAction", weight: w, exercise: props.entry.exercise })
                  }
                >
                  {w.value} {w.unit}
                </button>
              </div>
            );
          })}
        </div>
      </header>
      <section className="flex flex-wrap pt-2">
        {warmupSets?.length > 0 && (
          <Fragment>
            {warmupSets.map((set, i) => {
              return (
                <div data-cy="container-set">
                  <div
                    data-cy="warmup-set-title"
                    className="text-xs text-gray-400"
                    style={{ marginTop: "-0.75em", marginBottom: "-0.75em" }}
                  >
                    Warmup
                  </div>
                  <ExerciseSetView
                    showHelp={props.index === 0 && i === 0}
                    settings={props.settings}
                    exercise={props.entry.exercise}
                    isCurrent={!!props.isCurrent}
                    set={set}
                    onClick={(event) => {
                      event.preventDefault();
                      props.onChangeReps("warmup");
                      handleClick(props.dispatch, props.entry.exercise, set.weight, i, "warmup");
                    }}
                  />
                </div>
              );
            })}
            <div style={{ width: "1px" }} className="h-12 my-2 mr-3 bg-gray-400"></div>
          </Fragment>
        )}
        {props.entry.sets.map((set, i) => {
          return (
            <ExerciseSetView
              showHelp={(warmupSets?.length || 0) === 0 && props.index === 0 && i === 0}
              exercise={props.entry.exercise}
              settings={props.settings}
              set={set}
              isCurrent={!!props.isCurrent}
              onClick={(event) => {
                event.preventDefault();
                props.onChangeReps("workout");
                handleClick(props.dispatch, props.entry.exercise, set.weight, i, "workout");
              }}
            />
          );
        })}
      </section>
    </Fragment>
  );
}

function handleClick(
  dispatch: IDispatch,
  exercise: IExerciseType,
  weight: IWeight,
  setIndex: number,
  mode: IProgressMode
): void {
  dispatch({ type: "ChangeRepsAction", exercise, setIndex, weight, mode });
}

function WeightView(props: { weight: IWeight; exercise: IExerciseType; settings: ISettings }): JSX.Element {
  const { plates, totalWeight: weight } = Weight.calculatePlates(props.weight, props.settings, props.exercise.bar);
  const className = Weight.eq(weight, props.weight) ? "text-gray-600" : "text-red-600";
  return (
    <span className="mx-2 text-xs break-all">
      <span className={className}>{Weight.formatOneSide(plates, props.exercise.bar)}</span>
    </span>
  );
}
