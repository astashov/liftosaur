import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
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
  exerciseStateKey: string;
  programId: string;
}

export function EditProgramExerciseSets(props: IEditProgramExerciseSetsProps): JSX.Element {
  const { plannerExercise } = props;

  return (
    <View className="py-2 bg-background-default">
      <View className="flex-row gap-4 px-4 pb-2">
        <Text className="text-base font-bold">Edit Sets</Text>
      </View>
      <ScrollableTabs
        topPadding="0rem"
        shouldNotExpand={true}
        nonSticky={true}
        defaultIndex={props.ui.modeTabIndex}
        onChange={(index: number) => {
          props.plannerDispatch(lb<IPlannerExerciseState>().p("ui").p("modeTabIndex").record(index), "Change sets tab");
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
                exerciseStateKey={props.exerciseStateKey}
                programId={props.programId}
              />
            ),
          },
          {
            label: "Across all weeks",
            children: () => (
              <EditProgramExerciseAcrossAllWeeks
                weeks={props.evaluatedProgram.weeks}
                plannerExercise={plannerExercise}
                settings={props.settings}
                tabIndex={props.ui.acrossWeeksTabIndex ?? 0}
                onChangeTabIndex={(index) =>
                  props.plannerDispatch(
                    lb<IPlannerExerciseState>().p("ui").p("acrossWeeksTabIndex").record(index),
                    "Change across weeks tab"
                  )
                }
                onChange={(apply) =>
                  props.plannerDispatch(
                    lb<IPlannerExerciseState>().p("current").p("program").pi("planner").recordModify(apply),
                    "Update sets"
                  )
                }
              />
            ),
          },
        ]}
      />
    </View>
  );
}
