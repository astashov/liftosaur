import { CollectionUtils_sort, CollectionUtils_compressArray } from "../utils/collection";

import { IWeight, IUnit, ISettings, IPlate, IPercentage, IExerciseType } from "../types";
import { n, MathUtils_roundTo005, MathUtils_round, MathUtils_roundFloat, MathUtils_roundTo000005 } from "../utils/math";
import {
  Equipment_getUnitOrDefaultForExerciseType,
  Equipment_getEquipmentDataForExerciseType,
  Equipment_smallestPlate,
} from "./equipment";
import { Exercise_get, Exercise_onerm, Exercise_defaultRounding } from "./exercise";

const prebuiltWeights: Partial<Record<string, IWeight>> = {};

export function Weight_display(weight: IWeight | IPercentage | number, withUnit: boolean = true): string {
  if (typeof weight === "number") {
    return `${weight}`;
  } else if (Weight_isPct(weight)) {
    return `${weight.value}${withUnit ? "%" : ""}`;
  } else {
    return `${parseFloat(weight.value.toFixed(2)).toString()}${withUnit ? ` ${weight.unit}` : ""}`;
  }
}

export function Weight_rpePct(reps: number, rpe: number): IPercentage {
  return Weight_buildPct(MathUtils_roundTo005(Weight_rpeMultiplier(reps, rpe) * 100));
}

export function Weight_evaluateWeight(
  weight: IWeight | IPercentage,
  exerciseType: IExerciseType,
  settings: ISettings
): IWeight {
  if (Weight_is(weight)) {
    return weight;
  } else if (Weight_isPct(weight)) {
    const exercise = Exercise_get(exerciseType, settings.exercises);
    const onerm = Exercise_onerm(exercise, settings);
    return Weight_multiply(onerm, weight.value / 100);
  } else {
    const unit = Equipment_getUnitOrDefaultForExerciseType(settings, exerciseType);
    return Weight_build(0, unit);
  }
}

export function Weight_smartConvert(weight: IWeight, toUnit: IUnit): IWeight {
  if (weight.unit === toUnit) {
    return weight;
  }
  const value = weight.value;
  if (weight.unit === "kg") {
    if (value < 15) {
      return Weight_build(value * 2, toUnit);
    } else {
      return Weight_build(MathUtils_round(value * 2.25, 5), toUnit);
    }
  } else {
    if (value < 15) {
      return Weight_build(MathUtils_round(value / 2, 0.25), toUnit);
    } else {
      return Weight_build(MathUtils_round(value / 2.25, 2.5), toUnit);
    }
  }
}

export function Weight_oppositeUnit(unit: IUnit): IUnit {
  return unit === "kg" ? "lb" : "kg";
}

export function Weight_print(weight: IWeight | IPercentage | number): string {
  if (typeof weight === "number") {
    return `${n(weight)}`;
  } else {
    return `${n(weight.value)}${weight.unit}`;
  }
}

export function Weight_printNull(weight: IWeight | IPercentage | number | undefined): string {
  if (weight == null) {
    return "";
  } else if (typeof weight === "number") {
    return `${n(weight)}`;
  } else {
    return `${n(weight.value)}${weight.unit}`;
  }
}

export function Weight_parsePct(str?: string): IPercentage | IWeight | undefined {
  if (str == null) {
    return undefined;
  }
  const match = str.match(/^([\-+]?[0-9.]+)%$/);
  if (match) {
    return Weight_buildPct(MathUtils_roundFloat(parseFloat(match[1]), 2));
  } else {
    return Weight_parse(str);
  }
}

export function Weight_parse(str: string): IWeight | undefined {
  const match = str.match(/^([\-+]?[0-9.]+)\s*(kg|lb)$/);
  if (match) {
    return Weight_build(MathUtils_roundFloat(parseFloat(match[1]), 2), match[2] as IUnit);
  } else {
    return undefined;
  }
}

