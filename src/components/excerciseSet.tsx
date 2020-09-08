import { h, JSX } from "preact";
import { Reps, ISet } from "../models/set";
import { Weight, IWeight } from "../models/weight";
import { ISettings } from "../models/settings";
import { IExcerciseType } from "../models/excercise";

interface IProps {
  excercise: IExcerciseType;
  isCurrent: boolean;
  settings: ISettings;
  set: ISet;
  onClick: (e: Event) => void;
}

interface IAmrapExcerciseSetProps {
  excercise: IExcerciseType;
  isCurrent: boolean;
  settings: ISettings;
  set: ISet;
  onClick: (e: Event) => void;
}

interface IStartedExcerciseSetProps {
  excercise: IExcerciseType;
  settings: ISettings;
  isCurrent: boolean;
  set: ISet;
  onClick: (e: Event) => void;
}

interface INotStartedExcerciseSetProps {
  excercise: IExcerciseType;
  isCurrent: boolean;
  settings: ISettings;
  set: ISet;
  onClick: (e: Event) => void;
}

export function ExcerciseSetView(props: IProps): JSX.Element {
  const set = props.set;
  if (set.isAmrap) {
    return (
      <AmrapExcerciseSet
        isCurrent={props.isCurrent}
        excercise={props.excercise}
        set={set}
        settings={props.settings}
        onClick={props.onClick}
      />
    );
  } else if (set.completedReps == null) {
    return (
      <NotStartedExcerciseSet
        isCurrent={props.isCurrent}
        excercise={props.excercise}
        set={set}
        settings={props.settings}
        onClick={props.onClick}
      />
    );
  } else {
    if (set.completedReps === set.reps) {
      return (
        <CompleteExcerciseSet
          isCurrent={props.isCurrent}
          excercise={props.excercise}
          set={set}
          settings={props.settings}
          onClick={props.onClick}
        />
      );
    } else {
      return (
        <IncompleteExcerciseSet
          isCurrent={props.isCurrent}
          excercise={props.excercise}
          set={set}
          settings={props.settings}
          onClick={props.onClick}
        />
      );
    }
  }
}

function convertMaybeRound(
  weight: IWeight,
  settings: ISettings,
  excercise: IExcerciseType,
  isCurrent: boolean
): IWeight {
  if (isCurrent) {
    return Weight.roundConvertTo(weight, settings, excercise.bar);
  } else {
    return Weight.convertTo(weight, settings.units);
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
        {convertMaybeRound(set.weight, props.settings, props.excercise, props.isCurrent).value}
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
        {convertMaybeRound(set.weight, props.settings, props.excercise, props.isCurrent).value}
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
        {convertMaybeRound(set.weight, props.settings, props.excercise, props.isCurrent).value}
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
        {convertMaybeRound(set.weight, props.settings, props.excercise, props.isCurrent).value}
      </div>
    </button>
  );
}
