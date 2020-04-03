import { h, JSX, Fragment } from "preact";
import { ExcerciseSetView } from "./excerciseSet";
import { Excercise, IExcerciseType } from "../models/excercise";
import { IDispatch } from "../ducks/types";
import { IProgramEntry } from "../models/history";
import { IProgressEntry } from "../models/progress";

interface IProps {
  entry: IProgramEntry;
  progress: IProgressEntry;
  dispatch: IDispatch;
  onChangeReps: () => void;
}

export function ExcerciseView(props: IProps): JSX.Element {
  const { progress, entry } = props;
  let isFinished = entry.sets.length === (progress?.sets ?? []).length;
  for (let i = 0; i < entry.sets.length; i += 1) {
    isFinished = isFinished && progress.sets[i].reps != null;
  }
  if (isFinished) {
    const isCompleted = entry.sets.every((e, i) => {
      const reps = progress.sets[i].reps;
      if (reps != null) {
        if (e.reps === "amrap") {
          return reps > 0;
        } else {
          return e.reps === reps;
        }
      } else {
        return false;
      }
    });
    if (isCompleted) {
      return (
        <section className="p-4 bg-green-100 border border-green-300 mb-2 rounded-lg">
          <ExcerciseContentView {...props} />
        </section>
      );
    } else {
      return (
        <section className="p-4 bg-red-100 border border-red-300 mb-2 rounded-lg">
          <ExcerciseContentView {...props} />
        </section>
      );
    }
  } else {
    return (
      <section className="p-4 bg-gray-100 border border-gray-300 mb-2 rounded-lg">
        <ExcerciseContentView {...props} />
      </section>
    );
  }
}

function ExcerciseContentView(props: IProps): JSX.Element {
  const weights = Array.from(new Set(props.progress.sets.map(s => s.weight)));
  const excercise = Excercise.get(props.entry.excercise);
  return (
    <Fragment>
      <header className="pb-2 flex">
        <div className="flex-1 mr-auto">{excercise.name}</div>
        <div>
          {weights.map(w => (
            <div>
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
      <section className="flex">
        {props.entry.sets.map((set, i) => {
          const progressSet = props.progress.sets[i];
          return (
            <ExcerciseSetView
              reps={set.reps}
              weight={progressSet.weight}
              completedReps={progressSet.reps}
              onClick={event => {
                event.preventDefault();
                props.onChangeReps();
                handleClick(props.dispatch, props.entry.excercise, progressSet.weight, i);
              }}
            />
          );
        })}
      </section>
    </Fragment>
  );
}

function handleClick(dispatch: IDispatch, excercise: IExcerciseType, weight: number, setIndex: number): void {
  dispatch({ type: "ChangeRepsAction", excercise, setIndex, weight });
}
