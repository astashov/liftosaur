import { IWeight } from "./weight";
import { IStats } from "./stats";

export type IProgramReps = number | "amrap";

export type IProgramSet = {
  reps: IProgramReps;
  weight: (stats: IStats, day: number) => number;
};

export type ISet = {
  reps: IProgramReps;
  weight: IWeight;
};

export type IHistorySet = {
  completedReps?: number;
  reps: IProgramReps;
  weight: IWeight;
};

export type IProgressSet = {
  completedReps?: number;
  reps: IProgramReps;
  weight: IWeight;
};

export namespace Reps {
  export function display(sets: (IProgressSet | IHistorySet)[]): string {
    if (areSameReps(sets)) {
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

  export function areSameReps(sets: (IProgressSet | IHistorySet)[]): boolean {
    if (sets.length > 0) {
      const firstSet = sets[0];
      return sets.every(s => s.completedReps != null && s.completedReps === firstSet.completedReps);
    } else {
      return false;
    }
  }

  export function isEmpty(progressSets: IProgressSet[], programSets: IProgramSet[]): boolean {
    let result = true;
    for (let i = 0; i < programSets.length; i += 1) {
      result = result && progressSets[i] != null;
    }
    return result;
  }

  export function isCompleted(progressSets: IProgressSet[], programSets: { reps: IProgramReps }[]): boolean {
    return programSets.every((e, i) => {
      const reps = progressSets[i].completedReps;
      if (reps != null) {
        if (e.reps === "amrap") {
          return reps > 0;
        } else {
          return e.reps === reps;
        }
      } else {
        return false;
      }
    });
  }

  export function isFinished(progressSets: IProgressSet[], sets: unknown[]): boolean {
    let result = sets.length === progressSets.length;
    for (let i = 0; i < sets.length; i += 1) {
      result = result && progressSets[i].completedReps != null;
    }
    return result;
  }

  export function completeSets(progressSets: IProgressSet[]): IHistorySet[] {
    return progressSets;
  }
}
