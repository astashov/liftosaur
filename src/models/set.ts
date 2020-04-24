import { IWeight } from "./weight";

export type IProgramReps = number | "amrap";

export type ISet = {
  completedReps?: number;
  reps: IProgramReps;
  weight: IWeight;
  timestamp?: number;
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
    const firstRep = sets[0]?.reps;
    if (sets.length > 0) {
      return sets.every(s => s.completedReps != null && s.completedReps === firstRep);
    } else {
      return false;
    }
  }

  export function isEmpty(sets: ISet[]): boolean {
    return sets.every(s => s.completedReps == null);
  }

  export function isCompleted(sets: ISet[]): boolean {
    return sets.every(set => Reps.isCompletedSet(set));
  }

  export function isCompletedSet(set: ISet): boolean {
    if (set.completedReps != null) {
      if (set.reps === "amrap") {
        return set.completedReps > 0;
      } else {
        return set.reps === set.completedReps;
      }
    } else {
      return false;
    }
  }

  export function isFinished(sets: ISet[]): boolean {
    return sets.every(s => s.completedReps != null);
  }
}
