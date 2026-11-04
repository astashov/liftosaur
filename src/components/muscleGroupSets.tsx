import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { ISettings } from "../types";
import { IMuscleGroupSetSplit } from "../pages/planner/models/types";
import { IMusclePoints } from "../models/ungroupedMuscles";
import { PlannerWeekMuscles } from "../pages/planner/components/plannerWeekMuscles";
import { PlannerSetSplit } from "../pages/planner/components/plannerStats";
import { IMuscleGroupOrderRow, MuscleGroupOrder_sections } from "../models/muscleGroupOrder";
import { Muscle_getMuscleGroupName } from "../models/muscle";

export function MuscleGroupSetsList(props: { sections: IMuscleGroupOrderRow[][]; settings: ISettings }): JSX.Element {
  return (
    <View>
      {props.sections.map((rows, index) => (
        <View key={rows[0].muscleGroup} className={index > 0 ? "mt-2" : ""}>
          {rows.map(({ muscleGroup, split }) => (
            <Text key={muscleGroup} className="text-sm">
              <Text className="text-sm text-text-secondary">
                {Muscle_getMuscleGroupName(muscleGroup, props.settings)}:
              </Text>{" "}
              <PlannerSetSplit
                split={split}
                settings={props.settings}
                shouldIncludeFrequency={true}
                muscle={muscleGroup}
                textSize="text-sm"
              />
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function MuscleGroupSets(props: {
  muscleGroup: Partial<IMuscleGroupSetSplit>;
  ungroupedMuscleSets: IMusclePoints;
  settings: ISettings;
}): JSX.Element {
  return (
    <View className="flex-row items-center">
      <View className="flex-1">
        <MuscleGroupSetsList
          sections={MuscleGroupOrder_sections(props.muscleGroup, props.settings)}
          settings={props.settings}
        />
      </View>
      <View className="w-scaled-20 mb-2">
        <PlannerWeekMuscles
          settings={props.settings}
          data={props.muscleGroup}
          ungroupedMuscleSets={props.ungroupedMuscleSets}
        />
      </View>
    </View>
  );
}
