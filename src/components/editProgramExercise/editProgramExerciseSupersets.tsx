import { JSX, Fragment } from "react";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IEvaluatedProgram, Program_getSupersetExercises } from "../../models/program";
import { LinkButton } from "../linkButton";
import { navigationRef } from "../../navigation/navigationRef";

interface IEditProgramExerciseSupersetsProps {
  plannerExercise: IPlannerProgramExercise;
  evaluatedProgram: IEvaluatedProgram;
  exerciseStateKey: string;
  programId: string;
}

export function EditProgramExerciseSupersets(props: IEditProgramExerciseSupersetsProps): JSX.Element {
  const superset = props.plannerExercise.superset;
  const supersetExercises = Program_getSupersetExercises(props.evaluatedProgram, props.plannerExercise);
  return (
    <div>
      <div
        className="flex items-center gap-2 mx-4 mb-2 text-sm border-b cursor-pointer border-border-neutral min-h-12"
        data-cy="edit-exercise-select-superset"
        onClick={() => {
          navigationRef.navigate("editProgramExerciseSupersetModal", {
            exerciseStateKey: props.exerciseStateKey,
            programId: props.programId,
            exerciseKey: props.plannerExercise.key,
          });
        }}
      >
        <span>Superset group:</span>
        <LinkButton name="superset-group">{superset == null ? "None" : superset.name}</LinkButton>
        {supersetExercises.length > 0 && (
          <span className="text-xs text-text-secondary" data-cy="edit-exercise-superset-exercises">
            (
            {supersetExercises.map((e, i) => {
              return (
                <Fragment key={e.fullName}>
                  {i !== 0 ? ", " : ""}
                  <strong>{e.fullName}</strong>
                </Fragment>
              );
            })}
            )
          </span>
        )}
      </div>
    </div>
  );
}
