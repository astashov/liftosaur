import { h, JSX } from "preact";
import { IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram } from "../../models/program";
import { EditProgramExerciseDayExercise } from "./editProgramExerciseDayExercise";
import { Button } from "../button";

interface IEditProgramExerciseDayProps {
  weekIndex: number;
  dayInWeekIndex: number;
  exerciseKey: string;
  evaluatedProgram: IEvaluatedProgram;
  ui: IPlannerExerciseUi;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function EditProgramExerciseDay(props: IEditProgramExerciseDayProps): JSX.Element {
  const day = props.evaluatedProgram.weeks[props.weekIndex].days[props.dayInWeekIndex];
  const plannerExercise = day?.exercises.find((exercise) => exercise.key === props.exerciseKey);

  return (
    <div className="py-3 bg-white border rounded-2xl border-grayv3-200">
      <div className="flex gap-4 px-4 pb-2">
        <div className="text-base font-bold">{day?.name}</div>
      </div>
      {plannerExercise ? (
        <EditProgramExerciseDayExercise
          ui={props.ui}
          plannerExercise={plannerExercise}
          evaluatedProgram={props.evaluatedProgram}
          plannerDispatch={props.plannerDispatch}
          settings={props.settings}
        />
      ) : (
        <div className="px-4 text-sm text-grayv3-main">
          <Button kind="lightgrayv3" className="w-full text-sm" name="edit-exercise-add-to-day">
            + Add exercise
          </Button>
        </div>
      )}
    </div>
  );
}
