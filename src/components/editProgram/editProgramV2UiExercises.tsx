import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { focusedToStr, IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { IDayData, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { DraggableList } from "../draggableList";
import { LinkButton } from "../linkButton";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";
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
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");

  return (
    <div className="w-full">
      <DraggableList
        hideBorders={true}
        mode="vertical"
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
                key={plannerExercise.fullName}
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
                key={plannerExercise.fullName}
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
        onDragEnd={(startIndex, endIndex) => {
          props.plannerDispatch(
            lbProgram.recordModify((program) => {
              const fullName = evaluatedDay.data[startIndex].fullName;
              return EditProgramUiHelpers.changeCurrentInstancePosition(
                program,
                props.dayData,
                fullName,
                startIndex,
                endIndex,
                props.settings
              );
            })
          );
        }}
      />
      <div>
        <LinkButton
          name="add-exercise"
          data-cy="add-exercise"
          className="text-sm"
          onClick={() => {
            props.plannerDispatch(
              lb<IPlannerState>()
                .p("ui")
                .p("modalExercise")
                .record({
                  focusedExercise: {
                    weekIndex: props.dayData.week - 1,
                    dayIndex: props.dayData.dayInWeek - 1,
                    exerciseLine: evaluatedDay.data.length,
                  },
                  types: [],
                  muscleGroups: [],
                })
            );
          }}
        >
          Add Exercise
        </LinkButton>
      </div>
    </div>
  );
}