export function Weight_printOrNumber(weight: IWeight | IPercentage | number): string {
  return typeof weight === "number" ? `${weight}` : Weight_print(weight);
}

export function Weight_buildPct(value: number): IPercentage {
  return { value, unit: "%" };
}

export function Weight_buildAny(value: number, unit: IUnit | "%"): IWeight | IPercentage {
  if (unit === "%") {
    return Weight_buildPct(value);
  } else {
    return Weight_build(value, unit);
  }
}

export function Weight_build(value: number, unit: IUnit): IWeight {
  const key = `${value}_${unit}`;
  const prebuiltWeight = prebuiltWeights[key];
  if (prebuiltWeight != null) {
    return prebuiltWeight;
  } else {
    const v = { value: typeof value === "string" ? parseFloat(value) : value, unit };
    prebuiltWeights[`${value}_${unit}`] = v;
    return v;
  }
}

export function Weight_clone(value: IWeight): IWeight {
  return Weight_build(value.value, value.unit);
}

export function Weight_isOrPct(object: unknown): object is IWeight | IPercentage {
  const objWeight = object as IWeight | IPercentage;
  return (
    objWeight &&
    typeof objWeight === "object" &&
    "unit" in objWeight &&
    "value" in objWeight &&
    (objWeight.unit === "kg" || objWeight.unit === "lb" || objWeight.unit === "%")
  );
}

export function Weight_is(object: unknown): object is IWeight {
  const objWeight = object as IWeight;
  return (
    objWeight &&
    typeof objWeight === "object" &&
    "unit" in objWeight &&
    "value" in objWeight &&
    (objWeight.unit === "kg" || objWeight.unit === "lb")
  );
}

export function Weight_isPct(object: unknown): object is IPercentage {
  const objWeight = object as IPercentage;
  return (
    objWeight && typeof objWeight === "object" && "unit" in objWeight && "value" in objWeight && objWeight.unit === "%"
  );
}

export function Weight_round(weight: IWeight, settings: ISettings, unit: IUnit, exerciseType?: IExerciseType): IWeight {
  if (exerciseType == null) {
    return Weight_roundTo005(weight);
  }
  return Weight_calculatePlates(weight, settings, unit, exerciseType).totalWeight;
}

export function Weight_increment(weight: IWeight, settings: ISettings, exerciseType?: IExerciseType): IWeight {
  const equipmentData = Equipment_getEquipmentDataForExerciseType(settings, exerciseType);
  if (equipmentData) {
    const unit = equipmentData.unit ?? weight.unit;
    const roundWeight = Weight_round(weight, settings, unit, exerciseType);
    if (equipmentData.isFixed) {
      const items = CollectionUtils_sort(
        equipmentData.fixed.filter((e) => e.unit === unit),
        (a, b) => Weight_compare(a, b)
      );
      const item = items.find((i) => Weight_gt(i, roundWeight));
      return item ?? items[items.length - 1] ?? roundWeight;
    } else {
      const smallestPlate = Weight_multiply(Equipment_smallestPlate(equipmentData, unit), equipmentData.multiplier);
      let newWeight = roundWeight;
      let attempt = 0;
      do {
        newWeight = Weight_add(newWeight, smallestPlate);
        attempt += 1;
      } while (attempt < 20 && Weight_eq(Weight_round(newWeight, settings, unit, exerciseType), roundWeight));
      return newWeight;
    }
  } else {
    const roundWeight = Weight_round(weight, settings, weight.unit, exerciseType);
    const rounding = exerciseType ? Exercise_defaultRounding(exerciseType, settings) : 1;
    return Weight_build(roundWeight.value + rounding, roundWeight.unit);
  }
}

