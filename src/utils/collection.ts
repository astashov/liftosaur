export namespace CollectionUtils {
  // inGroupsOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3).forEach((e) => print(e));
  //
  // ["1", "2", "3"]
  // ["4", "5", "6"]
  // ["7", "8", "9"]
  // ["10"]
  export function inGroupsOf<T>(length: number, collection: T[]): T[][] {
    if (collection.length > 0) {
      const result: T[][] = [[]];
      collection.forEach((item) => {
        let lastColl = result[result.length - 1];
        if (lastColl.length >= length) {
          lastColl = [];
          result.push(lastColl);
        }
        lastColl.push(item);
      });

      return result;
    } else {
      return [];
    }
  }

  export function inGroupsOfFilled<T>(length: number, collection: T[], shouldFill?: boolean): (T | undefined)[][] {
    const result = inGroupsOf(length, collection) as (T | undefined)[][];
    if (result.length > 0) {
      const lastColl = result[result.length - 1];
      if (lastColl != null) {
        for (let i = 0; i < length; i += 1) {
          lastColl[i] = lastColl[i] ?? undefined;
        }
      }
    }
    return result;
  }

  export function repeat<T>(el: T, length: number): T[] {
    const arr: T[] = [];
    for (let i = 0; i < length; i += 1) {
      arr.push(el);
    }
    return arr;
  }

  export function concatBy<T>(from: T[], to: T[], condition: (el: T) => string): T[] {
    const map = [...from, ...to].reduce<Record<string, T>>((memo, item) => {
      memo[condition(item)] = item;
      return memo;
    }, {});
    return Object.keys(map).map((key) => map[key]);
  }

  export function compatBy<T>(arr: T[], condition: (el: T) => string): T[] {
    const map = arr.reduce<Record<string, T>>((memo, item) => {
      memo[condition(item)] = item;
      return memo;
    }, {});
    return Object.keys(map).map((key) => map[key]);
  }

  export function groupByKey<T, K extends keyof T, U extends T[K] extends string ? string : never>(
    arr: T[],
    key: K
  ): Partial<Record<U, T[]>> {
    return arr.reduce<Partial<Record<U, T[]>>>((memo, item) => {
      const value = (item[key] as unknown) as U;
      memo[value] = memo[value] || [];
      memo[value]!.push(item);
      return memo;
    }, {});
  }

  export function collectToSet<T, K extends keyof T>(arr: T[], key: K): Set<T[K]> {
    const set = new Set<T[K]>();
    for (const el of arr) {
      set.add(el[key]);
    }
    return set;
  }

  export function flat<T>(from: T[][]): T[] {
    return from.reduce((acc, val) => acc.concat(val), []);
  }

  export function sort<T>(arr: T[], compareFn?: (a: T, b: T) => number): T[] {
    const arrCopy = [...arr];
    arrCopy.sort(compareFn);
    return arrCopy;
  }

  export function diff<T>(from: T[], to: T[]): T[] {
    return from.filter((x) => !to.includes(x)).concat(to.filter((x) => !from.includes(x)));
  }
}
