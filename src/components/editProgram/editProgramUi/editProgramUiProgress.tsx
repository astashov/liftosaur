import { JSX, h, Fragment } from "preact";
import { IPlannerProgramExercise } from "../../../pages/planner/models/types";
import { ProgramToPlanner } from "../../../models/programToPlanner";
import { ISettings } from "../../../types";

interface IEditProgramUiProgressProps {
  exercise: IPlannerProgramExercise;
  settings: ISettings;
}

export function EditProgramUiProgress(props: IEditProgramUiProgressProps): JSX.Element {
  const progress = props.exercise.progress;
  if (!progress) {
    return <></>;
  }
  return (
    <div className="text-xs text-grayv2-main" data-cy="edit-program-progress">
      <span className="font-bold">Progress: </span>
      {progress.type === "none" ? (
        "none"
      ) : (
        <>{ProgramToPlanner.getProgress(props.exercise, props.settings, true).replace("progress: ", "")}</>
      )}
    </div>
  );
}