export function Weight_decrement(weight: IWeight, settings: ISettings, exerciseType?: IExerciseType): IWeight {
  const equipmentData = exerciseType ? Equipment_getEquipmentDataForExerciseType(settings, exerciseType) : undefined;
  if (equipmentData) {
    const unit = equipmentData.unit ?? weight.unit;
    const roundWeight = Weight_round(weight, settings, unit, exerciseType);
    if (equipmentData.isFixed) {
      const items = CollectionUtils_sort(
        equipmentData.fixed.filter((e) => e.unit === unit),
        (a, b) => Weight_compareReverse(a, b)
      );
      const item = items.find((i) => Weight_lt(i, roundWeight));
      return item ?? items[items.length - 1] ?? roundWeight;
    } else {
      const smallestPlate = Weight_multiply(Equipment_smallestPlate(equipmentData, unit), equipmentData.multiplier);
      const subtracted = Weight_subtract(roundWeight, smallestPlate);
      const newWeight = Weight_round(subtracted, settings, unit, exerciseType);
      return Weight_build(newWeight.value, newWeight.unit);
    }
  } else {
    const roundWeight = Weight_round(weight, settings, weight.unit, exerciseType);
    const rounding = exerciseType ? Exercise_defaultRounding(exerciseType, settings) : 1;
    return Weight_build(roundWeight.value - rounding, roundWeight.unit);
  }
}

export function Weight_getOneRepMax(weight: IWeight, reps: number, rpe?: number): IWeight {
  if (reps === 0) {
    return Weight_build(0, weight.unit);
  } else if (reps === 1) {
    return weight;
  } else {
    return Weight_roundTo005(Weight_divide(weight, Weight_rpeMultiplier(reps, rpe ?? 10)));
  }
}

export function Weight_getNRepMax(oneRepMax: IWeight, reps: number): IWeight {
  if (reps === 0) {
    return Weight_build(0, oneRepMax.unit);
  } else if (reps === 1) {
    return oneRepMax;
  } else {
    return Weight_roundTo005(Weight_multiply(oneRepMax, Weight_rpeMultiplier(reps, 10)));
  }
}

export function Weight_getTrainingMax(weight: IWeight, reps: number, settings: ISettings): IWeight {
  return Weight_round(Weight_multiply(Weight_getOneRepMax(weight, reps), 0.9), settings, weight.unit);
}

export function Weight_platesWeight(plates: IPlate[]): IWeight {
  const unit = plates[0]?.weight.unit || "lb";
  return plates.reduce(
    (memo, plate) => Weight_add(memo, Weight_multiply(plate.weight, plate.num)),
    Weight_build(0, unit)
  );
}

export function Weight_formatOneSide(settings: ISettings, platesArr: IPlate[], exerciseType: IExerciseType): string {
  const equipmentSettings = Equipment_getEquipmentDataForExerciseType(settings, exerciseType);
  const plates: IPlate[] = JSON.parse(JSON.stringify(platesArr));
  plates.sort((a, b) => Weight_compareReverse(a.weight, b.weight));
  const arr: number[] = [];
  const multiplier = equipmentSettings?.multiplier ?? 1;
  while (true) {
    const plate = plates.find((p) => p.num >= multiplier);
    if (plate != null) {
      arr.push(plate.weight.value);
      plate.num -= multiplier;
    } else {
      break;
    }
  }

  return CollectionUtils_compressArray(arr, 3).join("/");
}

export function Weight_roundTo005(weight: IWeight): IWeight {
  return Weight_build(MathUtils_roundTo005(weight.value), weight.unit);
}

export function Weight_roundTo000005(weight: IWeight): IWeight {
  return Weight_build(MathUtils_roundTo000005(weight.value), weight.unit);
}

export function Weight_calculatePlates(
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

  const absAllWeight = Weight_abs(allWeight);
  const inverted = allWeight.value < 0;
  if (equipmentData.isFixed) {
    const fixed = CollectionUtils_sort(
      equipmentData.fixed.filter((w) => w.unit === (equipmentData.unit ?? units)),
      (a, b) => b.value - a.value
    );
    const weight = fixed.find((w) => Weight_lte(w, absAllWeight)) || fixed[fixed.length - 1] || absAllWeight;
    let roundedWeight = Weight_roundTo005(weight);
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
    Weight_build(0, allWeight.unit)
  );
  const totalWeight = Weight_roundTo000005(
    inverted ? Weight_invert(Weight_add(total, barWeight)) : Weight_add(total, barWeight)
  );
  const thePlatesWeight = inverted ? Weight_invert(total) : total;
  return { plates, platesWeight: thePlatesWeight, totalWeight };
}

