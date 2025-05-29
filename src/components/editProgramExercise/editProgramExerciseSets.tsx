import { h, JSX } from "preact";
import { IPlannerProgramExercise, IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ScrollableTabs } from "../scrollableTabs";
import { IEvaluatedProgram } from "../../models/program";
import { EditProgramExerciseSetsByWeekDay } from "./editProgramExerciseSetsByWeekDay";
import { EditProgramExerciseAcrossAllWeeks } from "./editProgramExerciseAcrossAllWeeks";

interface IEditProgramExerciseSetsProps {
  evaluatedProgram: IEvaluatedProgram;
  plannerExercise: IPlannerProgramExercise;
  ui: IPlannerExerciseUi;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

export function EditProgramExerciseSets(props: IEditProgramExerciseSetsProps): JSX.Element {
  const { plannerExercise } = props;

  return (
    <div className="py-3 bg-white border rounded-2xl border-grayv3-200">
      <div className="flex gap-4 px-4 pb-2">
        <div className="text-base font-bold">Edit Sets</div>
      </div>
      <ScrollableTabs
        topPadding="1rem"
        shouldNotExpand={true}
        nonSticky={true}
        defaultIndex={0}
        color="purple"
        tabs={[
          {
            label: "By week/day",
            children: () => (
              <EditProgramExerciseSetsByWeekDay
                ui={props.ui}
                evaluatedProgram={props.evaluatedProgram}
                plannerExercise={plannerExercise}
                plannerDispatch={props.plannerDispatch}
                settings={props.settings}
              />
            ),
          },
          {
            label: "Across all weeks",
            children: () => (
              <EditProgramExerciseAcrossAllWeeks
                evaluatedProgram={props.evaluatedProgram}
                plannerExercise={plannerExercise}
                plannerDispatch={props.plannerDispatch}
                settings={props.settings}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
