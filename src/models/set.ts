import { CollectionUtils } from "../utils/collection";
import * as t from "io-ts";
import { TWeight, Weight } from "./weight";

export type IProgramReps = number;

export const TSet = t.intersection(
  [
    t.interface({
      reps: t.number,
      weight: TWeight,
    }),
    t.partial({
      completedReps: t.number,
      timestamp: t.number,
      isAmrap: t.boolean,
    }),
  ],
  "TSet"
);
export type ISet = t.TypeOf<typeof TSet>;

export const TProgramSet = t.intersection(
  [
    t.interface({
      repsExpr: t.string,
      weightExpr: t.string,
    }),
    t.partial({
      isAmrap: t.boolean,
    }),
  ],
  "TProgramSet"
);
export type IProgramSet = t.TypeOf<typeof TProgramSet>;

export namespace Reps {
  export function display(sets: ISet[], isNext: boolean = false): string {
    if (areSameReps(sets, isNext)) {
      return `${sets.length}x${sets[0].completedReps || sets[0].reps}`;
    } else {
      const arr = sets.map((s) => (isNext ? displayReps(s) : displayCompletedReps(s)));
      const groups = CollectionUtils.inGroupsOf(5, arr);
      return groups.map((g) => g.join("/")).join("/ ");
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
      return set.completedReps >= set.reps;
    } else {
      return false;
    }
  }

  export function isFinished(sets: ISet[]): boolean {
    return sets.every((s) => s.completedReps != null);
  }

  export function group(sets: ISet[]): ISet[][] {
    return sets.reduce<ISet[][]>(
      (memo, set) => {
        let lastGroup = memo[memo.length - 1];
        const last = lastGroup[lastGroup.length - 1];
        if (last != null && (!Weight.eq(last.weight, set.weight) || last.completedReps !== set.completedReps)) {
          memo.push([]);
          lastGroup = memo[memo.length - 1];
        }
        lastGroup.push(set);
        return memo;
      },
      [[]]
    );
  }
}
