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

export namespace Weight {
  export function display(weight: IWeight): string {
    return weight.value === 0 ? "BW" : `${weight.value}`;
  }

  export function build(value: number, unit: IUnit): IWeight {
    return { value, unit };
  }

  export function is(object: object): object is IWeight {
    return "unit" in object && "value" in object;
  }

  export function round(weight: IWeight, settings: ISettings): IWeight {
    const roundTo: number = Weight.multiply(
      CollectionUtils.sort(Settings.plates(settings), (a, b) => Weight.compare(a.weight, b.weight))[0].weight,
      2
    ).value;
    return { value: Math.round(weight.value / roundTo) * roundTo, unit: weight.unit };
  }

  export function getOneRepMax(weight: IWeight, reps: number, settings: ISettings): IWeight {
    if (reps === 1) {
      return weight;
    } else {
      // Epley formula (https://en.wikipedia.org/wiki/One-repetition_maximum)
      return Weight.round(Weight.multiply(weight, 1 + reps / 30), settings);
    }
  }

  export function getTrainingMax(weight: IWeight, reps: number, settings: ISettings): IWeight {
    return Weight.round(Weight.multiply(Weight.getOneRepMax(weight, reps, settings), 0.9), settings);
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

  export function calculatePlates(availablePlatesArr: IPlate[], allWeight: IWeight, barWeight: IWeight): IPlate[] {
    const weight = Weight.subtract(allWeight, barWeight);
    const availablePlates: IPlate[] = JSON.parse(JSON.stringify(availablePlatesArr));
    availablePlates.sort((a, b) => Weight.compareReverse(a.weight, b.weight));
    let total = 0;
    const plates: IPlate[] = [];
    while (true) {
      const availablePlate = availablePlates.find(
        (potentialPlate) =>
          potentialPlate.num >= 2 && Weight.lte(Weight.add(Weight.multiply(potentialPlate.weight, 2), total), weight)
      );
      if (availablePlate != null) {
        total += Weight.multiply(availablePlate.weight, 2).value;
        availablePlate.num -= 2;
        let plate = plates.find((p) => p.weight === availablePlate!.weight);
        if (plate == null) {
          plate = { weight: availablePlate.weight, num: 0 };
          plates.push(plate);
        }
        plate.num += 2;
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
    return operation(weight, value, (a, b) => a * b);
  }

  export function divide(weight: IWeight, value: IWeight | number): IWeight {
    return operation(weight, value, (a, b) => a / b);
  }

  export function lte(weight: IWeight, value: IWeight | number): boolean {
    return comparison(weight, value, (a, b) => a <= b);
  }

  export function gte(weight: IWeight, value: IWeight | number): boolean {
    return comparison(weight, value, (a, b) => a >= b);
  }

  export function gt(weight: IWeight, value: IWeight | number): boolean {
    return comparison(weight, value, (a, b) => a > b);
  }

  export function lt(weight: IWeight, value: IWeight | number): boolean {
    return comparison(weight, value, (a, b) => a < b);
  }

  export function eq(weight: IWeight, value: IWeight | number): boolean {
    return comparison(weight, value, (a, b) => a === b);
  }

  export function eqeq(weight: IWeight, value: IWeight): boolean {
    return weight.value === value.value && weight.unit === value.unit;
  }

  export function max(weight: IWeight, ...weights: IWeight[]): IWeight {
    return CollectionUtils.sort([weight, ...weights], Weight.compareReverse)[0];
  }

  export function convertTo(weight: IWeight, unit: IUnit): IWeight {
    if (weight.unit === unit) {
      return weight;
    } else if (weight.unit === "kg" && unit === "lb") {
      return Weight.build(Math.round((weight.value * 2.205) / 0.125) * 0.125, unit);
    } else {
      return Weight.build(Math.round(weight.value / 2.205 / 0.125) * 0.125, unit);
    }
  }

  export function compare(a: IWeight, b: IWeight): number {
    return a.value - convertTo(b, a.unit).value;
  }

  export function compareReverse(a: IWeight, b: IWeight): number {
    return convertTo(b, a.unit).value - a.value;
  }

  function comparison(weight: IWeight, value: IWeight | number, op: (a: number, b: number) => boolean): boolean {
    if (typeof value === "number") {
      return op(weight.value, value);
    } else {
      return op(weight.value, convertTo(value, weight.unit).value);
    }
  }

  function operation(weight: IWeight, value: IWeight | number, op: (a: number, b: number) => number): IWeight {
    if (typeof value === "number") {
      return Weight.build(op(weight.value, value), weight.unit);
    } else {
      return Weight.build(op(weight.value, convertTo(value, weight.unit).value), weight.unit);
    }
  }
}
