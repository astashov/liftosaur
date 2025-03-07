import { JSX, h, Fragment } from "preact";
import { IPlannerProgramExercise } from "../../../pages/planner/models/types";
import { ISettings } from "../../../types";
import { ProgramToPlanner } from "../../../models/programToPlanner";

interface IEditProgramUiUpdateProps {
  exercise: IPlannerProgramExercise;
  settings: ISettings;
}

export function EditProgramUiUpdate(props: IEditProgramUiUpdateProps): JSX.Element {
  const update = props.exercise.update;
  if (!update) {
    return <></>;
  }
  return (
    <div className="text-xs text-grayv2-main" data-cy="edit-program-update">
      <span className="font-bold">Update: </span>
      {ProgramToPlanner.getUpdate(props.exercise, props.settings, true)}
    </div>
  );
}
