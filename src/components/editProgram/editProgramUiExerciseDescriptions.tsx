import type { JSX } from "react";
import { View } from "react-native";
import { PlannerProgramExercise_currentDescriptionIndex } from "../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { GroupHeader } from "../groupHeader";
import { IconArrowDown3 } from "../icons/iconArrowDown3";
import { ISettings } from "../../types";
import { Markdown } from "../markdown";

interface IEditProgramUiExerciseDescriptionsProps {
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
}

export function EditProgramUiExerciseDescriptions(props: IEditProgramUiExerciseDescriptionsProps): JSX.Element {
  const { plannerExercise } = props;
  const descriptions = plannerExercise.descriptions.values;
  const currentIndex = PlannerProgramExercise_currentDescriptionIndex(plannerExercise);

  if (descriptions.length === 0) {
    return <></>;
  }

  return (
    <>
      {descriptions.map((_, i) => {
        return (
          <View key={i} className={`${i > 0 ? "mt-2 pt-2" : ""}`}>
            <View>
              {descriptions.length > 1 && (
                <GroupHeader
                  highlighted={true}
                  name={`Description ${i + 1}`}
                  nameAddOn={
                    currentIndex === i ? (
                      <View className="ml-2" style={{ transform: [{ rotate: "90deg" }] }}>
                        <IconArrowDown3 size={14} />
                      </View>
                    ) : undefined
                  }
                />
              )}
            </View>
            <View>
              <View className="flex-row">
                <View>
                  <Markdown
                    className="text-xs markdown"
                    truncate={2}
                    value={plannerExercise.descriptions.values[i].value}
                  />
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
}
