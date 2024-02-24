import { CollectionUtils } from "../utils/collection";

import { IWeight, IUnit, ISettings, IEquipment, IBarKey, IPlate, IPercentage } from "../types";
import { MathUtils } from "../utils/math";

const prebuiltWeights: Partial<Record<string, IWeight>> = {};

export namespace Weight {
  export function display(weight: IWeight | IPercentage | number, withUnit: boolean = true): string {
    if (typeof weight === "number") {
      return `${weight}`;
    } else if (Weight.isPct(weight)) {
      return `${weight.value}${withUnit ? "%" : ""}`;
    } else {
      return weight.value === 0
        ? "BW"
        : `${parseFloat(weight.value.toFixed(2)).toString()}${withUnit ? ` ${weight.unit}` : ""}`;
    }
  }

  export function print(weight: IWeight | IPercentage): string {
    return `${weight.value}${weight.unit}`;
  }

  export function parse(str: string): IWeight | undefined {
    const match = str.match(/^([0-9.]+)\s*(kg|lb)$/);
    if (match) {
      return build(MathUtils.roundFloat(parseFloat(match[1]), 2), match[2] as IUnit);
    } else {
      return undefined;
    }
  }

  export function printOrNumber(weight: IWeight | IPercentage | number): string {
    return typeof weight === "number" ? `${weight}` : print(weight);
  }

  export function buildPct(value: number): IPercentage {
    return { value, unit: "%" };
  }

