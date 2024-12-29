import React, { JSX } from "react";
import { IPlannerProgramProperty } from "../../../pages/planner/models/types";

interface IEditProgramUiProgressProps {
  progress: IPlannerProgramProperty;
}

export function EditProgramUiProgress(props: IEditProgramUiProgressProps): JSX.Element {
  const progress = props.progress;
  return (
    <div className="text-xs text-grayv2-main" data-cy="edit-program-progress">
      <span className="font-bold">Progress: </span>
      {progress.fnName === "none" ? (
        "none"
      ) : (
        <>
          {progress.fnName}({progress.fnArgs.join(", ")}){progress.body && ` { ...${progress.body} }`}
          {progress.script && ` { ... }`}
        </>
      )}
    </div>
  );
}
