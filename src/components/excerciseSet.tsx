import { h, JSX } from "preact";
import { Reps, ISet } from "../models/set";

interface IProps {
  set: ISet;
  onClick: (e: Event) => void;
}

interface IAmrapExcerciseSetProps {
  set: ISet;
  onClick: (e: Event) => void;
}

interface IStartedExcerciseSetProps {
  set: ISet;
  onClick: (e: Event) => void;
}

interface INotStartedExcerciseSetProps {
  set: ISet;
  onClick: (e: Event) => void;
}

export function ExcerciseSetView(props: IProps): JSX.Element {
  const set = props.set;
  if (set.isAmrap) {
    return <AmrapExcerciseSet set={set} onClick={props.onClick} />;
  } else if (set.completedReps == null) {
    return <NotStartedExcerciseSet set={set} onClick={props.onClick} />;
  } else {
    if (set.completedReps === set.reps) {
      return <CompleteExcerciseSet set={set} onClick={props.onClick} />;
    } else {
      return <IncompleteExcerciseSet set={set} onClick={props.onClick} />;
    }
  }
}

function NotStartedExcerciseSet(props: INotStartedExcerciseSetProps): JSX.Element {
  const set = props.set;
  return (
    <button
      className="w-12 h-12 my-2 mr-3 leading-7 text-center bg-gray-300 border border-gray-400 rounded-lg"
      onClick={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      <div className="leading-none">{Reps.displayReps(set)}</div>
      <div style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
        {set.weight}
      </div>
    </button>
  );
}

function CompleteExcerciseSet(props: IStartedExcerciseSetProps): JSX.Element {
  const set = props.set;
  return (
    <button
      className="w-12 h-12 my-2 mr-3 leading-7 text-center bg-green-300 border border-green-400 rounded-lg"
      onClick={props.onClick}
      style={{ userSelect: "none" }}
    >
      <div className="leading-none">{Reps.displayCompletedReps(set)}</div>
      <div style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
        {set.weight}
      </div>
    </button>
  );
}

function IncompleteExcerciseSet(props: IStartedExcerciseSetProps): JSX.Element {
  const set = props.set;
  return (
    <button
      className="w-12 h-12 my-2 mr-3 leading-7 text-center bg-red-300 border border-red-400 rounded-lg"
      onClick={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      <div className="leading-none">{Reps.displayCompletedReps(set)}</div>
      <div style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
        {set.weight}
      </div>
    </button>
  );
}

function AmrapExcerciseSet(props: IAmrapExcerciseSetProps): JSX.Element {
  let className: string;
  const set = props.set;
  if (set.completedReps == null) {
    className = "relative w-12 h-12 my-2 mr-3 leading-7 text-center bg-gray-300 border border-gray-400 rounded-lg";
  } else if (set.completedReps < set.reps) {
    className = "relative w-12 h-12 my-2 mr-3 leading-7 text-center bg-red-300 border border-red-400 rounded-lg";
  } else {
    className = "relative w-12 h-12 my-2 mr-3 leading-7 text-center bg-green-300 border border-green-400 rounded-lg";
  }
  return (
    <button className={className} onClick={props.onClick} style={{ userSelect: "none" }}>
      {set.completedReps != null && (
        <div
          style={{ top: "-0.5rem", right: "-0.5rem" }}
          className="absolute p-1 text-xs leading-none text-right text-white bg-gray-600 border-gray-800 rounded-full"
        >
          {set.reps}+
        </div>
      )}
      <div className="leading-none">{set.completedReps == null ? `${set.reps}+` : set.completedReps}</div>
      <div style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
        {set.weight}
      </div>
    </button>
  );
}
