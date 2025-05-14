import { h, JSX } from "preact";
import { IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram } from "../../models/program";
import { EditProgramExerciseDay } from "./editProgramExerciseDay";

interface IEditProgramExerciseDaysListProps {
  evaluatedProgram: IEvaluatedProgram;
  exerciseKey: string;
  weekIndex: number;
  ui: IPlannerExerciseUi;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function EditProgramExerciseDaysList(props: IEditProgramExerciseDaysListProps): JSX.Element {
  const days = props.evaluatedProgram.weeks[props.weekIndex].days;

  return (
    <div>
      {days.map((day, dayInWeekIndex) => {
        return (
          <div className="mb-4" key={`${props.weekIndex}-${dayInWeekIndex}-${props.exerciseKey}`}>
            <EditProgramExerciseDay
              exerciseKey={props.exerciseKey}
              weekIndex={props.weekIndex}
              dayInWeekIndex={dayInWeekIndex}
              ui={props.ui}
              evaluatedProgram={props.evaluatedProgram}
              settings={props.settings}
              plannerDispatch={props.plannerDispatch}
            />
          </div>
        );
      })}
    </div>
  );
}
