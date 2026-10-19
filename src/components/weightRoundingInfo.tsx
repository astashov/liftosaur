import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { ISet, ISettings, IExerciseType, IWeight } from "../types";
import { n } from "../utils/math";
import {
  Weight_isPct,
  Weight_display,
  Weight_evaluateWeight,
  Weight_convertTo,
  Weight_calculatePlates,
} from "../models/weight";
import { Exercise_onerm, Exercise_defaultRounding } from "../models/exercise";
import {
  Equipment_getEquipmentDataForExerciseType,
  Equipment_getEquipmentNameForExerciseType,
  Equipment_setupIn,
  Equipment_getUnitOrDefaultForExerciseType,
} from "../models/equipment";
import { EquipmentSetup_summary } from "../models/equipmentSetup";
import { EquipmentLoadText_picture } from "../models/equipmentLoadText";
import { EquipmentLoadPicture } from "./equipmentLoadPicture";
import { Button } from "./button";

interface IWeightRoundingInfoContentProps {
  set: ISet;
  exerciseType: IExerciseType;
  settings: ISettings;
  onEditEquipment?: () => void;
}

export function WeightRoundingInfoContent(props: IWeightRoundingInfoContentProps): JSX.Element {
  const { set, exerciseType, settings } = props;
  const originalWeight = set.originalWeight;
  const weight = set.weight;
  const unit = Equipment_getUnitOrDefaultForExerciseType(settings, exerciseType);
  const equipmentData = Equipment_getEquipmentDataForExerciseType(settings, exerciseType);
  const equipmentName = Equipment_getEquipmentNameForExerciseType(settings, exerciseType);
  const evaluatedWeight =
    originalWeight != null
      ? Weight_convertTo(Weight_evaluateWeight(originalWeight, exerciseType, settings), unit)
      : undefined;

  return (
    <View testID="weight-rounding-info">
      <Text className="pb-1 text-base font-bold">Why is the weight adjusted?</Text>
      {originalWeight != null && weight != null && (
        <Text className="pb-3 text-lg" testID="weight-rounding-headline">
          <Text className="text-lg line-through text-text-secondary">{Weight_display(originalWeight)}</Text>
          <Text className="text-lg text-text-secondary"> → </Text>
          <Text className="text-lg font-bold text-syntax-weight">{Weight_display(weight)}</Text>
        </Text>
      )}
      {Weight_isPct(originalWeight) && evaluatedWeight != null && (
        <Text className="pb-2 text-sm">
          The program sets the target as a percentage of your 1RM:{" "}
          <Text className="text-sm font-semibold text-syntax-weight">{Weight_display(originalWeight)}</Text> of{" "}
          <Text className="text-sm font-semibold text-syntax-weight">
            {Weight_display(Weight_convertTo(Exercise_onerm(exerciseType, settings), unit))}
          </Text>{" "}
          is <Text className="text-sm font-semibold text-syntax-weight">{Weight_display(evaluatedWeight)}</Text>.
        </Text>
      )}
      {!Weight_isPct(originalWeight) &&
        originalWeight != null &&
        originalWeight.unit !== unit &&
        evaluatedWeight != null && (
          <Text className="pb-2 text-sm">
            The program's weight is in <Text className="text-sm font-semibold">{originalWeight.unit}</Text> — converted
            to <Text className="text-sm font-semibold">{unit}</Text> it's{" "}
            <Text className="text-sm font-semibold text-syntax-weight">{Weight_display(evaluatedWeight)}</Text>.
          </Text>
        )}
      <Text className="pb-2 text-sm">
        The app adjusts the program's exact weight to match what you can actually load with your equipment.
      </Text>
      <WeightRoundingEquipmentExplanation
        settings={settings}
        exerciseType={exerciseType}
        unit={unit}
        targetWeight={evaluatedWeight ?? weight}
        equipmentName={equipmentName}
      />
      {equipmentData != null && props.onEditEquipment != null && (
        <View className="pt-3">
          <Button kind="purple" buttonSize="md" name="rounding-edit-equipment" onClick={props.onEditEquipment}>
            Edit equipment
          </Button>
        </View>
      )}
    </View>
  );
}

interface IWeightRoundingEquipmentExplanationProps {
  settings: ISettings;
  exerciseType: IExerciseType;
  unit: IWeight["unit"];
  targetWeight?: IWeight;
  equipmentName?: string;
}

function WeightRoundingEquipmentExplanation(props: IWeightRoundingEquipmentExplanationProps): JSX.Element {
  const { settings, exerciseType, unit, targetWeight, equipmentName } = props;
  const equipmentData = Equipment_getEquipmentDataForExerciseType(settings, exerciseType);

  if (equipmentData == null) {
    const rounding = Exercise_defaultRounding(exerciseType, settings);
    return (
      <Text className="text-sm">
        This exercise has no equipment set up, so the weight is rounded to the nearest{" "}
        <Text className="text-sm font-semibold text-syntax-weight">
          {n(rounding)}
          {unit}
        </Text>
        . You can change the rounding or assign equipment in the exercise settings.
      </Text>
    );
  }

  const name = <Text className="text-sm font-bold">{equipmentName ? `"${equipmentName}"` : "This equipment"}</Text>;
  const setup = Equipment_setupIn(equipmentData, equipmentData.unit ?? unit);
  const load =
    targetWeight != null ? Weight_calculatePlates(targetWeight, settings, unit, exerciseType).load : undefined;
  const picture = EquipmentLoadText_picture(load, setup);
  return (
    <View>
      <Text className="text-sm">
        {name} is set up as{" "}
        <Text className="text-sm font-semibold text-text-purple">{EquipmentSetup_summary(setup)}</Text>.{" "}
        {(setup.rounding ?? "down") === "down"
          ? "It rounds the number on the machine down."
          : "It rounds to the closest weight it can load."}
        {load != null && picture != null && (
          <>
            {" "}
            The closest weight it can load is{" "}
            <Text className="text-sm font-semibold text-syntax-weight">{Weight_display(load.total)}</Text>:
          </>
        )}
      </Text>
      {picture != null && (
        <View className="pt-2">
          <EquipmentLoadPicture picture={picture} size="md" testID="rounding-info-loading" />
        </View>
      )}
      {setup.direction === "assists" && (
        <Text className="pt-2 text-sm">
          This equipment <Text className="text-sm font-semibold">helps you up</Text>: more weight on the machine makes
          the set easier.
        </Text>
      )}
    </View>
  );
}
