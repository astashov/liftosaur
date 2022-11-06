import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { Reps } from "../models/set";
import { Weight } from "../models/weight";
import { ComparerUtils } from "../utils/comparer";
import { IExerciseType, ISettings, ISet, IWeight } from "../types";

interface IProps {
  exercise: IExerciseType;
  showHelp?: boolean;
  isCurrent: boolean;
  settings: ISettings;
  set: ISet;
  isEditMode: boolean;
  onClick: (e: Event) => void;
}

interface IAmrapExerciseSetProps {
  exercise: IExerciseType;
  showHelp?: boolean;
  isCurrent: boolean;
  settings: ISettings;
  set: ISet;
  isEditMode: boolean;
  onClick: (e: Event) => void;
}

interface IStartedExerciseSetProps {
  exercise: IExerciseType;
  showHelp?: boolean;
  settings: ISettings;
  isCurrent: boolean;
  set: ISet;
  isEditMode: boolean;
  onClick: (e: Event) => void;
}

interface INotStartedExerciseSetProps {
  exercise: IExerciseType;
  showHelp?: boolean;
  isCurrent: boolean;
  settings: ISettings;
  set: ISet;
  isEditMode: boolean;
  onClick: (e: Event) => void;
}

export const ExerciseSetView = memo((props: IProps): JSX.Element => {
  const set = props.set;
  if (set.isAmrap) {
    return (
      <AmrapExerciseSet
        isCurrent={props.isCurrent}
        isEditMode={props.isEditMode}
        showHelp={props.showHelp}
        exercise={props.exercise}
        set={set}
        settings={props.settings}
        onClick={props.onClick}
      />
    );
  } else if (set.completedReps == null) {
    return (
      <NotStartedExerciseSet
        isCurrent={props.isCurrent}
        isEditMode={props.isEditMode}
        showHelp={props.showHelp}
        exercise={props.exercise}
        set={set}
        settings={props.settings}
        onClick={props.onClick}
      />
    );
  } else {
    if (set.completedReps === set.reps) {
      return (
        <CompleteExerciseSet
          isCurrent={props.isCurrent}
          isEditMode={props.isEditMode}
          showHelp={props.showHelp}
          exercise={props.exercise}
          set={set}
          settings={props.settings}
          onClick={props.onClick}
        />
      );
    } else {
      return (
        <IncompleteExerciseSet
          showHelp={props.showHelp}
          isEditMode={props.isEditMode}
          isCurrent={props.isCurrent}
          exercise={props.exercise}
          set={set}
          settings={props.settings}
          onClick={props.onClick}
        />
      );
    }
  }
}, ComparerUtils.noFns);

function convertMaybeRound(weight: IWeight, settings: ISettings, exercise: IExerciseType, isCurrent: boolean): IWeight {
  if (isCurrent) {
    return Weight.roundConvertTo(weight, settings, exercise.equipment);
  } else {
    return Weight.convertTo(weight, settings.units);
  }
}

function NotStartedExerciseSet(props: INotStartedExerciseSetProps): JSX.Element {
  const set = props.set;
  return (
    <button
      data-help-id={props.showHelp ? "progress-set" : undefined}
      data-help={`Press here to record completed ${props.set.reps} reps, press again to lower completed reps.`}
      data-help-width={200}
      data-cy="set-nonstarted"
      className={`ls-progress w-12 h-12 my-2 mr-3 leading-7 text-center bg-grayv2-50 border border-grayv2-200 rounded-lg`}
      onClick={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      <div data-cy="reps-value" className="font-bold leading-none">
        {Reps.displayReps(set)}
      </div>
      <div data-cy="weight-value" style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
        {convertMaybeRound(set.weight, props.settings, props.exercise, props.isCurrent).value}
      </div>
    </button>
  );
}

function CompleteExerciseSet(props: IStartedExerciseSetProps): JSX.Element {
  const set = props.set;
  return (
    <button
      data-cy="set-completed"
      data-help-id={props.showHelp ? "progress-set" : undefined}
      data-help={`Press here to record completed ${props.set.reps} reps, press again to lower completed reps.`}
      data-help-width={200}
      className={`ls-progress w-12 h-12 my-2 mr-3 leading-7 text-center bg-greenv2-300 border border-greenv2-400 rounded-lg`}
      onClick={props.onClick}
      style={{ userSelect: "none" }}
    >
      <div data-cy="reps-value" className="font-bold leading-none">
        {Reps.displayCompletedReps(set)}
      </div>
      <div data-cy="weight-value" style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
        {convertMaybeRound(set.weight, props.settings, props.exercise, props.isCurrent).value}
      </div>
    </button>
  );
}

function IncompleteExerciseSet(props: IStartedExerciseSetProps): JSX.Element {
  const set = props.set;
  return (
    <button
      data-cy="set-incompleted"
      data-help-id={props.showHelp ? "progress-set" : undefined}
      data-help={`Press here to record completed ${props.set.reps} reps, press again to lower completed reps.`}
      data-help-width={200}
      className={`ls-progress w-12 h-12 my-2 mr-3 leading-7 text-center bg-redv2-300 border border-redv2-400 rounded-lg`}
      onClick={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      <div data-cy="reps-value" className="font-bold leading-none">
        {Reps.displayCompletedReps(set)}
      </div>
      <div data-cy="weight-value" style={{ paddingTop: "2px" }} className="text-xs leading-none text-gray-600">
        {convertMaybeRound(set.weight, props.settings, props.exercise, props.isCurrent).value}
      </div>
    </button>
  );
}

function AmrapExerciseSet(props: IAmrapExerciseSetProps): JSX.Element {
  let className: string;
  let cy: string;
  const set = props.set;
  if (set.completedReps == null) {
    className = "relative w-12 h-12 my-2 mr-3 leading-7 text-center border rounded-lg bg-grayv2-50 border-grayv2-200";
    cy = "set-amrap-nonstarted";
  } else if (set.completedReps < set.reps) {
    className = "relative w-12 h-12 my-2 mr-3 leading-7 text-center border rounded-lg bg-redv2-300 border-redv2-400";
    cy = "set-amrap-incompleted";
  } else {
    className =
      "relative w-12 h-12 my-2 mr-3 leading-7 text-center border rounded-lg bg-greenv2-300 border-greenv2-400";
    cy = "set-amrap-completed";
  }
  return (
    <button
      key={cy}
      data-help-id={props.showHelp ? "progress-set" : undefined}
      data-help={`Press here to record completed ${props.set.reps} reps, press again to lower completed reps.`}
      data-help-width={200}
      data-cy={cy}
      className={`ls-progress ${className}`}
      onClick={props.onClick}
      style={{ userSelect: "none" }}
    >
      {set.completedReps != null && (
        <div
          data-cy="reps-completed-amrap"
          style={{ top: "-0.5rem", right: "-0.5rem" }}
          className="absolute p-1 text-xs leading-none text-right text-white rounded-full bg-purplev2-600 border-purplev2-800"
        >
          {set.reps}+
        </div>
      )}
      <div className="font-bold leading-none" data-cy="reps-value">
        {set.completedReps == null ? `${set.reps}+` : set.completedReps}
      </div>
      <div style={{ paddingTop: "2px" }} data-cy="weight-value" className="text-xs leading-none text-grayv2-600">
        {convertMaybeRound(set.weight, props.settings, props.exercise, props.isCurrent).value}
      </div>
    </button>
  );
}
