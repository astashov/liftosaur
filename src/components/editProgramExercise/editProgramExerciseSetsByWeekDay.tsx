import { h, JSX } from "preact";
import { IPlannerProgramExercise, IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ScrollableTabs } from "../scrollableTabs";
import { lb } from "lens-shmens";
import { IEvaluatedProgram } from "../../models/program";
import { EditProgramExerciseDaysList } from "./editProgramExerciseDaysList";

interface IEditProgramExerciseSetsByWeekDayProps {
  evaluatedProgram: IEvaluatedProgram;
  ui: IPlannerExerciseUi;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function EditProgramExerciseSetsByWeekDay(props: IEditProgramExerciseSetsByWeekDayProps): JSX.Element {
  const { plannerExercise } = props;
  const lbUi = lb<IPlannerExerciseState>().pi("ui");

  return (
    <div>
      <ScrollableTabs
        topPadding="0.5rem"
        className="gap-2 px-4"
        nonSticky={true}
        shouldNotExpand={true}
        type="squares"
        defaultIndex={props.ui.weekIndex}
        onChange={(weekIndex) => props.plannerDispatch(lbUi.p("weekIndex").record(weekIndex))}
        tabs={props.evaluatedProgram.weeks.map((week, weekIndex) => {
          return {
            label: week.name,
            children: () => (
              <EditProgramExerciseDaysList
                ui={props.ui}
                evaluatedProgram={props.evaluatedProgram}
                exerciseKey={plannerExercise.key}
                fullName={plannerExercise.fullName}
                exerciseType={plannerExercise.exerciseType}
                weekIndex={weekIndex}
                plannerDispatch={props.plannerDispatch}
                settings={props.settings}
              />
            ),
          };
        })}
      />
    </div>
  );
}
