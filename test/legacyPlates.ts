import { IExerciseType, IPlate, ISettings, IUnit, IWeight } from "../src/types";
import { Equipment_getEquipmentDataForExerciseType } from "../src/models/equipment";
import { Exercise_defaultRounding } from "../src/models/exercise";
import {
  Weight_abs,
  Weight_add,
  Weight_build,
  Weight_compareReverse,
  Weight_convertTo,
  Weight_gt,
  Weight_invert,
  Weight_lt,
  Weight_lte,
  Weight_multiply,
  Weight_roundTo000005,
  Weight_roundTo005,
  Weight_subtract,
} from "../src/models/weight";
import { CollectionUtils_sort } from "../src/utils/collection";
import { MathUtils_round } from "../src/utils/math";

function legacyRound(weight: IWeight, settings: ISettings, unit: IUnit, exerciseType: IExerciseType): IWeight {
  return LegacyPlates_calculate(weight, settings, unit, exerciseType).totalWeight;
}

function smallestPlate(plates: IPlate[], unit: IUnit): IWeight {
  return (
    CollectionUtils_sort(
      plates.filter((p) => p.weight.unit === unit),
      (a, b) => a.weight.value - b.weight.value
    )[0]?.weight || Weight_build(1, unit)
  );
}

export function LegacyPlates_increment(weight: IWeight, settings: ISettings, exerciseType: IExerciseType): IWeight {
  const equipmentData = Equipment_getEquipmentDataForExerciseType(settings, exerciseType)!;
  const unit = equipmentData.unit ?? weight.unit;
  const roundWeight = legacyRound(weight, settings, unit, exerciseType);
  if (equipmentData.isFixed) {
    const items = CollectionUtils_sort(
      equipmentData.fixed.filter((e) => e.unit === unit),
      (a, b) => a.value - b.value
    );
    return items.find((i) => Weight_gt(i, roundWeight)) ?? items[items.length - 1] ?? roundWeight;
  }
  const step = Weight_multiply(smallestPlate(equipmentData.plates, unit), equipmentData.multiplier);
  let newWeight = roundWeight;
  let attempt = 0;
  do {
    newWeight = Weight_add(newWeight, step);
    attempt += 1;
  } while (attempt < 20 && legacyRound(newWeight, settings, unit, exerciseType).value === roundWeight.value);
  return newWeight;
}

export function LegacyPlates_decrement(weight: IWeight, settings: ISettings, exerciseType: IExerciseType): IWeight {
  const equipmentData = Equipment_getEquipmentDataForExerciseType(settings, exerciseType)!;
  const unit = equipmentData.unit ?? weight.unit;
  const roundWeight = legacyRound(weight, settings, unit, exerciseType);
  if (equipmentData.isFixed) {
    const items = CollectionUtils_sort(
      equipmentData.fixed.filter((e) => e.unit === unit),
      (a, b) => b.value - a.value
    );
    return items.find((i) => Weight_lt(i, roundWeight)) ?? items[items.length - 1] ?? roundWeight;
  }
  const step = Weight_multiply(smallestPlate(equipmentData.plates, unit), equipmentData.multiplier);
  return legacyRound(Weight_subtract(roundWeight, step), settings, unit, exerciseType);
}