export function Weight_abs(weight: IWeight): IWeight {
  return Weight_build(Math.abs(weight.value), weight.unit);
}

export function Weight_invert(weight: IWeight): IWeight {
  return Weight_build(-weight.value, weight.unit);
}

function calculatePlatesInternalFast(
  weight: IWeight,
  availablePlates: IPlate[],
  multiplier: number,
  isAssisting: boolean
): IPlate[] {
  let total = Weight_build(0, weight.unit);
  const plates: IPlate[] = [];
  while (true) {
    const availablePlate = availablePlates.find((potentialPlate) => {
      const multipliedWeight = Weight_multiply(potentialPlate.weight, multiplier);
      const weightToCompare = isAssisting
        ? Weight_subtract(total, multipliedWeight)
        : Weight_add(total, multipliedWeight);
      return (
        potentialPlate.num >= multiplier &&
        (isAssisting ? Weight_gte(weightToCompare, weight) : Weight_lte(weightToCompare, weight))
      );
    });
    if (availablePlate != null) {
      const multipliedWeight = Weight_multiply(availablePlate.weight, multiplier);
      total = isAssisting ? Weight_subtract(total, multipliedWeight) : Weight_add(total, multipliedWeight);
      availablePlate.num -= multiplier;
      let plate = plates.find((p) => Weight_eq(p.weight, availablePlate!.weight));
      if (plate == null) {
        plate = { weight: availablePlate.weight, num: 0 };
        plates.push(plate);
      }
      plate.num += multiplier;
    } else {
      break;
    }
  }
  return plates;
}

export function Weight_add(weight: IWeight, value: IWeight | number): IWeight {
  return Weight_operation(weight, value, (a, b) => a + b);
}

export function Weight_subtract(weight: IWeight, value: IWeight | number): IWeight {
  return Weight_operation(weight, value, (a, b) => a - b);
}

export function Weight_multiply(weight: IWeight, value: IWeight | number): IWeight {
  return Weight_operation(weight, value, (a, b) => a * b);
}

export function Weight_divide(weight: IWeight, value: IWeight | number): IWeight {
  return Weight_operation(weight, value, (a, b) => a / b);
}

export function Weight_gt(weight: IWeight | number | IPercentage, value: IWeight | number | IPercentage): boolean {
  return comparison(weight, value, (a, b) => a > b);
}

export function Weight_lt(weight: IWeight | number | IPercentage, value: IWeight | number | IPercentage): boolean {
  return comparison(weight, value, (a, b) => a < b);
}

export function Weight_gte(weight: IWeight | number | IPercentage, value: IWeight | number | IPercentage): boolean {
  return comparison(weight, value, (a, b) => a >= b);
}

export function Weight_lte(weight: IWeight | number | IPercentage, value: IWeight | number | IPercentage): boolean {
  return comparison(weight, value, (a, b) => a <= b);
}

export function Weight_eqNull(
  weight: IWeight | number | IPercentage | undefined,
  value: IWeight | number | IPercentage | undefined
): boolean {
  if (weight == null && value == null) {
    return true;
  } else if (weight == null && value != null) {
    return false;
  } else if (weight != null && value == null) {
    return false;
  } else {
    return comparison(weight!, value!, (a, b) => a === b);
  }
}

export function Weight_eq(weight: IWeight | number | IPercentage, value: IWeight | number | IPercentage): boolean {
  return comparison(weight, value, (a, b) => a === b);
}

