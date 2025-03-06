/* eslint-disable @typescript-eslint/no-explicit-any */

import { CollectionUtils } from "./collection";
import { INonNullObject } from "./types";

/* eslint-disable @typescript-eslint/ban-types */
export namespace ObjectUtils {
  export function keys<T extends {}>(obj: T): Array<keyof T> {
    return Object.keys(obj) as Array<keyof T>;
  }

  export function values<T extends {}>(obj: T): Array<T[keyof T]> {
    if ("values" in Object) {
      return Object.values(obj);
    } else {
      return ObjectUtils.keys(obj).map((key) => obj[key]);
    }
  }

  export function entries<T extends {}>(obj: T): Array<[keyof T, T[keyof T]]> {
    return ObjectUtils.keys(obj).map((key) => [key, obj[key]]);
  }

  export function isEmpty<T extends {}>(obj: T): boolean {
    return ObjectUtils.keys(obj).length === 0;
  }

  export function isNotEmpty<T extends {}>(obj: T): boolean {
    return !ObjectUtils.isEmpty(obj);
  }

  export function isEqual<T extends Record<string, any>>(obj1: T, obj2: T, ignoreKeys: string[] = []): boolean {
    // Create a stack for comparing objects
    const stack: Array<[any, any]> = [[obj1, obj2]];

    while (stack.length > 0) {
      // Pop a pair of items from the stack
      const [currentObj1, currentObj2] = stack.pop()!;
      if (currentObj1 === currentObj2) {
        continue;
      }

      // Check if both are objects
      if (
        typeof currentObj1 !== "object" ||
        typeof currentObj2 !== "object" ||
        currentObj1 == null ||
        currentObj2 == null
      ) {
        if (currentObj1 !== currentObj2) {
          return false;
        }
        continue;
      }

      // Get keys of both objects
      const keys1 = Object.keys(currentObj1);
      const keys2 = Object.keys(currentObj2);

      // Iterate over keys and add nested objects to the stack
      for (const key of new Set([...keys1, ...keys2])) {
        if (ignoreKeys.indexOf(key) !== -1) {
          continue;
        }
        stack.push([currentObj1[key], currentObj2[key]]);
      }
    }

    // If all checks pass, the objects are equal
    return true;
  }

  export function diffPaths<T extends object>(obj1original: T, obj2original: T): string[] {
    const result: string[] = [];
    const queue: {
      obj1: any;
      obj2: any;
      path: string;
    }[] = [{ obj1: obj1original, obj2: obj2original, path: "" }];

    while (queue.length > 0) {
      const { obj1, obj2, path } = queue.shift()!;

      if (obj1 === obj2) {
        continue;
      }

      if (Object(obj1) !== obj1 || Object(obj2) !== obj2) {
        if (obj1 !== obj2) {
          // console.log("diffPath", path, obj1, obj2);
          result.push(path);
        }
        continue;
      }

      for (const key of new Set([...Object.keys(obj1), ...Object.keys(obj2)])) {
        const newPath = path ? `${path}.${key}` : key;
        queue.push({ obj1: obj1[key], obj2: obj2[key], path: newPath });
      }
    }

    return result;
  }

  export function diff<T extends Record<string, any>>(oldObj: T, newObj: T): T {
    const chKeys = ObjectUtils.changedKeys(oldObj, newObj);
    const result: Partial<T> = {};
    for (const key of ObjectUtils.keys(chKeys)) {
      const value = chKeys[key];
      if (value === "add" || value === "update") {
        result[key] = newObj[key];
      }
    }
    return result as any;
  }

  export function changedKeys<T extends {}>(
    oldObj: T,
    newObj: T,
    eq: (a: any, b: any) => boolean = (a, b) => a === b,
  ): Partial<Record<keyof T, "delete" | "update" | "add">> {
    let oldKeys = keys(oldObj);
    const newKeys = keys(newObj);
    const changes: Partial<Record<keyof T, "delete" | "update" | "add">> = {};

    for (const newKey of newKeys) {
      if (newObj[newKey] != null && oldObj[newKey] == null) {
        changes[newKey] = "add";
      } else if (newObj[newKey] == null && oldObj[newKey] != null) {
        changes[newKey] = "delete";
      } else if (newObj[newKey] != null && oldObj[newKey] != null) {
        if (!eq(newObj[newKey], oldObj[newKey])) {
          changes[newKey] = "update";
        }
      }
      oldKeys = CollectionUtils.remove(oldKeys, newKey);
    }
    for (const oldKey of oldKeys) {
      if (oldObj[oldKey] != null && newObj[oldKey] == null) {
        changes[oldKey] = "delete";
      }
    }
    return changes;
  }

  export function mapValues<U, V, T extends Record<any, U>>(obj: T, fn: (x: U) => V): Record<keyof T, V> {
    return ObjectUtils.keys(obj).reduce<Record<keyof T, V>>(
      (memo, k) => {
        memo[k] = fn(obj[k]);
        return memo;
      },
      {} as Record<keyof T, V>,
    );
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

  export function compact<T extends Record<string, any>>(obj: T): INonNullObject<T> {
    return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== null)) as INonNullObject<T>;
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

  export function omit<T extends {}, K extends keyof T, U extends Omit<T, K>>(obj: T, theKeys: readonly K[]): U {
    return keys(obj).reduce<U>((memo, key: any) => {
      if (theKeys.indexOf(key) === -1) {
        (memo as any)[key] = (obj as any)[key];
      }
      return memo;
    }, {} as any);
  }

  export function combinedKeys<T extends Record<string, unknown>, U extends Record<string, unknown>>(
    obj1: T,
    obj2: U,
  ): Array<keyof T | keyof U> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.from(new Set(ObjectUtils.keys(obj1).concat(ObjectUtils.keys(obj2) as any)));
  }

  export function findMaxValue<T extends Record<string, number | undefined>>(obj: T): number {
    return ObjectUtils.keys(obj).reduce<number>((memo, key) => {
      const v = obj[key];
      if (v != null && v > memo) {
        memo = v || 0;
      }
      return memo;
    }, 0);
  }

  export function clone<T>(obj: T): T {
    if (obj == null) {
      return obj;
    }
    if (typeof window !== "undefined" && window.structuredClone) {
      return window.structuredClone(obj);
    } else {
      return JSON.parse(JSON.stringify(obj));
    }
  }
}
