import type { JSX } from "react";
import { lb } from "lens-shmens";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IPlannerState } from "../models/types";
import type { IEditorError } from "../../../editorTypes";
import { PlannerCustomExerciseCta_open } from "../models/plannerCustomExerciseCta";

interface IPlannerEditorCustomCtaProps {
  err: IEditorError;
  dispatch: ILensDispatch<IPlannerState>;
  isInvertedColors?: boolean;
}

export function PlannerEditorCustomCta(props: IPlannerEditorCustomCtaProps): JSX.Element {
  const details = props.err.details;
  if (details.type === "unknownExercise") {
    const customExerciseName = details.data.name;
    return (
      <button
        className={`${
          props.isInvertedColors ? "text-text-alwayswhite" : "text-text-link"
        } border-none underline nm-planner-add-custom-exercise`}
        onClick={() => {
          props.dispatch(
            lb<IPlannerState>()
              .p("ui")
              .recordModify((ui) => PlannerCustomExerciseCta_open(ui, customExerciseName)),
            "Open custom exercise picker"
          );
        }}
      >
        Add custom exercise
      </button>
    );
  } else {
    return <></>;
  }
}
