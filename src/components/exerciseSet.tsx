import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { Reps } from "../models/set";
import { Weight } from "../models/weight";
import { IExerciseType, ISettings, ISet, IWeight } from "../types";

interface IProps {
  exercise: IExerciseType;
  showHelp?: boolean;
  isCurrent: boolean;
  settings: ISettings;
  set: ISet;
  isEditMode: boolean;
  size?: "small" | "medium";
  onClick: (e: Event) => void;
}

export const ExerciseSetView = memo(
  (props: IProps): JSX.Element => {
    const set = props.set;
    const subtitle = convertMaybeRound(set.weight, props.settings, props.exercise, props.isCurrent).value;

    let cy: string;
    let color: "red" | "green" | "gray";
    let title;
    let superstring;
    let shinyBorder;
    if (set.isAmrap) {
      title = set.completedReps == null ? `${set.reps}+` : set.completedReps;
      superstring = set.completedReps != null ? `${set.reps}+` : undefined;
      if (set.completedReps == null) {
        cy = "set-amrap-nonstarted";
        color = "gray";
      } else if (set.completedReps < set.reps) {
        cy = "set-amrap-incompleted";
        color = "red";
      } else {
        cy = "set-amrap-completed";
        color = "green";
      }
    } else if (set.completedReps == null) {
      title = Reps.displayReps(set);
      cy = "set-nonstarted";
      color = "gray";
      shinyBorder = true;
    } else {
      title = Reps.displayCompletedReps(set);
      if (set.completedReps >= set.reps) {
        cy = "set-completed";
        color = "green";
      } else {
        cy = "set-incompleted";
        color = "red";
      }
    }
    return (
      <ExerciseSetBase
        cy={cy}
        showHelp={props.showHelp}
        onClick={props.onClick}
        title={title}
        subtitle={subtitle}
        superstring={superstring}
        shinyBorder={shinyBorder}
        size={props.size}
        color={color}
      />
    );
  }
);

function convertMaybeRound(weight: IWeight, settings: ISettings, exercise: IExerciseType, isCurrent: boolean): IWeight {
  if (isCurrent) {
    return Weight.roundConvertTo(weight, settings, exercise.equipment);
  } else {
    return Weight.convertTo(weight, settings.units);
  }
}

interface IExerciseSetBaseProps {
  cy: string;
  showHelp?: boolean;
  title: string | number;
  subtitle: string | number;
  superstring?: string;
  color: "gray" | "red" | "green";
  shinyBorder?: boolean;
  size?: "small" | "medium";
  onClick: (e: Event) => void;
}

function ExerciseSetBase(props: IExerciseSetBaseProps): JSX.Element {
  const size = props.size || "medium";
  const sizeClassNames = size === "small" ? "w-10 h-10 text-xs" : "w-12 h-12";
  let className = `ls-progress ${sizeClassNames} relative leading-7 text-center border rounded-lg`;
  if (props.color === "green") {
    className += ` bg-greenv2-300 border-greenv2-400`;
  } else if (props.color === "red") {
    className += ` bg-redv2-300 border-redv2-400`;
  } else {
    className += ` bg-grayv2-50 border-grayv2-200`;
  }

  const button = (
    <button
      key={props.cy}
      data-help-id={props.showHelp ? "progress-set" : undefined}
      data-help={`Press here to record completed ${props.title} reps, press again to lower completed reps.`}
      data-help-width={200}
      data-cy={props.cy}
      className={className}
      onClick={props.onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      {props.superstring != null && (
        <div
          data-cy="reps-completed-amrap"
          style={{ top: "-0.5rem", right: "-0.5rem" }}
          className="absolute p-1 text-xs leading-none text-right text-white rounded-full bg-purplev2-600 border-purplev2-800"
        >
          {props.superstring}
        </div>
      )}
      <div className="font-bold leading-none" data-cy="reps-value">
        {props.title}
      </div>
      <div style={{ paddingTop: "2px" }} data-cy="weight-value" className="text-xs leading-none text-grayv2-600">
        {props.subtitle}
      </div>
    </button>
  );
  return props.shinyBorder && props.showHelp ? <div className="shiny-border">{button}</div> : button;
}
