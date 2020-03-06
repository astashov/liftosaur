export type ISet = number | "amrap";

export namespace Set {
  export function display(sets: ISet[]): string {
    if (areSameReps(sets)) {
      return `${sets.length}x${sets[0]}`;
    } else {
      return sets.join("/");
    }
  }

  export function areSameReps(sets: ISet[]): boolean {
    if (sets.length > 0) {
      const firstSet = sets[0];
      return sets.every(s => s === firstSet);
    } else {
      return false;
    }
  }
}
