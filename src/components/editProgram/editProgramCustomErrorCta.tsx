import { lb } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IShortDayData } from "../../types";

interface IPlannerEditorCustomCtaProps {
  err: string;
  dayData: IShortDayData;
  dispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramCustomErrorCta(props: IPlannerEditorCustomCtaProps): JSX.Element {
  const match = props.err.match(/Unknown exercise ([^\(]+)/);
  if (match) {
    const customExerciseName = match[1].trim();
    return (
      <button
        className="text-text-alwayswhite underline border-none nm-planner-add-custom-exercise"
        onClick={() => {
          props.dispatch(
            lb<IPlannerState>()
              .p("ui")
              .p("exercisePicker")
              .record({
                state: {
                  screenStack: ["customExercise"],
                  sort: "name_asc",
                  filters: {},
                  selectedExercises: [],
                  mode: "program",
                  customExerciseName,
                },
                change: "all",
                dayData: props.dayData,
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
