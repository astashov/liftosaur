import { BLEND_OVERLAY } from "jimp/*";

/* eslint-disable @typescript-eslint/ban-types */
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

  export function compact<T>(arr: (T | undefined)[]): T[] {
    return arr.filter((i) => i) as T[];
  }

  export function groupByKey<
    T,
    K extends keyof T,
    U extends T[K] extends string ? string : T[K] extends number ? number : never
  >(arr: T[], key: K): Partial<Record<U, T[]>> {
    return arr.reduce<Partial<Record<U, T[]>>>((memo, item) => {
      const value = (item[key] as unknown) as U;
      memo[value] = memo[value] || [];
      memo[value]!.push(item);
      return memo;
    }, {});
  }

  export function groupByKeyUniq<T, K extends keyof T, U extends T[K] extends string ? string : never>(
    arr: T[],
    key: K
  ): Partial<Record<U, T>> {
    return arr.reduce<Partial<Record<U, T>>>((memo, item) => {
      const value = (item[key] as unknown) as U;
      memo[value] = item;
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

  export function sortBy<T extends {}, K extends keyof T>(arr: T[], key: K): T[K] extends number ? T[] : never {
    const arrCopy = [...arr];
    arrCopy.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aVal = a[key] as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bVal = b[key] as any;
      return aVal - bVal;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return arrCopy as any;
  }

  export function diff<T>(from: T[], to: T[]): T[] {
    return from.filter((x) => !to.includes(x)).concat(to.filter((x) => !from.includes(x)));
  }

  export function remove<T>(from: T[], item: T): T[] {
    return from.filter((t) => t !== item);
  }

  export function removeAt<T>(from: T[], index: number): T[] {
    const result = [...from];
    result.splice(index, 1);
    return result;
  }

  export function setAt<T>(from: T[], index: number, item: T): T[] {
    return from.map((e, i) => (i === index ? item : e));
  }

  export function removeBy<T extends {}, K extends keyof T, V extends T[K]>(from: T[], key: K, value: V): T[] {
    return from.filter((t) => t[key] !== value);
  }

  export function uniqBy<T extends {}>(from: T[], key: keyof T): T[] {
    const set = new Set();
    const result = [];
    for (const el of from) {
      const id = el[key];
      if (!set.has(id)) {
        result.push(el);
        set.add(id);
      }
    }
    return result;
  }
}
