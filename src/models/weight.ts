export type IWeight = number;
export type IPlate = { weight: IWeight; num: number };

export namespace Weight {
  export function display(weight: IWeight): string {
    return weight === 0 ? "BW" : `${weight}`;
  }

  export function round(weight: IWeight): IWeight {
    return Math.round(weight / 5) * 5;
  }

  export function getTrainingMax(weight: number, reps: number): number {
    if (reps === 1) {
      return Weight.round(weight * 0.9);
    } else {
      // Epley formula (https://en.wikipedia.org/wiki/One-repetition_maximum)
      return Weight.round(weight * (1 + reps / 30) * 0.9);
    }
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

  export function calculatePlates(availablePlatesArr: IPlate[], weight: IWeight): IPlate[] {
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
