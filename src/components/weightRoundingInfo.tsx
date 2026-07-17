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
  Weight_formatOneSide,
} from "../models/weight";
import { Exercise_onerm, Exercise_defaultRounding } from "../models/exercise";
import {
  Equipment_getEquipmentDataForExerciseType,
  Equipment_getEquipmentNameForExerciseType,
  Equipment_getUnitOrDefaultForExerciseType,
} from "../models/equipment";
import { CollectionUtils_sort } from "../utils/collection";

interface IWeightRoundingInfoContentProps {
  set: ISet;
  exerciseType: IExerciseType;
  settings: ISettings;
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
      {equipmentData?.isAssisting && (
        <View className="p-3 mt-2 border rounded-lg border-border-cardyellow bg-background-cardyellow">
          <Text className="text-sm font-bold">This equipment is marked as "Is Assisting".</Text>
          <Text className="pt-1 text-sm">
            Added weight is <Text className="text-sm font-semibold">subtracted</Text> from the total — like an assisted
            pull-up machine, where more weight makes the exercise easier. That can make the working weight much lower
            than the target, or even <Text className="text-sm font-semibold">0</Text>. If that's not how{" "}
            <Text className="text-sm font-bold">{equipmentName ? `"${equipmentName}"` : "this equipment"}</Text> works,
            turn off "Is Assisting" in the equipment settings.
          </Text>
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

  if (equipmentData.isFixed) {
    const fixed = CollectionUtils_sort(
      equipmentData.fixed.filter((w) => w.unit === (equipmentData.unit ?? unit)),
      (a, b) => a.value - b.value
    );
    return (
      <Text className="text-sm">
        {name} uses fixed weights
        {fixed.length > 0 ? (
          <>
            : <Text className="text-sm font-semibold text-text-purple">{fixed.map((w) => n(w.value)).join(", ")}</Text>{" "}
            <Text className="text-sm font-semibold text-text-purple">{equipmentData.unit ?? unit}</Text>
          </>
        ) : (
          ", but none are set up for your current unit"
        )}
        . The app picks the heaviest one that doesn't exceed the target — or the lightest one, if they're all heavier.
        You can edit the list in the equipment settings.
      </Text>
    );
  }

  const usesBodyweight = equipmentData.useBodyweightForBar && settings.currentBodyweight != null;
  const barWeight = usesBodyweight && settings.currentBodyweight ? settings.currentBodyweight : equipmentData.bar[unit];
  const platesResult = targetWeight ? Weight_calculatePlates(targetWeight, settings, unit, exerciseType) : undefined;
  return (
    <Text className="text-sm">
      {name} uses{" "}
      {usesBodyweight ? (
        <>
          your bodyweight (<Text className="text-sm font-semibold text-syntax-weight">{Weight_display(barWeight)}</Text>
          ) as the base weight
        </>
      ) : (
        <>
          a <Text className="text-sm font-semibold text-syntax-weight">{Weight_display(barWeight)}</Text> bar
        </>
      )}
      {platesResult != null ? (
        <>
          {" "}
          {equipmentData.isAssisting ? "minus" : "plus"} the plates you have available
          {platesResult.plates.length > 0 ? (
            <>
              {" "}
              (
              <Text className="text-sm font-semibold text-text-purple">
                {Weight_formatOneSide(settings, platesResult.plates, exerciseType)}
              </Text>{" "}
              per side)
            </>
          ) : (
            <Text className="text-sm text-text-purple"> (no plates fit here)</Text>
          )}
          , so the closest loadable weight is{" "}
          <Text className="text-sm font-semibold text-syntax-weight">{Weight_display(platesResult.totalWeight)}</Text>
        </>
      ) : (
        <> plus the plates you have available</>
      )}
      . You can edit the bar weight and available plates in the equipment settings.
    </Text>
  );
}
