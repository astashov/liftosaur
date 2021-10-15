import { IUnit } from "../types";

export interface IProgression {
  increment: number;
  unit: IUnit | "%";
  attempts: number;
}

export interface IDeload {
  decrement: number;
  unit: IUnit | "%";
  attempts: number;
}

export namespace Progression {
  export function getProgression(finishDayExpr: string): IProgression | undefined {
    const match = finishDayExpr.match(/\/\/ Simple Exercise Progression script '([\d\.]+)(kg|lb|%),(\d+)'/im);
    if (match) {
      const increment = parseFloat(match[1]);
      const unit = match[2] as "kg" | "lb" | "%";
      const attempts = parseInt(match[3], 10);
      return { increment: increment, unit, attempts };
    } else {
      return undefined;
    }
  }

  export function getDeload(finishDayExpr: string): IDeload | undefined {
    const match = finishDayExpr.match(/\/\/ Simple Exercise Deload script '([\d\.]+)(kg|lb|%),(\d+)'/im);
    if (match) {
      const decrement = parseFloat(match[1]);
      const unit = match[2] as "kg" | "lb" | "%";
      const attempts = parseInt(match[3], 10);
      return { decrement: decrement, unit, attempts };
    } else {
      return undefined;
    }
  }
}
