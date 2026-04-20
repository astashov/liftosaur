import type { JSX } from "react";
import { View } from "react-native";
import {
  PlannerProgramExercise_setVariations,
  PlannerProgramExercise_sets,
  PlannerProgramExercise_setsToDisplaySets,
} from "../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { GroupHeader } from "../groupHeader";
import { HistoryRecordSet } from "../historyRecordSets";
import { IconArrowDown3 } from "../icons/iconArrowDown3";
import { ISettings } from "../../types";

interface IEditProgramUiExerciseSetVariationsProps {
  isCurrentIndicatorNearby?: boolean;
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
}

export function EditProgramUiExerciseSetVariations(props: IEditProgramUiExerciseSetVariationsProps): JSX.Element {
  const { plannerExercise } = props;
  const setVariations = PlannerProgramExercise_setVariations(plannerExercise);
  return (
    <>
      {setVariations.map((_, i) => {
        const sets = PlannerProgramExercise_sets(plannerExercise, i);
        const hasCurrentSets = !!plannerExercise.setVariations[i]?.sets;
        const globals = plannerExercise.globals;
        const displayGroups = PlannerProgramExercise_setsToDisplaySets(sets, hasCurrentSets, globals, props.settings);
        let currentIndex = setVariations.findIndex((v) => v.isCurrent);
        currentIndex = currentIndex === -1 ? 0 : currentIndex;
        return (
          <View key={i} className={`${i > 0 ? "mt-2 pt-2 border-t border-border-neutral" : ""}`}>
            <View>
              {setVariations.length > 1 && (
                <GroupHeader
                  highlighted={true}
                  name={`Set Variation ${i + 1}`}
                  nameAddOn={
                    props.isCurrentIndicatorNearby && currentIndex === i ? (
                      <View className="ml-2" style={{ transform: [{ rotate: "90deg" }] }}>
                        <IconArrowDown3 size={14} />
                      </View>
                    ) : undefined
                  }
                  rightAddOn={
                    !props.isCurrentIndicatorNearby && currentIndex === i ? (
                      <View className="ml-2" style={{ transform: [{ rotate: "90deg" }] }}>
                        <IconArrowDown3 size={14} />
                      </View>
                    ) : undefined
                  }
                />
              )}
            </View>
            <View className="items-end">
              <View className="flex-row">
                <View>
                  {displayGroups.map((g, gi) => (
                    <HistoryRecordSet key={gi} sets={g} isNext={true} settings={props.settings} />
                  ))}
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
}
