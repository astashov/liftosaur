import { h, JSX, Fragment } from "preact";
import { ExcerciseSetView } from "./excerciseSet";
import { Excercise, IExcerciseType } from "../models/excercise";
import { IDispatch } from "../ducks/types";
import { IHistoryEntry } from "../models/history";
import { IProgressEntry, IProgressMode } from "../models/progress";
import { Weight, IPlate } from "../models/weight";
import { Reps, ISet } from "../models/set";

interface IProps {
  entry: IHistoryEntry;
  progress: IProgressEntry;
  availablePlates: IPlate[];
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode) => void;
}

export function ExcerciseView(props: IProps): JSX.Element {
  const { progress } = props;
  if (Reps.isFinished(progress.sets)) {
    if (Reps.isCompleted(progress.sets)) {
      return (
        <section className="px-4 pt-4 pb-2 bg-green-100 border border-green-300 mb-2 rounded-lg">
          <ExcerciseContentView {...props} />
        </section>
      );
    } else {
      return (
        <section className="px-4 pt-4 pb-2 bg-red-100 border border-red-300 mb-2 rounded-lg">
          <ExcerciseContentView {...props} />
        </section>
      );
    }
  } else {
    return (
      <section className="px-4 pt-4 pb-2 bg-gray-100 border border-gray-300 mb-2 rounded-lg">
        <ExcerciseContentView {...props} />
      </section>
    );
  }
}

function ExcerciseContentView(props: IProps): JSX.Element {
  const excercise = Excercise.get(props.entry.excercise);
  const workoutWeights = Array.from(new Set(props.progress.sets.map(s => s.weight)));
  workoutWeights.sort((a, b) => a - b);
  const warmupSets = Excercise.getWarmupSets(props.entry.excercise, workoutWeights[0]);
  const warmupWeights = Array.from(new Set(warmupSets.map(s => s.weight))).filter(
    w => Object.keys(Weight.calculatePlates(props.availablePlates, w - excercise.startWeight)).length > 0
  );
  warmupWeights.sort((a, b) => a - b);
  return (
    <Fragment>
      <header className="flex">
        <div className="flex-1 mr-auto">{excercise.name}</div>
        <div className="text-right">
          {warmupWeights.map(w => (
            <div>
              <WeightView weight={w} plates={props.availablePlates} />
              <span className="text-gray-500">{w} lbs</span>
            </div>
          ))}
          {workoutWeights.map(w => (
            <div>
              <WeightView weight={w} plates={props.availablePlates} />
              <button
                className="text-blue-500 underline cursor-pointer"
                onClick={() =>
                  props.dispatch({ type: "ChangeWeightAction", weight: w, excercise: props.entry.excercise })
                }
              >
                {w} lbs
              </button>
            </div>
          ))}
        </div>
      </header>
      <section className="flex flex-wrap pt-2">
        {warmupSets?.length > 0 && (
          <Fragment>
            {warmupSets.map((set, i) => {
              const warmupProgressSet = props.progress.warmupSets[i] as ISet | undefined;
              return (
                <div>
                  <div className="text-gray-400 text-xs" style={{ marginTop: "-0.75em", marginBottom: "-0.75em" }}>
                    Warmup
                  </div>
                  <ExcerciseSetView
                    reps={set.reps}
                    weight={set.weight}
                    completedReps={warmupProgressSet?.completedReps}
                    onClick={event => {
                      event.preventDefault();
                      props.onChangeReps("warmup");
                      handleClick(props.dispatch, props.entry.excercise, set.weight, i, "warmup");
                    }}
                  />
                </div>
              );
            })}
            <div style={{ width: "1px" }} className="bg-gray-400 h-12 mr-3 my-2"></div>
          </Fragment>
        )}
        {props.entry.sets.map((set, i) => {
          const progressSet = props.progress.sets[i];
          return (
            <ExcerciseSetView
              reps={set.reps}
              weight={progressSet.weight}
              completedReps={progressSet.completedReps}
              onClick={event => {
                event.preventDefault();
                props.onChangeReps("workout");
                handleClick(props.dispatch, props.entry.excercise, progressSet.weight, i, "workout");
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
  excercise: IExcerciseType,
  weight: number,
  setIndex: number,
  mode: IProgressMode
): void {
  dispatch({ type: "ChangeRepsAction", excercise, setIndex, weight, mode });
}

function WeightView(props: { weight: number; plates: IPlate[] }): JSX.Element {
  const plates = Weight.calculatePlates(props.plates, props.weight - 45);
  const weightOfPlates = Weight.platesWeight(plates);
  const className = weightOfPlates === props.weight - 45 ? "text-gray-600" : "text-red-600";
  return (
    <span className="text-xs mx-2 break-all">
      <span className={className}>{Weight.formatOneSide(plates)}</span>
    </span>
  );
}
