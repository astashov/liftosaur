import { h, JSX, Fragment } from "preact";
import { ExcerciseSetView } from "./excerciseSet";
import { ISet } from "../models/types";
import { IExcercise } from "../models/excercise";
import { IDispatch } from "../ducks/types";

interface IProps {
  excercise: IExcercise;
  weight: number;
  setup: ISet[];
  progress: (number | undefined)[];
  dispatch: IDispatch;
}

export function ExcerciseView(props: IProps): JSX.Element {
  const { setup, progress } = props;
  let isFinished = setup.length === progress.length;
  for (let i = 0; i < setup.length; i += 1) {
    isFinished = isFinished && progress[i] != null;
  }
  if (isFinished) {
    const isCompleted = setup.every((e, i) => e === progress[i]);
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
  return (
    <Fragment>
      <header className="pb-2">
        {props.excercise.name}, <strong>{props.weight}</strong>
      </header>
      <section className="flex">
        {props.setup.map((reps, i) => {
          const completedReps = props.progress[i] as number | undefined;
          return (
            <ExcerciseSetView
              reps={reps}
              completedReps={completedReps}
              onClick={() => handleClick(props.dispatch, props.excercise, i)}
            />
          );
        })}
      </section>
    </Fragment>
  );
}

function handleClick(dispatch: IDispatch, excercise: IExcercise, setIndex: number): void {
  dispatch({ type: "ChangeRepsAction", excercise, setIndex });
}