export function Weight_eqeq(weight: IWeight, value: IWeight): boolean {
  return weight.value === value.value && weight.unit === value.unit;
}

export function Weight_max(weights: IWeight[]): IWeight | undefined {
  return CollectionUtils_sort(weights, Weight_compareReverse)[0];
}

export function Weight_roundConvertTo(
  weight: IWeight,
  settings: ISettings,
  unit: IUnit,
  exerciseType?: IExerciseType
): IWeight {
  return Weight_round(Weight_convertTo(weight, unit), settings, unit, exerciseType);
}

export function Weight_type(value: number | IWeight | IPercentage): "weight" | "percentage" | "number" {
  if (typeof value === "number") {
    return "number";
  } else if (Weight_isPct(value)) {
    return "percentage";
  } else {
    return "weight";
  }
}

export function Weight_convertTo(weight: IWeight, unit: IUnit): IWeight;
export function Weight_convertTo(weight: IPercentage, unit: "%" | IUnit): IPercentage;
export function Weight_convertTo(weight: number, unit: IUnit): number;
export function Weight_convertTo(
  weight: IWeight | number | IPercentage,
  unit: IUnit | "%"
): IWeight | number | IPercentage {
  if (typeof weight === "number") {
    return weight;
  } else if (weight.unit === "%" || unit === "%") {
    return weight;
  } else {
    if (weight.unit === unit) {
      return weight;
    } else if (weight.unit === "kg" && unit === "lb") {
      return Weight_build(Math.round((weight.value * 2.205) / 0.5) * 0.5, unit);
    } else {
      return Weight_build(Math.round(weight.value / 2.205 / 0.5) * 0.5, unit);
    }
  }
}

export function Weight_compare(a: IWeight, b: IWeight): number {
  return a.value - Weight_convertTo(b, a.unit).value;
}

export function Weight_compareReverse(a: IWeight, b: IWeight): number {
  return Weight_convertTo(b, a.unit).value - a.value;
}

function comparison(
  weight: IWeight | number | IPercentage,
  value: IWeight | number | IPercentage,
  o: (a: number, b: number) => boolean
): boolean {
  if (typeof weight === "number" && typeof value === "number") {
    return o(weight, value);
  } else if (typeof weight === "number" && typeof value !== "number") {
    return o(weight, value.value);
  } else if (typeof weight !== "number" && typeof value === "number") {
    return o(weight.value, value);
  } else if (typeof weight !== "number" && typeof value !== "number") {
    if (weight.unit === "%" && value.unit === "%") {
      return o(weight.value, value.value);
    } else if (Weight_is(weight) && Weight_is(value)) {
      return o(weight.value, Weight_convertTo(value, weight.unit).value);
    } else {
      return false;
    }
  } else {
    return false;
  }
}

export function Weight_applyOp(
  onerm: IWeight | undefined,
  oldValue: IWeight | number | IPercentage,
  value: IWeight | number | IPercentage,
  opr: "+=" | "-=" | "*=" | "/=" | "="
): IWeight | number | IPercentage {
  if (opr === "=") {
    return value;
  } else if (opr === "+=") {
    return Weight_op(onerm, oldValue, value, (a, b) => a + b);
  } else if (opr === "-=") {
    return Weight_op(onerm, oldValue, value, (a, b) => a - b);
  } else if (opr === "*=") {
    return Weight_op(onerm, oldValue, value, (a, b) => MathUtils_roundTo005(a * b));
  } else {
    return Weight_op(onerm, oldValue, value, (a, b) => MathUtils_roundTo005(a / b));
  }
}

