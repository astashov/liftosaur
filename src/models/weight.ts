import * as t from "io-ts";
import { CollectionUtils } from "../utils/collection";
import { IArrayElement } from "../utils/types";

export const units = ["kg", "lb"] as const;

export const TUnit = t.keyof(
  units.reduce<Record<IArrayElement<typeof units>, null>>((memo, exerciseType) => {
    memo[exerciseType] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof units>, null>),
  "TUnit"
);

export type IUnit = t.TypeOf<typeof TUnit>;

export const TWeight = t.type(
  {
    value: t.number,
    unit: TUnit,
  },
  "TWeight"
);
export type IWeight = t.TypeOf<typeof TWeight>;

export const TPlate = t.type(
  {
    weight: TWeight,
    num: t.number,
  },
  "TPlate"
);
export type IPlate = t.TypeOf<typeof TPlate>;

const barKeys = ["barbell", "ezbar", "dumbbell"] as const;

export const TBarKey = t.keyof(
  barKeys.reduce<Record<IArrayElement<typeof barKeys>, null>>((memo, barKey) => {
    memo[barKey] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof barKeys>, null>),
  "TBarKey"
);
export type IBarKey = t.TypeOf<typeof TBarKey>;

export const TBars = t.record(TBarKey, TWeight, "TBars");
export type IBars = t.TypeOf<typeof TBars>;

import { ISettings, Settings } from "./settings";

export namespace Weight {
  export function display(weight: IWeight | number): string {
    if (typeof weight === "number") {
      return `${weight}`;
    } else {
      return weight.value === 0 ? "BW" : `${weight.value} ${weight.unit}`;
    }
  }

  export function build(value: number, unit: IUnit): IWeight {
    return { value, unit };
  }

  export function is(object: unknown): object is IWeight {
    return object instanceof Object && "unit" in object && "value" in object;
  }

  export function round(weight: IWeight, settings: ISettings, bar?: IBarKey): IWeight {
    return Weight.calculatePlates(weight, settings, bar).totalWeight;
  }

  export function getOneRepMax(weight: IWeight, reps: number, settings: ISettings, bar?: IBarKey): IWeight {
    if (reps === 1) {
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

  export function formatOneSide(platesArr: IPlate[], bar?: IBarKey): string {
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
    bar?: IBarKey
  ): { plates: IPlate[]; platesWeight: IWeight; totalWeight: IWeight } {
    const availablePlatesArr = Settings.plates(settings);
    let barWeight: IWeight;
    let multiplier: number;
    if (bar != null) {
      barWeight = Settings.bars(settings)[bar];
      multiplier = 2;
    } else {
      barWeight = Weight.build(0, settings.units);
      multiplier = 1;
    }
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

  export function max(weight: IWeight, ...weights: IWeight[]): IWeight {
    return CollectionUtils.sort([weight, ...weights], Weight.compareReverse)[0];
  }

  export function roundConvertTo(weight: IWeight, settings: ISettings, bar?: IBarKey): IWeight {
    return round(convertTo(weight, settings.units), settings, bar);
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
