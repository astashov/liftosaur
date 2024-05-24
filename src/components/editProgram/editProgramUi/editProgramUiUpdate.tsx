import { JSX, h, Fragment } from "preact";
import { IPlannerProgramProperty } from "../../../pages/planner/models/types";

interface IEditProgramUiUpdateProps {
  update: IPlannerProgramProperty;
}

export function EditProgramUiUpdate(props: IEditProgramUiUpdateProps): JSX.Element {
  const update = props.update;
  return (
    <div className="text-xs text-grayv2-main" data-cy="edit-program-update">
      <span className="font-bold">Update: </span>
      {update.fnName === "none" ? (
        "none"
      ) : (
        <>
          {update.fnName}({update.fnArgs.join(", ")}){update.body && ` { ...${update.body} }`}
          {update.script && ` { ... }`}
        </>
      )}
    </div>
  );
}
