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
      className="rounded-lg border border-gray-400 bg-gray-300 text-center w-12 h-12 leading-7 mr-3 my-2"
      onTouchEnd={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      <div className="leading-none">{Reps.displayReps(props.number)}</div>
      <div style={{ paddingTop: "2px" }} className="leading-none text-xs text-gray-600">
        {props.weight}
      </div>
    </button>
  );
}

function CompleteExcerciseSet(props: IStartedExcerciseSetProps): JSX.Element {
  return (
    <button
      className="rounded-lg border border-green-400 bg-green-300 text-center w-12 h-12 leading-7 mr-3 my-2"
      onTouchEnd={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      <div className="leading-none">{Reps.displayReps(props.number)}</div>
      <div style={{ paddingTop: "2px" }} className="leading-none text-xs text-gray-600">
        {props.weight}
      </div>
    </button>
  );
}

function IncompleteExcerciseSet(props: IStartedExcerciseSetProps): JSX.Element {
  return (
    <button
      className="rounded-lg border border-red-400 bg-red-300 text-center w-12 h-12 leading-7 mr-3 my-2"
      onTouchEnd={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      <div className="leading-none">{Reps.displayReps(props.number)}</div>
      <div style={{ paddingTop: "2px" }} className="leading-none text-xs text-gray-600">
        {props.weight}
      </div>
    </button>
  );
}

function AmrapExcerciseSet(props: IAmrapExcerciseSetProps): JSX.Element {
  let className: string;
  if (props.number == null) {
    className = "relative rounded-lg border border-gray-400 bg-gray-300 text-center w-12 h-12 leading-7 mr-3 my-2";
  } else if (props.number === 0) {
    className = "relative rounded-lg border border-red-400 bg-red-300 text-center w-12 h-12 leading-7 mr-3 my-2";
  } else {
    className = "relative rounded-lg border border-green-400 bg-green-300 text-center w-12 h-12 leading-7 mr-3 my-2";
  }
  return (
    <button
      className={className}
      onTouchEnd={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      {props.number != null && (
        <div
          style={{ top: "-0.5rem", right: "-0.5rem" }}
          className="absolute leading-none text-right text-xs bg-gray-600 border-gray-800 rounded-full p-1 text-white"
        >
          1+
        </div>
      )}
      <div className="leading-none">{props.number == null ? "1+" : props.number}</div>
      <div style={{ paddingTop: "2px" }} className="leading-none text-xs text-gray-600">
        {props.weight}
      </div>
    </button>
  );
}
