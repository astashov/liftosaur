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

export type IProgressSets = (IHistorySet | undefined)[];

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

  export function isEmpty(progressSets: IProgressSets, programSets: IProgramSet[]): boolean {
    let result = true;
    for (let i = 0; i < programSets.length; i += 1) {
      result = result && progressSets[i] != null;
    }
    return result;
  }

  export function isCompleted(progressSets: IProgressSets, programSets: IProgramSet[]): boolean {
    let result = true;
    for (let i = 0; i < programSets.length; i += 1) {
      result = result && progressSets[i]?.reps === programSets[i]?.reps;
    }
    return result;
  }

  export function completeSets(progressSets: IProgressSets): IHistorySet[] {
    const historySets: IHistorySet[] = [];
    let lastWeight = undefined;
    for (let i = 0; i < progressSets.length; i += 1) {
      lastWeight = progressSets[i]?.weight;
      historySets.push(progressSets[i] ?? { reps: 0, weight: lastWeight ?? 0 });
    }
    return historySets;
  }
}
