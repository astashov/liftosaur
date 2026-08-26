import type { JSX } from "react";
import { lb } from "lens-shmens";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IPlannerState } from "../models/types";
import type { IEditorError } from "../../../editorTypes";

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
              .p("modalExercise")
              .record({
                focusedExercise: {
                  weekIndex: 0,
                  dayIndex: 0,
                  exerciseLine: 0,
                },
                types: [],
                muscleGroups: [],
                customExerciseName,
              }),
            "Open custom exercise modal"
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
