export class SetUtils {
  public static areEqual<T>(a: Set<T>, b: Set<T>): boolean {
    if (a.size !== b.size) {
      return false;
    }
    for (const item of a) {
      if (!b.has(item)) {
        return false;
      }
    }
    return true;
  }

  public static areAllEqual<T>(sets: Set<T>[]): boolean {
    if (sets.length < 2) return true;

    const [first, ...rest] = sets;
    for (const set of rest) {
      if (!this.areEqual(first, set)) {
        return false;
      }
    }
    return true;
  }

  public static containsAnyValues<T>(within: Set<T>, from: Set<T>): boolean {
    for (const item of from) {
      if (within.has(item)) {
        return true;
      }
    }
    return false;
  }
}
