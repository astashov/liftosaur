import { h, JSX } from "preact";
import { focusedToStr, IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { IDayData, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { DraggableList } from "../draggableList";
import { EditProgramV2UiEditExercise } from "./editProgramV2UiEditExercise";
import { EditProgramV2UiExercise } from "./editProgramV2UiExercise";

interface IEditProgramV2UiExercisesProps {
  evaluatedWeeks: IPlannerEvalResult[][];
  exerciseFullNames: string[];
  settings: ISettings;
  dayData: Required<IDayData>;
  ui: IPlannerUi;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2UiExercises(props: IEditProgramV2UiExercisesProps): JSX.Element {
  const evaluatedDay = props.evaluatedWeeks?.[props.dayData.week - 1]?.[props.dayData.dayInWeek - 1];
  if (!evaluatedDay?.success) {
    return <div />;
  }
  return (
    <div className="w-full">
      <DraggableList
        hideBorders={true}
        items={evaluatedDay.data}
        element={(plannerExercise, index, handleTouchStart) => {
          const focusedKey = focusedToStr({
            weekIndex: props.dayData.week - 1,
            dayIndex: props.dayData.dayInWeek - 1,
            exerciseLine: index,
          });
          if (props.ui.exerciseUi.edit.has(focusedKey)) {
            return (
              <EditProgramV2UiEditExercise
                ui={props.ui}
                evaluatedWeeks={props.evaluatedWeeks}
                settings={props.settings}
                dayData={props.dayData}
                exerciseLine={index}
                handleTouchStart={handleTouchStart}
                plannerExercise={plannerExercise}
                plannerDispatch={props.plannerDispatch}
              />
            );
          } else {
            return (
              <EditProgramV2UiExercise
                ui={props.ui}
                settings={props.settings}
                dayData={props.dayData}
                exerciseLine={index}
                handleTouchStart={handleTouchStart}
                plannerExercise={plannerExercise}
                plannerDispatch={props.plannerDispatch}
              />
            );
          }
        }}
        onDragEnd={(items) => {
          console.log(items);
        }}
      />
    </div>
  );
}