  export function build(value: number, unit: IUnit): IWeight {
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

  export function clone(value: IWeight): IWeight {
    return build(value.value, value.unit);
  }

  export function is(object: unknown): object is IWeight {
    const objWeight = object as IWeight;
    return (
      objWeight &&
      typeof objWeight === "object" &&
      "unit" in objWeight &&
      "value" in objWeight &&
      (objWeight.unit === "kg" || objWeight.unit === "lb")
    );
  }

  export function isPct(object: unknown): object is IPercentage {
    const objWeight = object as IPercentage;
    return (
      objWeight &&
      typeof objWeight === "object" &&
      "unit" in objWeight &&
      "value" in objWeight &&
      objWeight.unit === "%"
    );
  }

  export function round(weight: IWeight, settings: ISettings, equipment?: IEquipment): IWeight {
    return Weight.calculatePlates(weight, settings, equipment).totalWeight;
  }

  export function getOneRepMax(weight: IWeight, reps: number): IWeight {
    if (reps === 0) {
      return Weight.build(0, weight.unit);
    } else if (reps === 1) {
      return weight;
    } else {
      // Epley formula (https://en.wikipedia.org/wiki/One-repetition_maximum)
      return Weight.roundTo005(Weight.divide(weight, Weight.rpeMultiplier(reps, 10)));
    }
  }

  export function getNRepMax(oneRepMax: IWeight, reps: number): IWeight {
    if (reps === 0) {
      return Weight.build(0, oneRepMax.unit);
    } else if (reps === 1) {
      return oneRepMax;
    } else {
      // Epley formula (https://en.wikipedia.org/wiki/One-repetition_maximum)
      return Weight.roundTo005(Weight.multiply(oneRepMax, Weight.rpeMultiplier(reps, 10)));
    }
  }

  export function getTrainingMax(weight: IWeight, reps: number, settings: ISettings, bar: IBarKey): IWeight {
    return Weight.round(Weight.multiply(Weight.getOneRepMax(weight, reps), 0.9), settings, bar);
  }

  export function platesWeight(plates: IPlate[]): IWeight {
    const unit = plates[0]?.weight.unit || "lb";
    return plates.reduce(
      (memo, plate) => Weight.add(memo, Weight.multiply(plate.weight, plate.num)),
      Weight.build(0, unit)
    );
  }

  export function formatOneSide(settings: ISettings, platesArr: IPlate[], equipment?: IEquipment): string {
    const equipmentSettings = equipment ? settings.equipment[equipment] : undefined;
    const plates: IPlate[] = JSON.parse(JSON.stringify(platesArr));
    plates.sort((a, b) => Weight.compareReverse(a.weight, b.weight));
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

    return CollectionUtils.compressArray(arr, 3).join("/");
  }

  export function roundTo005(weight: IWeight): IWeight {
    return Weight.build(MathUtils.roundTo005(weight.value), weight.unit);
  }

  export function calculatePlates(
    allWeight: IWeight,
    settings: ISettings,
    equipment?: IEquipment
  ): { plates: IPlate[]; platesWeight: IWeight; totalWeight: IWeight } {
    const units = settings.units;
    const equipmentType = equipment ? settings.equipment[equipment] : undefined;
    if (!equipmentType) {
      allWeight = roundTo005(Weight.build(parseFloat(allWeight.value.toFixed(2)), allWeight.unit));
      return { plates: [], platesWeight: allWeight, totalWeight: allWeight };
    }
    if (equipmentType.isFixed) {
      const fixed = CollectionUtils.sort(
        equipmentType.fixed.filter((w) => w.unit === units),
        (a, b) => b.value - a.value
      );
      const weight = fixed.find((w) => Weight.lte(w, allWeight)) || fixed[fixed.length - 1] || allWeight;
      const roundedWeight = roundTo005(weight);
      return { plates: [], platesWeight: roundedWeight, totalWeight: roundedWeight };
    }
    const availablePlatesArr = equipmentType.plates.filter((p) => p.weight.unit === units);
    const barWeight = equipmentType.bar[units];
    const multiplier = equipmentType.multiplier || 1;
    const weight = Weight.subtract(allWeight, barWeight);
    const availablePlates: IPlate[] = JSON.parse(JSON.stringify(availablePlatesArr));
    availablePlates.sort((a, b) => Weight.compareReverse(a.weight, b.weight));
    const totalNumberOfPlates = availablePlates.reduce((memo, p) => memo + p.num, 0);
    const useFastMethod = (availablePlates.length > 6 && totalNumberOfPlates > 100) || totalNumberOfPlates > 300;
    const plates: IPlate[] = useFastMethod
      ? calculatePlatesInternalFast(weight, availablePlates, multiplier)
      : calculatePlatesInternal(weight, availablePlates, multiplier);
    const total = roundTo005(
      plates.reduce(
        (memo, plate) => Weight.add(memo, Weight.multiply(plate.weight, plate.num)),
        Weight.build(0, allWeight.unit)
      )
    );
    return { plates, platesWeight: total, totalWeight: Weight.add(total, barWeight) };
  }

  function calculatePlatesInternal(targetWeight: IWeight, plates: IPlate[], multiplier: number): IPlate[] {
    let result: IPlate[] = [];
    let closestWeightDifference = Weight.build(Infinity, targetWeight.unit);
    let exactMatchFound = false;

    function backtrack(index: number, remainingWeight: IWeight, currentResult: IPlate[]): void {
      if (Weight.lt(remainingWeight, 0) || exactMatchFound) {
        return;
      }

      if (index !== 0 && remainingWeight.value === 0) {
        exactMatchFound = true;
        result = currentResult.map((plate) => ({ ...plate }));
        return;
      }

      if (Weight.lt(remainingWeight, closestWeightDifference)) {
        closestWeightDifference = remainingWeight;
        result = currentResult.map((plate) => ({ ...plate }));
      }

      const plate = plates[index];
      if (plate == null) {
        return;
      }
      for (let count = plate.num; count >= 0; count -= multiplier) {
        const weight = Weight.multiply(plate.weight, count);
        backtrack(index + 1, Weight.subtract(remainingWeight, weight), [
          ...currentResult,
          { weight: plate.weight, num: count },
        ]);
      }
    }

    backtrack(0, targetWeight, []);
    const resultWithoutZeroes = result.filter((p) => p.num > 0);
    return CollectionUtils.sort(resultWithoutZeroes, (a, b) => b.weight.value - a.weight.value);
  }

  function calculatePlatesInternalFast(weight: IWeight, availablePlates: IPlate[], multiplier: number): IPlate[] {
    let total = Weight.build(0, weight.unit);
    const plates: IPlate[] = [];
    while (true) {
      const availablePlate = availablePlates.find(
        (potentialPlate) =>
          potentialPlate.num >= multiplier &&
          Weight.lte(Weight.add(Weight.multiply(potentialPlate.weight, multiplier), total), weight)
      );
      if (availablePlate != null) {
        total = Weight.add(total, Weight.multiply(availablePlate.weight, multiplier));
        availablePlate.num -= multiplier;
        let plate = plates.find((p) => Weight.eq(p.weight, availablePlate!.weight));
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

  export function add(weight: IWeight, value: IWeight | number): IWeight {
    return operation(weight, value, (a, b) => a + b);
  }

  export function subtract(weight: IWeight, value: IWeight | number): IWeight {
    return operation(weight, value, (a, b) => a - b);
  }

  export function multiply(weight: IWeight, value: IWeight | number): IWeight {
    return operation(weight, value, (a, b) => MathUtils.roundTo005(a * b));
  }

  export function divide(weight: IWeight, value: IWeight | number): IWeight {
    return operation(weight, value, (a, b) => MathUtils.roundTo005(a / b));
  }

  export function gt(weight: IWeight | number | IPercentage, value: IWeight | number | IPercentage): boolean {
    return comparison(weight, value, (a, b) => a > b);
  }

  export function lt(weight: IWeight | number | IPercentage, value: IWeight | number | IPercentage): boolean {
    return comparison(weight, value, (a, b) => a < b);
  }

  export function gte(weight: IWeight | number | IPercentage, value: IWeight | number | IPercentage): boolean {
    return comparison(weight, value, (a, b) => a >= b);
  }

  export function lte(weight: IWeight | number | IPercentage, value: IWeight | number | IPercentage): boolean {
    return comparison(weight, value, (a, b) => a <= b);
  }

  export function eq(weight: IWeight | number | IPercentage, value: IWeight | number | IPercentage): boolean {
    return comparison(weight, value, (a, b) => a === b);
  }

  export function eqeq(weight: IWeight, value: IWeight): boolean {
    return weight.value === value.value && weight.unit === value.unit;
  }

  export function max(weights: IWeight[]): IWeight | undefined {
    return CollectionUtils.sort(weights, Weight.compareReverse)[0];
  }

  export function roundConvertTo(weight: IWeight, settings: ISettings, equipment?: IEquipment): IWeight {
    return round(convertTo(weight, settings.units), settings, equipment);
  }

  export function type(value: number | IWeight | IPercentage): "weight" | "percentage" | "number" {
    if (typeof value === "number") {
      return "number";
    } else if (Weight.isPct(value)) {
      return "percentage";
    } else {
      return "weight";
    }
  }

  export function convertTo(weight: IWeight, unit: IUnit): IWeight;
  export function convertTo(weight: IPercentage, unit: "%" | IUnit): IPercentage;
  export function convertTo(weight: number, unit: IUnit): number;
  export function convertTo(weight: IWeight | number | IPercentage, unit: IUnit | "%"): IWeight | number | IPercentage {
    if (typeof weight === "number") {
      return weight;
    } else if (weight.unit === "%" || unit === "%") {
      return weight;
    } else {
      if (weight.unit === unit) {
        return weight;
      } else if (weight.unit === "kg" && unit === "lb") {
        return Weight.build(Math.round((weight.value * 2.205) / 0.5) * 0.5, unit);
      } else {
        return Weight.build(Math.round(weight.value / 2.205 / 0.5) * 0.5, unit);
      }
    }
  }

  export function compare(a: IWeight, b: IWeight): number {
    return a.value - convertTo(b, a.unit).value;
  }

  export function compareReverse(a: IWeight, b: IWeight): number {
    return convertTo(b, a.unit).value - a.value;
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
      if (weight.unit === "%" || value.unit === "%") {
        return o(weight.value, value.value);
      } else {
        return o(weight.value, convertTo(value, weight.unit).value);
      }
    } else {
      return false;
    }
  }

  export function applyOp(
    onerm: IWeight | undefined,
    oldValue: IWeight | number | IPercentage,
    value: IWeight | number | IPercentage,
    opr: "+=" | "-=" | "*=" | "/=" | "="
  ): IWeight | number | IPercentage {
    if (opr === "=") {
      return value;
    } else if (opr === "+=") {
      return Weight.op(onerm, oldValue, value, (a, b) => a + b);
    } else if (opr === "-=") {
      return Weight.op(onerm, oldValue, value, (a, b) => a - b);
    } else if (opr === "*=") {
      return Weight.op(onerm, oldValue, value, (a, b) => MathUtils.roundTo005(a * b));
    } else {
      return Weight.op(onerm, oldValue, value, (a, b) => MathUtils.roundTo005(a / b));
    }
  }

  export function op(
    onerm: IWeight | undefined,
    a: IWeight | number | IPercentage,
    b: IWeight | number | IPercentage,
    o: (x: number, y: number) => number
  ): IWeight | number | IPercentage {
    if (typeof a === "number" && typeof b === "number") {
      return o(a, b);
    }
    if (typeof a === "number" && Weight.isPct(b)) {
      return Weight.buildPct(o(a, b.value));
    }
    if (typeof a === "number" && Weight.is(b)) {
      return Weight.operation(a, b, o);
    }

    if (Weight.isPct(a) && typeof b === "number") {
      return Weight.buildPct(o(a.value, b));
    }
    if (Weight.isPct(a) && Weight.isPct(b)) {
      return Weight.buildPct(o(a.value, b.value));
    }
    if (Weight.isPct(a) && Weight.is(b)) {
      const aWeight = onerm ? Weight.multiply(onerm, a.value / 100) : MathUtils.roundFloat(a.value / 100, 4);
      return Weight.operation(aWeight, b, o);
    }

    if (Weight.is(a) && typeof b === "number") {
      return Weight.operation(a, b, o);
    }
    if (Weight.is(a) && Weight.isPct(b)) {
      const bWeight = onerm ? Weight.multiply(onerm, b.value / 100) : MathUtils.roundFloat(b.value / 100, 4);
      return Weight.operation(a, bWeight, o);
    }
    if (Weight.is(a) && Weight.is(b)) {
      return Weight.operation(a, b, o);
    }

    throw new Error(`Can't apply operation to ${a} and ${b}`);
  }

  export function operation(weight: IWeight, value: IWeight | number, o: (a: number, b: number) => number): IWeight;
  export function operation(weight: IWeight | number, value: IWeight, o: (a: number, b: number) => number): IWeight;
  export function operation(
    weight: IWeight | number,
    value: IWeight | number,
    o: (a: number, b: number) => number
  ): IWeight {
    if (typeof weight === "number" && typeof value !== "number") {
      return Weight.build(o(weight, value.value), value.unit);
    } else if (typeof weight !== "number" && typeof value === "number") {
      return Weight.build(o(weight.value, value), weight.unit);
    } else if (typeof weight !== "number" && typeof value !== "number") {
      return Weight.build(o(weight.value, convertTo(value, weight.unit).value), weight.unit);
    } else {
      throw new Error("Weight.operation should never work with numbers only");
    }
  }

  export function convertToWeight(onerm: IWeight, value: IWeight | number | IPercentage, unit: IUnit): IWeight {
    if (typeof value === "number") {
      return Weight.build(value, unit);
    } else if (Weight.isPct(value)) {
      return Weight.convertTo(Weight.multiply(onerm, MathUtils.roundFloat(value.value / 100, 4)), unit);
    } else {
      return value;
    }
  }

  export function rpeMultiplier(reps: number, rpe: number): number {
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
}
