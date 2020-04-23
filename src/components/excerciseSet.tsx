import { h, JSX } from "preact";
import { IProgramReps, Reps } from "../models/set";
import { IWeight } from "../models/weight";

interface IProps {
  reps: IProgramReps;
  weight: IWeight;
  completedReps?: number;
  onClick: (e: Event) => void;
}

interface IAmrapExcerciseSetProps {
  number?: number;
  weight: IWeight;
  onClick: (e: Event) => void;
}

interface IStartedExcerciseSetProps {
  number: number;
  weight: IWeight;
  onClick: (e: Event) => void;
}

interface INotStartedExcerciseSetProps {
  number: IProgramReps;
  weight: IWeight;
  onClick: (e: Event) => void;
}

export function ExcerciseSetView(props: IProps): JSX.Element {
  if (props.reps === "amrap") {
    return <AmrapExcerciseSet number={props.completedReps} weight={props.weight} onClick={props.onClick} />;
  } else if (props.completedReps == null) {
    return <NotStartedExcerciseSet number={props.reps} weight={props.weight} onClick={props.onClick} />;
  } else {
    if (props.completedReps === props.reps) {
      return <CompleteExcerciseSet number={props.completedReps} weight={props.weight} onClick={props.onClick} />;
    } else {
      return <IncompleteExcerciseSet number={props.completedReps} weight={props.weight} onClick={props.onClick} />;
    }
  }
}

function NotStartedExcerciseSet(props: INotStartedExcerciseSetProps): JSX.Element {
  return (
    <button
      className="w-12 h-12 my-2 mr-3 leading-7 text-center bg-gray-300 border border-gray-400 rounded-lg"
      onClick={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      <div className="leading-none">{Reps.displayReps(props.number)}</div>
      <div style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
        {props.weight}
      </div>
    </button>
  );
}

function CompleteExcerciseSet(props: IStartedExcerciseSetProps): JSX.Element {
  return (
    <button
      className="w-12 h-12 my-2 mr-3 leading-7 text-center bg-green-300 border border-green-400 rounded-lg"
      onClick={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      <div className="leading-none">{Reps.displayReps(props.number)}</div>
      <div style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
        {props.weight}
      </div>
    </button>
  );
}

function IncompleteExcerciseSet(props: IStartedExcerciseSetProps): JSX.Element {
  return (
    <button
      className="w-12 h-12 my-2 mr-3 leading-7 text-center bg-red-300 border border-red-400 rounded-lg"
      onClick={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      <div className="leading-none">{Reps.displayReps(props.number)}</div>
      <div style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
        {props.weight}
      </div>
    </button>
  );
}

function AmrapExcerciseSet(props: IAmrapExcerciseSetProps): JSX.Element {
  let className: string;
  if (props.number == null) {
    className = "relative w-12 h-12 my-2 mr-3 leading-7 text-center bg-gray-300 border border-gray-400 rounded-lg";
  } else if (props.number === 0) {
    className = "relative w-12 h-12 my-2 mr-3 leading-7 text-center bg-red-300 border border-red-400 rounded-lg";
  } else {
    className = "relative w-12 h-12 my-2 mr-3 leading-7 text-center bg-green-300 border border-green-400 rounded-lg";
  }
  return (
    <button className={className} onClick={props.onClick} style={{ userSelect: "none", touchAction: "manipulation" }}>
      {props.number != null && (
        <div
          style={{ top: "-0.5rem", right: "-0.5rem" }}
          className="absolute p-1 text-xs leading-none text-right text-white bg-gray-600 border-gray-800 rounded-full"
        >
          1+
        </div>
      )}
      <div className="leading-none">{props.number == null ? "1+" : props.number}</div>
      <div style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
        {props.weight}
      </div>
    </button>
  );
}
