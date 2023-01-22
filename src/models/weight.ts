import { CollectionUtils } from "../utils/collection";

import { equipmentToBarKey } from "./exercise";
import { IWeight, IUnit, ISettings, IEquipment, IBarKey, IPlate } from "../types";

const prebuiltWeights: Partial<Record<string, IWeight>> = {};

export namespace Weight {
  export function display(weight: IWeight | number, withUnit: boolean = true): string {
    if (typeof weight === "number") {
      return `${weight}`;
    } else {
      return weight.value === 0
        ? "BW"
        : `${parseFloat(weight.value.toFixed(2)).toString()}${withUnit ? ` ${weight.unit}` : ""}`;
    }
  }

  export function print(weight: IWeight): string {
    return `${weight.value}${weight.unit}`;
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

  export function round(weight: IWeight, settings: ISettings, equipment?: IEquipment): IWeight {
    return Weight.calculatePlates(weight, settings, equipment).totalWeight;
  }

  export function getOneRepMax(weight: IWeight, reps: number, settings: ISettings, bar?: IBarKey): IWeight {
    if (reps === 0) {
      return Weight.build(0, weight.unit);
    } else if (reps === 1) {
      return weight;
    } else {
      // Epley formula (https://en.wikipedia.org/wiki/One-repetition_maximum)
      return Weight.round(Weight.multiply(weight, 1 + reps / 30), settings, bar);
    }
  }

  export function getTrainingMax(weight: IWeight, reps: number, settings: ISettings, bar: IBarKey): IWeight {
    return Weight.round(Weight.multiply(Weight.getOneRepMax(weight, reps, settings, bar), 0.9), settings, bar);
  }

  export function platesWeight(plates: IPlate[]): IWeight {
    const unit = plates[0]?.weight.unit || "lb";
    return plates.reduce(
      (memo, plate) => Weight.add(memo, Weight.multiply(plate.weight, plate.num)),
      Weight.build(0, unit)
    );
  }

  export function formatOneSide(platesArr: IPlate[], equipment?: IEquipment): string {
    const bar = equipmentToBarKey(equipment);
    const plates: IPlate[] = JSON.parse(JSON.stringify(platesArr));
    plates.sort((a, b) => Weight.compareReverse(a.weight, b.weight));
    const arr: number[] = [];
    const multiplier = bar != null ? 2 : 1;
    while (true) {
      const plate = plates.find((p) => p.num >= multiplier);
      if (plate != null) {
        arr.push(plate.weight.value);
        plate.num -= multiplier;
      } else {
        break;
      }
    }
    return arr.join("/");
  }

  export function calculatePlates(
    allWeight: IWeight,
    settings: ISettings,
    equipment?: IEquipment
  ): { plates: IPlate[]; platesWeight: IWeight; totalWeight: IWeight } {
    const units = settings.units;
    const equipmentType = equipment ? settings.equipment[equipment] : undefined;
    if (!equipmentType) {
      return { plates: [], platesWeight: allWeight, totalWeight: allWeight };
    }
    if (equipmentType.isFixed) {
      const fixed = CollectionUtils.sort(
        equipmentType.fixed.filter((w) => w.unit === units),
        (a, b) => b.value - a.value
      );
      const weight = fixed.find((w) => Weight.lte(w, allWeight)) || fixed[fixed.length - 1] || allWeight;
      return { plates: [], platesWeight: weight, totalWeight: weight };
    }
    const availablePlatesArr = equipmentType.plates.filter((p) => p.weight.unit === units);
    const barWeight = equipmentType.bar[units];
    const multiplier = equipmentType.multiplier || 1;
    const weight = Weight.subtract(allWeight, barWeight);
    const availablePlates: IPlate[] = JSON.parse(JSON.stringify(availablePlatesArr));
    availablePlates.sort((a, b) => Weight.compareReverse(a.weight, b.weight));
    let total = Weight.build(0, allWeight.unit);
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
    return { plates, platesWeight: total, totalWeight: Weight.add(total, barWeight) };
  }

  export function add(weight: IWeight, value: IWeight | number): IWeight {
    return operation(weight, value, (a, b) => a + b);
  }

  export function subtract(weight: IWeight, value: IWeight | number): IWeight {
    return operation(weight, value, (a, b) => a - b);
  }

  export function multiply(weight: IWeight, value: IWeight | number): IWeight {
    return operation(weight, value, (a, b) => a * b);
  }

  export function divide(weight: IWeight, value: IWeight | number): IWeight {
    return operation(weight, value, (a, b) => a / b);
  }

  export function gt(weight: IWeight | number, value: IWeight | number): boolean {
    return comparison(weight, value, (a, b) => a > b);
  }

  export function lt(weight: IWeight | number, value: IWeight | number): boolean {
    return comparison(weight, value, (a, b) => a < b);
  }

  export function gte(weight: IWeight | number, value: IWeight | number): boolean {
    return comparison(weight, value, (a, b) => a >= b);
  }

  export function lte(weight: IWeight | number, value: IWeight | number): boolean {
    return comparison(weight, value, (a, b) => a <= b);
  }

  export function eq(weight: IWeight | number, value: IWeight | number): boolean {
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

  export function convertTo(weight: IWeight, unit: IUnit): IWeight;
  export function convertTo(weight: number, unit: IUnit): number;
  export function convertTo(weight: IWeight | number, unit: IUnit): IWeight | number {
    if (typeof weight === "number") {
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
    weight: IWeight | number,
    value: IWeight | number,
    op: (a: number, b: number) => boolean
  ): boolean {
    if (typeof weight === "number" && typeof value === "number") {
      return op(weight, value);
    } else if (typeof weight === "number" && typeof value !== "number") {
      return op(weight, value.value);
    } else if (typeof weight !== "number" && typeof value === "number") {
      return op(weight.value, value);
    } else if (typeof weight !== "number" && typeof value !== "number") {
      return op(weight.value, convertTo(value, weight.unit).value);
    } else {
      return false;
    }
  }

  export function operation(weight: IWeight, value: IWeight | number, op: (a: number, b: number) => number): IWeight;
  export function operation(weight: IWeight | number, value: IWeight, op: (a: number, b: number) => number): IWeight;
  export function operation(
    weight: IWeight | number,
    value: IWeight | number,
    op: (a: number, b: number) => number
  ): IWeight {
    if (typeof weight === "number" && typeof value !== "number") {
      return Weight.build(op(weight, value.value), value.unit);
    } else if (typeof weight !== "number" && typeof value === "number") {
      return Weight.build(op(weight.value, value), weight.unit);
    } else if (typeof weight !== "number" && typeof value !== "number") {
      return Weight.build(op(weight.value, convertTo(value, weight.unit).value), weight.unit);
    } else {
      throw new Error("Weight.operation should never work with numbers only");
    }
  }
}
