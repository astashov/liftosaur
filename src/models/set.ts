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
  reps: number;
  weight: IWeight;
};

export type IProgressSet = {
  reps?: number;
  weight: IWeight;
};

export namespace Reps {
  export function display(sets: (IProgramSet | ISet | IHistorySet)[]): string {
    if (areSameReps(sets)) {
      return `${sets.length}x${sets[0].reps}`;
    } else {
      return sets.map(s => Reps.displayReps(s.reps)).join("/");
    }
  }

  export function displayReps(reps: IProgramReps): string {
    return reps === "amrap" ? "1+" : reps.toString();
  }

  export function areSameReps(sets: (IProgramSet | ISet | IHistorySet)[]): boolean {
    if (sets.length > 0) {
      const firstSet = sets[0];
      return sets.every(s => s.reps === firstSet.reps);
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
      const reps = progressSets[i].reps;
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
      result = result && progressSets[i].reps != null;
    }
    return result;
  }

  export function completeSets(progressSets: IProgressSet[]): IHistorySet[] {
    const historySets: IHistorySet[] = [];
    for (let i = 0; i < progressSets.length; i += 1) {
      const progressSet = progressSets[i];
      historySets.push({ reps: progressSet.reps ?? 0, weight: progressSet.weight });
    }
    return historySets;
  }
}
