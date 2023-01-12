/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
export namespace ObjectUtils {
  export function keys<T extends {}>(obj: T): Array<keyof T> {
    return Object.keys(obj) as Array<keyof T>;
  }

  export function values<T extends {}>(obj: T): Array<T[keyof T]> {
    return ObjectUtils.keys(obj).map((key) => obj[key]);
  }

  export function entries<T extends {}>(obj: T): Array<[keyof T, T[keyof T]]> {
    return ObjectUtils.keys(obj).map((key) => [key, obj[key]]);
  }

  export function filter<T extends {}>(obj: T, cb: (key: keyof T, value: T[keyof T]) => boolean): Partial<T> {
    const filteredKeys = ObjectUtils.keys(obj).filter((key) => {
      const value = obj[key];
      return cb(key, value);
    });
    return filteredKeys.reduce<Partial<T>>((memo, k) => {
      memo[k] = obj[k];
      return memo;
    }, {});
  }

  export function sortedByKeys<T extends {}>(obj: T, sortedKeys: Array<keyof T>): Array<[keyof T, T[keyof T]]> {
    const arr: Array<[keyof T, T[keyof T]]> = [];
    const copyObj = { ...obj };
    for (const k of sortedKeys) {
      arr.push([k, copyObj[k]]);
      delete copyObj[k];
    }
    for (const k of ObjectUtils.keys(copyObj)) {
      arr.push([k, copyObj[k]]);
    }
    return arr;
  }

  export function pick<T extends {}, K extends keyof T, U extends Pick<T, K>>(obj: T, theKeys: K[]): U {
    return keys(obj).reduce<U>((memo, key: any) => {
      if (theKeys.indexOf(key) !== -1) {
        (memo as any)[key] = (obj as any)[key];
      }
      return memo;
    }, {} as any);
  }

  export function combinedKeys<T extends Record<string, unknown>, U extends Record<string, unknown>>(
    obj1: T,
    obj2: U
  ): Array<keyof T | keyof U> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.from(new Set(ObjectUtils.keys(obj1).concat(ObjectUtils.keys(obj2) as any)));
  }

  export function findMaxValue<T extends Record<string, number | undefined>>(obj: T): number {
    return ObjectUtils.keys(obj).reduce<number>((memo, key) => {
      if (obj[key] > memo) {
        memo = obj[key]! || 0;
      }
      return memo;
    }, 0);
  }
}
