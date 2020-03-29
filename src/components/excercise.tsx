import { h, JSX, Fragment } from "preact";
import { ExcerciseSetView } from "./excerciseSet";
import { IExcercise } from "../models/excercise";
import { IDispatch } from "../ducks/types";
import { IProgramEntry } from "../models/history";
import { IProgressEntry } from "../models/progress";

interface IProps {
  entry: IProgramEntry;
  progress?: IProgressEntry;
  dispatch: IDispatch;
}

export function ExcerciseView(props: IProps): JSX.Element {
  const { progress, entry } = props;
  let isFinished = entry.sets.length === (progress?.sets ?? []).length;
  for (let i = 0; i < entry.sets.length; i += 1) {
    isFinished = isFinished && progress?.sets[i] != null;
  }
  if (isFinished) {
    const amrap = "amrap" as const;
    const isCompleted = entry.sets.every((e, i) => {
      const set = progress?.sets[i];
      if (set != null) {
        if (e.reps === amrap) {
          return set.reps > 0;
        } else {
          return e.reps === set.reps;
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
  const weight = props.entry.sets[0].weight;
  return (
    <Fragment>
      <header className="pb-2">
        {props.entry.excercise.name}, <strong>{weight}</strong>
      </header>
      <section className="flex">
        {props.entry.sets.map((set, i) => {
          const completedReps = props.progress?.sets[i];
          return (
            <ExcerciseSetView
              reps={set.reps}
              weight={weight}
              completedReps={completedReps?.reps}
              onClick={event => {
                event.preventDefault();
                handleClick(props.dispatch, props.entry.excercise, weight, i);
              }}
            />
          );
        })}
      </section>
    </Fragment>
  );
}

function handleClick(dispatch: IDispatch, excercise: IExcercise, weight: number, setIndex: number): void {
  dispatch({ type: "ChangeRepsAction", excercise, setIndex, weight });
}
