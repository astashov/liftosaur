import type { JSX } from "react";
import { View } from "react-native";
import { BodyMapSvg } from "../../../components/muscles/images/bodyMapSvg";
import { IMuscleGroupSetSplit } from "../models/types";
import { ISettings } from "../../../types";
import { MuscleMapRegions_styles } from "../../../models/muscleMapRegions";
import { IMusclePoints } from "../../../models/ungroupedMuscles";
import { MuscleRangeDisplay_weekIntensities } from "../../../models/muscleRangeDisplay";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";

interface IPlannerMusclesProps {
  settings: ISettings;
  data: IMuscleGroupSetSplit;
  ungroupedMuscleSets: IMusclePoints;
}

export function PlannerWeekMuscles(props: IPlannerMusclesProps): JSX.Element {
  const intensities = MuscleRangeDisplay_weekIntensities(props.data, props.ungroupedMuscleSets, props.settings.planner);
  const muscleData = MuscleMapRegions_styles(
    intensities.groups,
    intensities.ungroupedMuscles,
    props.settings,
    Tailwind_semantic().text.link
  );

  return (
    <View className="flex-row">
      <View className="relative flex-1">
        <BodyMapSvg side="back" regions={muscleData.back} baseFill={Tailwind_semantic().text.link} baseOpacity={0.15} />
      </View>
      <View className="relative flex-1">
        <BodyMapSvg
          side="front"
          regions={muscleData.front}
          baseFill={Tailwind_semantic().text.link}
          baseOpacity={0.15}
        />
      </View>
    </View>
  );
}
