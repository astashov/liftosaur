import * as t from "io-ts";
import { CollectionUtils } from "../utils/collection";
import { IArrayElement } from "../utils/types";

export const units = ["kg", "lb"] as const;

export const TUnit = t.keyof(
  units.reduce<Record<IArrayElement<typeof units>, null>>((memo, excerciseType) => {
    memo[excerciseType] = null;
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

export const TBars = t.type(
  {
    barbell: TWeight,
    ezbar: TWeight,
    dumbbell: TWeight,
  },
  "TBars"
);

export type IBars = t.TypeOf<typeof TBars>;

import { ISettings, Settings } from "./settings";
import { IExcerciseType, Excercise } from "./excercise";

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

  export function round(excerciseType: IExcerciseType, weight: IWeight, settings: ISettings): IWeight {
    const excercise = Excercise.get(excerciseType);
    const barWeight = excercise.bar != null ? Settings.bars(settings)[excercise.bar] : Weight.build(0, weight.unit);
    return Weight.add(Weight.calculatePlates(Settings.plates(settings), weight, barWeight).weight, barWeight);
  }

  export function getOneRepMax(excercise: IExcerciseType, weight: IWeight, reps: number, settings: ISettings): IWeight {
    if (reps === 1) {
      return weight;
    } else {
      // Epley formula (https://en.wikipedia.org/wiki/One-repetition_maximum)
      return Weight.round(excercise, Weight.multiply(weight, 1 + reps / 30), settings);
    }
  }

  export function getTrainingMax(
    excercise: IExcerciseType,
    weight: IWeight,
    reps: number,
    settings: ISettings
  ): IWeight {
    return Weight.round(
      excercise,
      Weight.multiply(Weight.getOneRepMax(excercise, weight, reps, settings), 0.9),
      settings
    );
  }

  export function platesWeight(plates: IPlate[]): IWeight {
    const unit = plates[0]?.weight.unit || "lb";
    return plates.reduce(
      (memo, plate) => Weight.add(memo, Weight.multiply(plate.weight, plate.num)),
      Weight.build(0, unit)
    );
  }

  export function formatOneSide(platesArr: IPlate[]): string {
    const plates: IPlate[] = JSON.parse(JSON.stringify(platesArr));
    plates.sort((a, b) => Weight.compareReverse(a.weight, b.weight));
    const arr: number[] = [];
    while (true) {
      const plate = plates.find((p) => p.num >= 2);
      if (plate != null) {
        arr.push(plate.weight.value);
        plate.num -= 2;
      } else {
        break;
      }
    }
    return arr.join("/");
  }

  export function calculatePlates(
    availablePlatesArr: IPlate[],
    allWeight: IWeight,
    barWeight: IWeight
  ): { plates: IPlate[]; weight: IWeight } {
    const weight = Weight.subtract(allWeight, barWeight);
    const availablePlates: IPlate[] = JSON.parse(JSON.stringify(availablePlatesArr));
    availablePlates.sort((a, b) => Weight.compareReverse(a.weight, b.weight));
    let total = Weight.build(0, allWeight.unit);
    const plates: IPlate[] = [];
    while (true) {
      const availablePlate = availablePlates.find(
        (potentialPlate) =>
          potentialPlate.num >= 2 && Weight.lte(Weight.add(Weight.multiply(potentialPlate.weight, 2), total), weight)
      );
      if (availablePlate != null) {
        total = Weight.add(total, Weight.multiply(availablePlate.weight, 2));
        availablePlate.num -= 2;
        let plate = plates.find((p) => Weight.eq(p.weight, availablePlate!.weight));
        if (plate == null) {
          plate = { weight: availablePlate.weight, num: 0 };
          plates.push(plate);
        }
        plate.num += 2;
      } else {
        break;
      }
    }
    return { plates, weight: total };
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

  export function roundConvertTo(excercise: IExcerciseType, weight: IWeight, settings: ISettings): IWeight {
    return round(excercise, convertTo(weight, settings.units), settings);
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
