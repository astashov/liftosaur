import { IWeight } from "./weight";
import { CollectionUtils } from "../utils/collection";

export type IProgramReps = number;

export type ISet = {
  completedReps?: number;
  reps: number;
  isAmrap?: boolean;
  weight: IWeight;
  timestamp?: number;
};

export namespace Reps {
  export function display(sets: ISet[], isNext: boolean = false): string {
    if (areSameReps(sets, isNext)) {
      return `${sets.length}x${sets[0].completedReps || sets[0].reps}`;
    } else {
      const arr = sets.map((s) => (isNext ? displayReps(s) : displayCompletedReps(s)));
      const groups = CollectionUtils.inGroupsOf(5, arr);
      return groups.map((group) => group.join("/")).join("/ ");
    }
  }

  export function displayReps(set: ISet): string {
    return set.isAmrap ? `${set.reps}+` : `${set.reps}`;
  }

  export function displayCompletedReps(set: ISet): string {
    return set.completedReps != null ? `${set.completedReps}` : "-";
  }

  export function areSameReps(sets: ISet[], isNext: boolean): boolean {
    const firstRep = sets[0]?.reps;
    if (sets.length > 0) {
      return sets.every(
        (s) => (isNext ? s.reps : s.completedReps) != null && (isNext ? s.reps : s.completedReps) === firstRep
      );
    } else {
      return false;
    }
  }

  export function isEmpty(sets: ISet[]): boolean {
    return sets.every((s) => s.completedReps == null);
  }

  export function isCompleted(sets: ISet[]): boolean {
    return sets.every((set) => Reps.isCompletedSet(set));
  }

  export function isCompletedSet(set: ISet): boolean {
    if (set.completedReps != null) {
      if (set.isAmrap) {
        return set.completedReps > 0;
      } else {
        return set.reps === set.completedReps;
      }
    } else {
      return false;
    }
  }

  export function isFinished(sets: ISet[]): boolean {
    return sets.every((s) => s.completedReps != null);
  }
}
