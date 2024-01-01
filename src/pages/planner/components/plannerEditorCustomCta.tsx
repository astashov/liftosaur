import { lb } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { LinkButton } from "../../../components/linkButton";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IPlannerState } from "../models/types";

interface IPlannerEditorCustomCtaProps {
  err: string;
  dispatch: ILensDispatch<IPlannerState>;
  isInvertedColors?: boolean;
}

export function PlannerEditorCustomCta(props: IPlannerEditorCustomCtaProps): JSX.Element {
  const match = props.err.match(/Unknown exercise ([^\(]+)/);
  if (match) {
    const customExerciseName = match[1].trim();
    return (
      <button
        className={`${
          props.isInvertedColors ? "text-white" : "text-bluev2"
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
              })
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
