/* eslint-disable @typescript-eslint/no-explicit-any */
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

  export function splitIntoNGroups<T>(coll: T[], numberOfGroups: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < numberOfGroups; i += 1) {
      result.push([]);
    }
    let index = 0;
    for (const item of coll) {
      result[index].push(item);
      index += 1;
      if (index >= numberOfGroups) {
        index = 0;
      }
    }
    return result;
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

  export function groupBy<T>(items: T[], cond: (last: T, item: T) => boolean): T[][] {
    return items.reduce<T[][]>(
      (memo, set) => {
        let lastGroup = memo[memo.length - 1];
        const last = lastGroup[lastGroup.length - 1];
        if (last != null && cond(last, set)) {
          memo.push([]);
          lastGroup = memo[memo.length - 1];
        }
        lastGroup.push(set);
        return memo;
      },
      [[]]
    );
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
    U extends T[K] extends string ? string : T[K] extends number ? number : never,
  >(arr: T[], key: K): Partial<Record<U, T[]>> {
    return arr.reduce<Partial<Record<U, T[]>>>((memo, item) => {
      const value = item[key] as unknown as U;
      memo[value] = memo[value] || [];
      memo[value]!.push(item);
      return memo;
    }, {});
  }

  export function groupByExpr<T>(arr: T[], expr: (item: T) => string): Partial<Record<string, T[]>> {
    return arr.reduce<Partial<Record<string, T[]>>>((memo, item) => {
      const value = expr(item);
      memo[value] = memo[value] || [];
      memo[value]!.push(item);
      return memo;
    }, {});
  }

  export function groupByKeyUniq<
    T,
    K extends keyof T,
    U extends T[K] extends string ? string : T[K] extends number ? number : never,
  >(arr: T[], key: K): Partial<Record<U, T>> {
    return arr.reduce<Partial<Record<U, T>>>((memo, item) => {
      const value = item[key] as unknown as U;
      memo[value] = item;
      return memo;
    }, {});
  }

  export function groupByExprUniq<T>(arr: T[], expr: (item: T) => string): Partial<Record<string, T>> {
    return arr.reduce<Partial<Record<string, T>>>((memo, item) => {
      const value = expr(item);
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

  export function collectToSetTransform<T, K extends keyof T, U>(
    arr: T[],
    key: K,
    transformer: (val: T[K]) => U
  ): Set<U> {
    const set = new Set<U>();
    for (const el of arr) {
      set.add(transformer(el[key]));
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

  export function reorder<T>(arr: T[], start: number, end: number): T[] {
    const newDays = [...arr];
    const [daysToMove] = newDays.splice(start, 1);
    newDays.splice(end, 0, daysToMove);
    return newDays;
  }

  export function sortInOrder<T extends {}, K extends keyof T>(arr: T[], key: K, order: T[K][]): T[] {
    const arrCopy = [...arr];
    arrCopy.sort((a, b) => {
      const aIndex = order.indexOf(a[key]);
      const bIndex = order.indexOf(b[key]);
      if (aIndex === -1) {
        return 1;
      } else if (bIndex === -1) {
        return -1;
      } else {
        return aIndex - bIndex;
      }
    });
    return arrCopy;
  }

  export function sortByMultiple<T extends {}, K extends keyof T>(arr: T[], keys: K[], isReverse?: boolean): T[] {
    const arrCopy = [...arr];
    arrCopy.sort((a, b) => {
      for (const key of keys) {
        const aVal = a[key] as any;
        const bVal = b[key] as any;
        if (aVal === bVal) {
          continue;
        } else {
          if (typeof aVal === "number" && typeof bVal === "number") {
            return isReverse ? bVal - aVal : aVal - bVal;
          } else if (typeof aVal === "string" && typeof bVal === "string") {
            return isReverse ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
          } else if (typeof aVal === "boolean" && typeof bVal === "boolean") {
            return isReverse ? (bVal ? -1 : 1) : aVal ? -1 : 1;
          } else if (aVal == null || bVal == null) {
            return isReverse ? (bVal == null ? -1 : 1) : aVal == null ? -1 : 1;
          }
        }
      }
      return 0;
    });

    return arrCopy as any;
  }

  export function sortBy<T extends {}, K extends keyof T>(
    arr: T[],
    key: K,
    isReverse?: boolean
  ): T[K] extends number ? T[] : never {
    const arrCopy = [...arr];
    arrCopy.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aVal = a[key] as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bVal = b[key] as any;
      return isReverse ? bVal - aVal : aVal - bVal;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return arrCopy as any;
  }

  export function sortByExpr<T extends {}>(arr: T[], fn: (item: T) => number, isReverse?: boolean): T[] {
    const arrCopy = [...arr];
    arrCopy.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aVal = fn(a) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bVal = fn(b) as any;
      return isReverse ? bVal - aVal : aVal - bVal;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return arrCopy as any;
  }

  export function diff<T>(from: T[], to: T[]): T[] {
    return from.filter((x) => !to.includes(x)).concat(to.filter((x) => !from.includes(x)));
  }

  export function diffBy<T extends {}>(from: T[], to: T[], key: keyof T): T[] {
    return from
      .filter((x) => !to.some((y) => x[key] === y[key]))
      .concat(to.filter((x) => !from.some((y) => x[key] === y[key])));
  }

  export function remove<T>(from: T[], item: T): T[] {
    return from.filter((t) => t !== item);
  }

  export function removeAll<T>(from: T[], item: T[]): T[] {
    return from.filter((t) => !item.includes(t));
  }

  export function removeAt<T>(from: T[], index: number): T[] {
    const result = [...from];
    result.splice(index, 1);
    return result;
  }

  export function setAt<T>(from: T[], index: number, item: T): T[] {
    return from.map((e, i) => (i === index ? item : e));
  }

  export function setBy<T extends {}, K extends keyof T, V extends T[K]>(from: T[], key: K, value: V, newItem: T): T[] {
    return from.map((e) => (e[key] === value ? newItem : e));
  }

  export function setOrAddBy<T extends {}, K extends keyof T, V extends T[K]>(
    from: T[],
    key: K,
    value: V,
    newItem: T
  ): T[] {
    const hasKeyValue = from.some((e) => e[key] === value);
    if (hasKeyValue) {
      return setBy(from, key, value, newItem);
    } else {
      return [...from, newItem];
    }
  }

  export function removeBy<T extends {}, K extends keyof T, V extends T[K]>(from: T[], key: K, value: V): T[] {
    return from.filter((t) => t[key] !== value);
  }

  export function nonnull<T>(from: (T | undefined)[]): T[] {
    return from.filter((t) => t != null) as T[];
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

  export function uniqByExpr<T extends {}, V>(from: T[], fn: (item: T) => V): T[] {
    const set = new Set();
    const result = [];
    for (const el of from) {
      const id = fn(el);
      if (!set.has(id)) {
        result.push(el);
        set.add(id);
      }
    }
    return result;
  }

  export function findBy<T extends {}, K extends keyof T>(from: T[], key: K, value: T[K]): T | undefined {
    let result: T | undefined = undefined;
    for (const el of from) {
      if (el[key] === value) {
        result = el;
        break;
      }
    }
    return result;
  }

  export function findIndexReverse<T>(from: T[], cb: (item: T) => boolean): number {
    for (let i = from.length - 1; i >= 0; i -= 1) {
      if (cb(from[i])) {
        return i;
      }
    }
    return -1;
  }

  export function merge<T>(from: T[], to: T[]): T[] {
    return Array.from(new Set([...from, ...to]));
  }

  export function compressArray(arr: number[], threshold: number): string[] {
    const result: string[] = [];
    let count = 1;

    for (let i = 1; i <= arr.length; i++) {
      if (arr[i] === arr[i - 1]) {
        count += 1;
      } else {
        if (count >= threshold) {
          result.push(`${count}x${arr[i - 1]}`);
        } else {
          while (count > 0) {
            result.push(`${arr[i - 1]}`);
            count -= 1;
          }
        }
        count = 1;
      }
    }

    return result;
  }

  export function areSortedInSameOrder<T, U>(coll1: T[], coll2: U[], areEqual: (a: T, b: U) => boolean): boolean {
    if (coll1.length !== coll2.length) {
      return false;
    }
    for (let i = 0; i < coll1.length; i += 1) {
      if (!areEqual(coll1[i], coll2[i])) {
        return false;
      }
    }
    return true;
  }
}
