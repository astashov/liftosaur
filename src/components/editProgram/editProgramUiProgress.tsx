import { JSX, h, Fragment } from "preact";
import { Weight_print } from "../../models/weight";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IEvaluatedProgram, Program_getReusingProgressExercises } from "../../models/program";

interface IEditProgramUiProgressProps {
  evaluatedProgram: IEvaluatedProgram;
  exercise: IPlannerProgramExercise;
}

export function EditProgramUiProgress(props: IEditProgramUiProgressProps): JSX.Element | null {
  let reusingString: JSX.Element | null = null;
  let reusedByString: JSX.Element | null = null;
  let progressExercise: IPlannerProgramExercise | undefined = undefined;
  const { evaluatedProgram, exercise } = props;
  if (exercise.progress?.reuse) {
    progressExercise = exercise.progress.reuse.exercise ?? exercise.reuse?.exercise;
    reusingString = (
      <>
        Reusing progress of '<strong>{exercise.progress.reuse?.fullName}</strong>'
      </>
    );
  } else if (exercise.progress) {
    progressExercise = exercise;
    const reusingProgressExercises = Program_getReusingProgressExercises(evaluatedProgram, exercise);
    if (reusingProgressExercises.length > 0) {
      reusedByString = (
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
    <div className="text-xs">
      <div>{reusingString}</div>
      <Progression progressExercise={progressExercise} originalExercise={props.exercise} />
      <div>{reusedByString}</div>
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
          <span className="font-bold text-text-success">+{Weight_print(type.increase)}</span>
          {(type.successesRequired || 0 > 1) && (
            <span>
              {" "}
              after <span className="font-bold text-text-success">{type.successesRequired}</span> successes
            </span>
          )}
          {type.decrease != null && type.decrease.value > 0 && (
            <span>
              , <span className="font-bold text-text-error">{Weight_print(type.decrease)}</span>
            </span>
          )}
          {type.decrease != null && type.decrease.value > 0 && (
            <span>
              {" "}
              after <span className="font-bold text-text-error">{type.failuresRequired}</span> failures
            </span>
          )}
          .
        </div>
      );
    case "double":
      return (
        <div>
          <strong>Double Progression</strong>:{" "}
          <span className="font-bold text-text-success">+{Weight_print(type.increase)}</span> within{" "}
          <span className="font-bold">{type.minReps}</span>-<span className="font-bold">{type.maxReps}</span> rep range.
        </div>
      );
    case "sumreps":
      return (
        <div>
          <strong>Sum Reps Progression</strong>:{" "}
          <span className="font-bold text-text-success">+{Weight_print(type.increase)}</span> if sum of all reps is at
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
              <div className="text-xs text-text-secondary">State variables:</div>
              <ul>
                {Object.entries(state).map(([name, value]) => {
                  return (
                    <li key={name} className="ml-4 text-xs list-disc">
                      <span className="text-text-secondary">{name}</span>: <strong>{Weight_print(value)}</strong>
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
