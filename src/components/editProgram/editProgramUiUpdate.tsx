import { JSX, h, Fragment } from "preact";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IEvaluatedProgram, Program } from "../../models/program";

interface IEditProgramUiUpdateProps {
  evaluatedProgram: IEvaluatedProgram;
  exercise: IPlannerProgramExercise;
}

export function EditProgramUiUpdate(props: IEditProgramUiUpdateProps): JSX.Element | null {
  let reusingString: JSX.Element | null = null;
  let reusedByString: JSX.Element | null = null;
  let progressExercise: IPlannerProgramExercise | undefined = undefined;
  const { evaluatedProgram, exercise } = props;
  if (exercise.update?.reuse) {
    progressExercise = exercise.update.reuse.exercise;
    reusingString = (
      <>
        Reusing update of '<strong>{exercise.update.reuse?.fullName}</strong>'
      </>
    );
  } else if (exercise.update) {
    progressExercise = exercise;
    const reusingProgressExercises = Program.getReusingUpdateExercises(evaluatedProgram, exercise);
    if (reusingProgressExercises.length > 0) {
      reusedByString = (
        <>
          This update reused by:{" "}
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
      <div>
        <strong>Custom Update</strong>
      </div>
      <div>{reusedByString}</div>
    </div>
  );
}
