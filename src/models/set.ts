import { IWeight } from "./weight";
import { IStats } from "./stats";

export type IProgramReps = number | "amrap";

export type IProgramSet = {
  reps: IProgramReps;
  weight: (stats: IStats, day: number) => number;
};

export type ISet = {
  completedReps?: number;
  reps: IProgramReps;
  weight: IWeight;
};

export namespace Reps {
  export function display(sets: ISet[], isNext: boolean = false): string {
    if (isNext || areSameReps(sets)) {
      return `${sets.length}x${sets[0].completedReps || sets[0].reps}`;
    } else {
      return sets.map(s => Reps.displayReps(s.completedReps)).join("/");
    }
  }

  export function displayReps(reps?: IProgramReps): string {
    if (reps != null) {
      return reps === "amrap" ? "1+" : reps.toString();
    } else {
      return "-";
    }
  }

  export function areSameReps(sets: ISet[]): boolean {
    if (sets.length > 0) {
      const firstSet = sets[0];
      return sets.every(s => s.completedReps != null && s.completedReps === firstSet.completedReps);
    } else {
      return false;
    }
  }

  export function isEmpty(sets: ISet[]): boolean {
    return sets.every(s => s.completedReps == null);
  }

  export function isCompleted(sets: ISet[]): boolean {
    return sets.every((set, i) => {
      if (set.completedReps != null) {
        if (set.reps === "amrap") {
          return set.completedReps > 0;
        } else {
          return set.reps === set.completedReps;
        }
      } else {
        return false;
      }
    });
  }

  export function isFinished(sets: ISet[]): boolean {
    return sets.every(s => s.completedReps != null);
  }
}
