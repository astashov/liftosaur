import { JSX, h, Fragment } from "preact";
import { Weight } from "../../models/weight";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IEvaluatedProgram, Program } from "../../models/program";

interface IEditProgramUiProgressProps {
  evaluatedProgram: IEvaluatedProgram;
  exercise: IPlannerProgramExercise;
}

export function EditProgramUiProgress(props: IEditProgramUiProgressProps): JSX.Element | null {
  let reusingString: JSX.Element | null = null;
  let progressExercise: IPlannerProgramExercise | undefined = undefined;
  const { evaluatedProgram, exercise } = props;
  if (exercise.progress?.reuse?.fullName && exercise.progress.reuse.exercise?.progress) {
    progressExercise = exercise.progress.reuse.exercise;
    reusingString = (
      <>
        Reusing progress of '<strong>{exercise.progress.reuse?.fullName}</strong>'
      </>
    );
  } else if (exercise.reuse?.exercise?.progress && !exercise.progress) {
    progressExercise = exercise.reuse.exercise;
    reusingString = (
      <>
        Reusing progress of '<strong>{exercise.reuse?.fullName}</strong>'
      </>
    );
  } else if (exercise.progress) {
    progressExercise = exercise;
    const reusingProgressExercises = Program.getReusingProgressExercises(evaluatedProgram, exercise);
    if (reusingProgressExercises.length > 0) {
      reusingString = (
        <>
          This progress reused by:{" "}
          {reusingProgressExercises.map((e, i) => (
            <>
              {i !== 0 ? ", " : ""}
              <strong>{e.fullName}</strong>
            </>
          ))}
          .
        </>
      );
    }
  }

  if (progressExercise == null) {
    return null;
  }
  return (
    <div>
      <div className="text-xs">{reusingString}</div>
      <Progression progressExercise={progressExercise} originalExercise={props.exercise} />
    </div>
  );
}

interface IProgressionProps {
  progressExercise: IPlannerProgramExercise;
  originalExercise: IPlannerProgramExercise;
}

function Progression(props: IProgressionProps): JSX.Element {
  const type = props.progressExercise ? PlannerProgramExercise.progressionType(props.progressExercise) : undefined;
  if (type == null) {
    return <div />;
  }
  switch (type.type) {
    case "linear":
      return (
        <div>
          <strong>Linear Progression:</strong>{" "}
          <span className="font-bold text-greenv2-main">+{Weight.print(type.increase)}</span>
          {(type.successesRequired || 0 > 1) && (
            <span>
              {" "}
              after <span className="font-bold text-greenv2-main">{type.successesRequired}</span> successes
            </span>
          )}
          {type.decrease != null && type.decrease.value > 0 && (
            <span>
              , <span className="font-bold text-redv2-main">{Weight.print(type.decrease)}</span>
            </span>
          )}
          {type.decrease != null && type.decrease.value > 0 && (
            <span>
              {" "}
              after <span className="font-bold text-redv2-main">{type.failuresRequired}</span> failures
            </span>
          )}
          .
        </div>
      );
    case "double":
      return (
        <div>
          <strong>Double Progression</strong>:{" "}
          <span className="font-bold text-greenv2-main">+{Weight.print(type.increase)}</span> within{" "}
          <span className="font-bold">{type.minReps}</span>-<span className="font-bold">{type.maxReps}</span> rep range.
        </div>
      );
    case "sumreps":
      return (
        <div>
          <strong>Sum Reps Progression</strong>:{" "}
          <span className="font-bold text-greenv2-main">+{Weight.print(type.increase)}</span> if sum of all reps is at
          least <span className="font-bold">{type.reps}</span>.
        </div>
      );
    case "custom":
      const state = PlannerProgramExercise.getState(props.originalExercise);
      return (
        <div>
          <strong>Custom Progression</strong>
          {Object.keys(state).length > 0 && (
            <div>
              <div className="text-xs text-grayv3-main">State variables:</div>
              <ul>
                {Object.entries(state).map(([name, value]) => {
                  return (
                    <li key={name} className="ml-4 text-xs list-disc">
                      <span className="text-grayv3-main">{name}</span>: <strong>{Weight.print(value)}</strong>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      );
  }
}