export function LegacyPlates_calculate(
  allWeight: IWeight,
  settings: ISettings,
  units: IUnit,
  exerciseType: IExerciseType
): { plates: IPlate[]; platesWeight: IWeight; totalWeight: IWeight } {
  const equipmentData = Equipment_getEquipmentDataForExerciseType(settings, exerciseType);
  if (equipmentData == null) {
    const rounding = Exercise_defaultRounding(exerciseType, settings);
    allWeight = Weight_build(MathUtils_round(allWeight.value, rounding), allWeight.unit);
    return { plates: [], platesWeight: allWeight, totalWeight: allWeight };
  }

  const originalUnit = allWeight.unit;
  const weightInUnits = Weight_convertTo(allWeight, units);
  const absAllWeight = Weight_abs(weightInUnits);
  const inverted = weightInUnits.value < 0;
  if (equipmentData.isFixed) {
    const fixed = CollectionUtils_sort(
      equipmentData.fixed.filter((w) => w.unit === (equipmentData.unit ?? units)),
      (a, b) => b.value - a.value
    );
    const weight = fixed.find((w) => Weight_lte(w, absAllWeight)) || fixed[fixed.length - 1] || absAllWeight;
    let roundedWeight = Weight_roundTo005(Weight_convertTo(weight, originalUnit));
    roundedWeight = inverted ? Weight_invert(roundedWeight) : roundedWeight;
    return { plates: [], platesWeight: roundedWeight, totalWeight: roundedWeight };
  }
  const availablePlatesArr = equipmentData.plates.filter((p) => p.weight.unit === units);
  const barWeight =
    equipmentData.useBodyweightForBar && settings.currentBodyweight
      ? settings.currentBodyweight
      : equipmentData.bar[units];
  const multiplier = equipmentData.multiplier || 1;
  const isAssisting = equipmentData.isAssisting || false;
  const weight = Weight_roundTo000005(Weight_subtract(absAllWeight, barWeight));
  const availablePlates: IPlate[] = JSON.parse(JSON.stringify(availablePlatesArr));
  availablePlates.sort((a, b) => Weight_compareReverse(a.weight, b.weight));
  const plates: IPlate[] = calculatePlatesInternalFast(weight, availablePlates, multiplier, isAssisting);
  const total = plates.reduce(
    (memo, plate) => {
      const weightToAdd = Weight_multiply(plate.weight, plate.num);
      return isAssisting ? Weight_subtract(memo, weightToAdd) : Weight_add(memo, weightToAdd);
    },
    Weight_build(0, units)
  );
  const totalInUnits = Weight_add(total, barWeight);
  const totalWeight = Weight_roundTo000005(
    Weight_convertTo(inverted ? Weight_invert(totalInUnits) : totalInUnits, originalUnit)
  );
  const thePlatesWeight = Weight_convertTo(inverted ? Weight_invert(total) : total, originalUnit);
  return { plates, platesWeight: thePlatesWeight, totalWeight };
}

function calculatePlatesInternalFast(
  weight: IWeight,
  availablePlates: IPlate[],
  multiplier: number,
  isAssisting: boolean
): IPlate[] {
  const targetValue = isAssisting ? -weight.value : weight.value;
  if (targetValue <= 0) {
    return [];
  }

  const plateTypes: { weight: IWeight; unitWeight: number; maxUnits: number }[] = [];
  for (const p of availablePlates) {
    if (p.num >= multiplier) {
      plateTypes.push({
        weight: p.weight,
        unitWeight: p.weight.value * multiplier,
        maxUnits: Math.floor(p.num / multiplier),
      });
    }
  }
  if (plateTypes.length === 0) {
    return [];
  }

  const allValues = [targetValue, ...plateTypes.map((p) => p.unitWeight)];
  let maxDecimals = 0;
  for (const v of allValues) {
    const s = v.toString();
    const dot = s.indexOf(".");
    if (dot >= 0) {
      maxDecimals = Math.max(maxDecimals, s.length - dot - 1);
    }
  }
  const precision = Math.pow(10, Math.min(maxDecimals, 6));
  const intTarget = Math.round(targetValue * precision);
  const intWeights = plateTypes.map((p) => Math.round(p.unitWeight * precision));

  const maxFrom = new Array(plateTypes.length + 1).fill(0);
  for (let i = plateTypes.length - 1; i >= 0; i--) {
    maxFrom[i] = maxFrom[i + 1] + intWeights[i] * plateTypes[i].maxUnits;
  }

  const best = new Array(plateTypes.length).fill(0);
  const current = new Array(plateTypes.length).fill(0);
  let bestRemaining = intTarget + 1;
  let iterations = 0;

  function search(index: number, remaining: number): void {
    if (bestRemaining === 0 || iterations >= 10000) {
      return;
    }
    if (remaining === 0 || index >= plateTypes.length) {
      if (remaining < bestRemaining) {
        bestRemaining = remaining;
        for (let i = 0; i < index; i++) {
          best[i] = current[i];
        }
        for (let i = index; i < plateTypes.length; i++) {
          best[i] = 0;
        }
      }
      return;
    }

    iterations += 1;
    const w = intWeights[index];
    const maxCount = Math.min(plateTypes[index].maxUnits, w > 0 ? Math.floor(remaining / w) : 0);

    for (let count = maxCount; count >= 0; count--) {
      const newRemaining = remaining - count * w;
      if (newRemaining - maxFrom[index + 1] >= bestRemaining) {
        continue;
      }
      current[index] = count;
      search(index + 1, newRemaining);
      if (bestRemaining === 0) {
        return;
      }
    }
  }

  search(0, intTarget);

  const plates: IPlate[] = [];
  for (let i = 0; i < plateTypes.length; i++) {
    if (best[i] > 0) {
      plates.push({ weight: plateTypes[i].weight, num: best[i] * multiplier });
    }
  }
  return plates;
}