export function Weight_op(
  onerm: IWeight | undefined,
  a: IWeight | number | IPercentage,
  b: IWeight | number | IPercentage,
  o: (x: number, y: number) => number
): IWeight | number | IPercentage {
  if (typeof a === "number" && typeof b === "number") {
    return o(a, b);
  }
  if (typeof a === "number" && Weight_isPct(b)) {
    return Weight_buildPct(o(a, b.value));
  }
  if (typeof a === "number" && Weight_is(b)) {
    return Weight_operation(a, b, o);
  }

  if (Weight_isPct(a) && typeof b === "number") {
    return Weight_buildPct(o(a.value, b));
  }
  if (Weight_isPct(a) && Weight_isPct(b)) {
    return Weight_buildPct(o(a.value, b.value));
  }
  if (Weight_isPct(a) && Weight_is(b)) {
    const aWeight = onerm ? Weight_multiply(onerm, a.value / 100) : MathUtils_roundFloat(a.value / 100, 4);
    return Weight_operation(aWeight, b, o);
  }

  if (Weight_is(a) && typeof b === "number") {
    return Weight_operation(a, b, o);
  }
  if (Weight_is(a) && Weight_isPct(b)) {
    const bWeight = onerm ? Weight_multiply(onerm, b.value / 100) : MathUtils_roundFloat(b.value / 100, 4);
    return Weight_operation(a, bWeight, o);
  }
  if (Weight_is(a) && Weight_is(b)) {
    return Weight_operation(a, b, o);
  }

  throw new Error(`Can't apply operation to ${a} and ${b}`);
}

export function Weight_operation(
  weight: IWeight,
  value: IWeight | number,
  o: (a: number, b: number) => number
): IWeight;
export function Weight_operation(
  weight: IWeight | number,
  value: IWeight,
  o: (a: number, b: number) => number
): IWeight;
export function Weight_operation(
  weight: IWeight | number,
  value: IWeight | number,
  o: (a: number, b: number) => number
): IWeight {
  if (typeof weight === "number" && typeof value !== "number") {
    return Weight_build(o(weight, value.value), value.unit);
  } else if (typeof weight !== "number" && typeof value === "number") {
    return Weight_build(o(weight.value, value), weight.unit);
  } else if (typeof weight !== "number" && typeof value !== "number") {
    return Weight_build(o(weight.value, Weight_convertTo(value, weight.unit).value), weight.unit);
  } else {
    throw new Error("Weight.operation should never work with numbers only");
  }
}

export function Weight_convertToWeight(onerm: IWeight, value: IWeight | number | IPercentage, unit: IUnit): IWeight {
  if (typeof value === "number") {
    return Weight_build(value, unit);
  } else if (Weight_isPct(value)) {
    return Weight_convertTo(Weight_multiply(onerm, MathUtils_roundFloat(value.value / 100, 4)), unit);
  } else {
    return value;
  }
}

export function Weight_calculateRepMax(
  knownReps: number,
  knownRpe: number,
  knownWeight: number,
  targetReps: number,
  targetRpe: number
): number {
  const knownRpeMultiplier = Weight_rpeMultiplier(knownReps, knownRpe);
  const onerm = knownWeight / knownRpeMultiplier;
  const targetRpeMultiplier = Weight_rpeMultiplier(targetReps, targetRpe);
  return Math.round(onerm * targetRpeMultiplier);
}

export function Weight_rpeMultiplier(reps: number, rpe: number): number {
  if (reps === 1 && rpe === 10) {
    return 1;
  }
  reps = Math.max(Math.min(reps, 24), 1);
  rpe = Math.max(Math.min(rpe, 10), 1);

  const x = 10.0 - rpe + (reps - 1);
  if (x >= 16) {
    return 0.5;
  }
  // The formula is taken from
  // https://gitlab.com/openpowerlifting/plsource/-/blob/ba5194be6daa08d082bb1b7959d6f47b82e7802c/static/rpe-calc/index.html#L224
  const intersection = 2.92;
  if (x <= intersection) {
    const a = 0.347619;
    const b = -4.60714;
    const c = 99.9667;
    return (a * x * x + b * x + c) / 100;
  } else {
    const m = -2.64249;
    const b = 97.0955;
    return (m * x + b) / 100;
  }
}

export const Weight_zero: IWeight = { value: 0, unit: "lb" } as const;
