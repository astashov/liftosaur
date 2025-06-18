import { h, JSX } from "preact";
import { IPlannerProgramExercise, IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ScrollableTabs } from "../scrollableTabs";
import { IEvaluatedProgram } from "../../models/program";
import { EditProgramExerciseSetsByWeekDay } from "./editProgramExerciseSetsByWeekDay";
import { EditProgramExerciseAcrossAllWeeks } from "./editProgramExerciseAcrossAllWeeks";
import { lb } from "lens-shmens";

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
    <div className="pt-2 pb-2 bg-white">
      <div className="flex gap-4 px-4 pb-2">
        <div className="text-base font-bold">Edit Sets</div>
      </div>
      <ScrollableTabs
        topPadding="0rem"
        shouldNotExpand={true}
        nonSticky={true}
        defaultIndex={props.ui.modeTabIndex}
        onChange={(index: number) => {
          props.plannerDispatch(lb<IPlannerExerciseState>().p("ui").p("modeTabIndex").record(index));
        }}
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
                ui={props.ui}
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
