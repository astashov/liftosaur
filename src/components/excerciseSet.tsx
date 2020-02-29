import { h, JSX } from "preact";
import { ISet } from "../models/types";

interface Props {
  reps: ISet;
  completedReps?: number;
}

interface IExcerciseSetProps {
  number: number;
}

export function ExcerciseSetView(props: Props): JSX.Element {
  if (props.completedReps == null) {
    return <NotStartedExcerciseSet number={props.reps} />;
  } else {
    if (props.completedReps === props.reps) {
      return <CompleteExcerciseSet number={props.completedReps} />;
    } else {
      return <IncompleteExcerciseSet number={props.completedReps} />;
    }
  }
}

function NotStartedExcerciseSet(props: { number: ISet }): JSX.Element {
  return (
    <div className="rounded-full border border-gray-400 bg-gray-300 text-center w-8 h-8 leading-7 mr-3">
      {props.number}
    </div>
  );
}

function CompleteExcerciseSet(props: IExcerciseSetProps): JSX.Element {
  return (
    <div className="rounded-full border border-green-400 bg-green-300 text-center w-8 h-8 leading-7 mr-3">
      {props.number}
    </div>
  );
}

function IncompleteExcerciseSet(props: IExcerciseSetProps): JSX.Element {
  return (
    <div className="rounded-full border border-red-400 bg-red-300 text-center w-8 h-8 leading-7 mr-3">
      {props.number}
    </div>
  );
}
