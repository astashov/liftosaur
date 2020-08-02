import * as t from "io-ts";
import { CollectionUtils } from "../utils/collection";

export type IWeight = number;

export const TPlate = t.type(
  {
    weight: t.number,
    num: t.number,
  },
  "TPlate"
);
export type IPlate = t.TypeOf<typeof TPlate>;

export const TBars = t.type(
  {
    barbell: t.number,
    ezbar: t.number,
    dumbbell: t.number,
  },
  "TBars"
);

export type IBars = t.TypeOf<typeof TBars>;

import { ISettings, Settings } from "./settings";

export namespace Weight {
  export function display(weight: IWeight): string {
    return weight === 0 ? "BW" : `${weight}`;
  }

  export function round(weight: IWeight, settings?: ISettings): IWeight {
    const roundTo: number =
      settings != null
        ? CollectionUtils.sort(Settings.plates(settings), (a, b) => a.weight - b.weight)[0].weight * 2
        : 5;
    return Math.round(weight / roundTo) * roundTo;
  }

  export function getOneRepMax(weight: number, reps: number): number {
    if (reps === 1) {
      return weight;
    } else {
      // Epley formula (https://en.wikipedia.org/wiki/One-repetition_maximum)
      return Weight.round(weight * (1 + reps / 30));
    }
  }

  export function getTrainingMax(weight: number, reps: number): number {
    return Weight.round(Weight.getOneRepMax(weight, reps) * 0.9);
  }

  export function platesWeight(plates: IPlate[]): IWeight {
    return plates.reduce((memo, plate) => memo + plate.weight * plate.num, 0);
  }

  export function formatOneSide(platesArr: IPlate[]): string {
    const plates: IPlate[] = JSON.parse(JSON.stringify(platesArr));
    plates.sort((a, b) => b.weight - a.weight);
    const arr: number[] = [];
    while (true) {
      const plate = plates.find((p) => p.num >= 2);
      if (plate != null) {
        arr.push(plate.weight);
        plate.num -= 2;
      } else {
        break;
      }
    }
    return arr.join("/");
  }

  export function calculatePlates(availablePlatesArr: IPlate[], allWeight: IWeight, barWeight: number): IPlate[] {
    const weight = allWeight - barWeight;
    const availablePlates: IPlate[] = JSON.parse(JSON.stringify(availablePlatesArr));
    availablePlates.sort((a, b) => b.weight - a.weight);
    let total = 0;
    const plates: IPlate[] = [];
    while (true) {
      const availablePlate = availablePlates.find(
        (potentialPlate) => potentialPlate.num >= 2 && total + potentialPlate.weight * 2 <= weight
      );
      if (availablePlate != null) {
        total += availablePlate.weight * 2;
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
}
