import { IUnit } from "../types";
import { StringUtils } from "../utils/string";

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
  export function setSumRepsProgression(reps: number, increment: number, unit: "%" | IUnit): string {
    return StringUtils.unindent(`
      // Sum of reps progression script '${reps},${increment}${unit}'
      if (sum(completedReps) >= ${reps}) {
        ${
          unit === "%"
            ? `state.weight = roundWeight(state.weight * ${1 + increment / 100})`
            : `state.weight += ${increment}${unit}`
        }
      }
    `);
  }

  export function setDoubleProgression(range: number, increment: number, unit: "%" | IUnit): string {
    return StringUtils.unindent(`
      // Double Progression progression script '${range},${increment}${unit}'
      if (completedReps >= reps && completedRPE <= RPE) {
        state.addreps += 1
      }
      if (state.addreps > ${range}) {
        state.addreps = 0
        ${
          unit === "%"
            ? `state.weight = roundWeight(state.weight * ${1 + increment / 100})`
            : `state.weight += ${increment}${unit}`
        }
      }
    `);
  }

  export function setLinearProgression(
    progression?: { increment: number; unit: IUnit | "%"; attempts: number },
    deload?: { decrement: number; unit: IUnit | "%"; attempts: number }
  ): string {
    const finishDayExpr: string[] = [];
    if (progression != null) {
      finishDayExpr.push(
        StringUtils.unindent(`
          // Simple Exercise Progression script '${progression.increment}${progression.unit},${progression.attempts}'
          if (completedReps >= reps && completedRPE <= RPE) {
            state.successes += 1
            if (state.successes >= ${progression.attempts}) {
              ${
                progression.unit === "%"
                  ? `state.weight = roundWeight(state.weight * ${1 + progression.increment / 100})`
                  : `state.weight = state.weight + ${progression.increment}${progression.unit}`
              }
              state.successes = 0
              state.failures = 0
            }
          }
          // End Simple Exercise Progression script
        `)
      );
    }
    if (deload != null) {
      finishDayExpr.push(
        StringUtils.unindent(`
          // Simple Exercise Deload script '${deload.decrement}${deload.unit},${deload.attempts}'
          if (!(completedReps >= reps && completedRPE <= RPE)) {
            state.failures = state.failures + 1
            if (state.failures >= ${deload.attempts}) {
              ${
                deload.unit === "%"
                  ? `state.weight = roundWeight(state.weight * ${1 - deload.decrement / 100})`
                  : `state.weight = state.weight - ${deload.decrement}${deload.unit}`
              }
              state.successes = 0
              state.failures = 0
            }
          }
          // End Simple Exercise Deload script
        `)
      );
    }
    return finishDayExpr.join("\n");
  }

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
