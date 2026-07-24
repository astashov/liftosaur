/* eslint-disable @typescript-eslint/no-explicit-any */

import { CollectionUtils_compact, CollectionUtils_remove } from "./collection";
import { INonNullObject } from "./types";

export function ObjectUtils_keys<T extends {}>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

export function ObjectUtils_values<T extends {}>(obj: T): Array<T[keyof T]> {
  if ("values" in Object) {
    return Object.values(obj);
  } else {
    return ObjectUtils_keys(obj).map((key) => obj[key]);
  }
}

export function ObjectUtils_entries<T extends {}>(obj: T): Array<[keyof T, T[keyof T]]> {
  return ObjectUtils_keys(obj).map((key) => [key, obj[key]]);
}

export function ObjectUtils_entriesNonnull<T extends {}>(obj: T): Array<[keyof T, NonNullable<T[keyof T]>]> {
  return CollectionUtils_compact(ObjectUtils_keys(obj)).map((key) => [key, obj[key] as NonNullable<T[keyof T]>]);
}

export function ObjectUtils_isEmpty<T extends {}>(obj: T): boolean {
  return ObjectUtils_keys(obj).length === 0;
}

export function ObjectUtils_isNotEmpty<T extends {}>(obj: T): boolean {
  return !ObjectUtils_isEmpty(obj);
}

export function ObjectUtils_isEqual<T extends Record<string, any>>(
  obj1: T,
  obj2: T,
  ignoreKeys: string[] = []
): boolean {
  if (obj1 === obj2) {
    return true;
  }
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

export function ObjectUtils_diffPaths<T extends object>(obj1original: T, obj2original: T): string[] {
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

export function ObjectUtils_diff<T extends Record<string, any>>(oldObj: T, newObj: T): T {
  const chKeys = ObjectUtils_changedKeys(oldObj, newObj);
  const result: Partial<T> = {};
  for (const key of ObjectUtils_keys(chKeys)) {
    const value = chKeys[key];
    if (value === "add" || value === "update") {
      result[key] = newObj[key];
    }
  }
  return result as any;
}

export function ObjectUtils_changedKeys<T extends {}>(
  oldObj: T,
  newObj: T,
  eq: (a: any, b: any) => boolean = (a, b) => a === b
): Partial<Record<keyof T, "delete" | "update" | "add">> {
  let oldKeys = ObjectUtils_keys(oldObj);
  const newKeys = ObjectUtils_keys(newObj);
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
    oldKeys = CollectionUtils_remove(oldKeys, newKey);
  }
  for (const oldKey of oldKeys) {
    if (oldObj[oldKey] != null && newObj[oldKey] == null) {
      changes[oldKey] = "delete";
    }
  }
  return changes;
}

export function ObjectUtils_mapValues<U, V, T extends Record<any, U>>(
  obj: T,
  fn: (x: U, k: keyof T) => V
): Record<keyof T, V> {
  return ObjectUtils_keys(obj).reduce<Record<keyof T, V>>(
    (memo, k) => {
      memo[k] = fn(obj[k], k);
      return memo;
    },
    {} as Record<keyof T, V>
  );
}

export function ObjectUtils_filter<T extends {}>(obj: T, cb: (key: keyof T, value: T[keyof T]) => boolean): Partial<T> {
  const filteredKeys = ObjectUtils_keys(obj).filter((key) => {
    const value = obj[key];
    return cb(key, value);
  });
  return filteredKeys.reduce<Partial<T>>((memo, k) => {
    memo[k] = obj[k];
    return memo;
  }, {});
}

export function ObjectUtils_compact<T extends Record<string, any>>(obj: T): INonNullObject<T> {
  return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== null)) as INonNullObject<T>;
}

export function ObjectUtils_sortedByKeys<T extends {}>(
  obj: T,
  sortedKeys: Array<keyof T>
): Array<[keyof T, T[keyof T]]> {
  const arr: Array<[keyof T, T[keyof T]]> = [];
  const copyObj = { ...obj };
  for (const k of sortedKeys) {
    arr.push([k, copyObj[k]]);
    delete copyObj[k];
  }
  for (const k of ObjectUtils_keys(copyObj)) {
    arr.push([k, copyObj[k]]);
  }
  return arr;
}

export function ObjectUtils_pick<T extends {}, K extends keyof T, U extends Pick<T, K>>(obj: T, theKeys: K[]): U {
  return ObjectUtils_keys(obj).reduce<U>((memo, key: any) => {
    if (theKeys.indexOf(key) !== -1) {
      (memo as any)[key] = (obj as any)[key];
    }
    return memo;
  }, {} as any);
}

export function ObjectUtils_omit<T extends {}, K extends keyof T, U extends Omit<T, K>>(
  obj: T,
  theKeys: readonly K[]
): U {
  return ObjectUtils_keys(obj).reduce<U>((memo, key: any) => {
    if (theKeys.indexOf(key) === -1) {
      (memo as any)[key] = (obj as any)[key];
    }
    return memo;
  }, {} as any);
}

export function ObjectUtils_combinedKeys<T extends Record<string, unknown>, U extends Record<string, unknown>>(
  obj1: T,
  obj2: U
): Array<keyof T | keyof U> {
  return Array.from(new Set(ObjectUtils_keys(obj1).concat(ObjectUtils_keys(obj2) as any)));
}

export function ObjectUtils_findMaxValue<T extends Record<string, number | undefined>>(obj: T): number {
  return ObjectUtils_keys(obj).reduce<number>((memo, key) => {
    const v = obj[key];
    if (v != null && v > memo) {
      memo = v || 0;
    }
    return memo;
  }, 0);
}

export function ObjectUtils_findKeyByExpression<T extends Record<string, any>>(
  obj: T,
  expression: (key: keyof T, value: T[keyof T]) => boolean
): keyof T | undefined {
  for (const key of ObjectUtils_keys(obj)) {
    if (expression(key, obj[key])) {
      return key;
    }
  }
  return undefined;
}

// A faithful `structuredClone` polyfill. We use it on every platform rather than the native
// structuredClone because Hermes (React Native) doesn't ship one, and routing everything
// through a single implementation keeps web and native byte-for-byte identical.
//
// It matches structuredClone's two defining properties that JSON.parse(JSON.stringify())
// gets wrong, and that caused real crashes here:
//   - Shared references are preserved, not duplicated. An evaluated program inlines the same
//     reused exercise into hundreds of exercises; JSON.stringify expands that shared graph
//     into a multi-hundred-MB string and throws "String length exceeds limit". Preserving the
//     sharing keeps the clone the same size as the original.
//   - Reference cycles are preserved instead of throwing.
// It also preserves the values structuredClone keeps but JSON drops/mangles: NaN/Infinity,
// `undefined`, Date/RegExp/Map/Set/ArrayBuffer/typed arrays.
//
// One deliberate deviation: native structuredClone THROWS a DataCloneError on functions and
// symbols; we drop them instead (objects skip the key, arrays/maps/sets get `undefined`), the
// way the previous JSON-based clone tolerated them. Uncommon container types structuredClone
// also handles (Error, Blob/File, boxed primitives) are cloned as plain objects, since they
// never appear in the state we clone.
export function ObjectUtils_clone<T>(obj: T): T {
  return structuredCloneLike(obj, new WeakMap());
}

function structuredCloneLike<T>(obj: T, seen: WeakMap<object, unknown>): T {
  if (obj === null) {
    return obj;
  }
  const type = typeof obj;
  if (type !== "object") {
    // strings, numbers (NaN/Infinity/-0 preserved), booleans, bigint and undefined pass through.
    return (type === "function" || type === "symbol" ? undefined : obj) as T;
  }

  const value = obj as object;
  const existing = seen.get(value);
  if (existing !== undefined) {
    return existing as T;
  }

  if (value instanceof Date) {
    const result = new Date(value.getTime());
    seen.set(value, result);
    return result as unknown as T;
  }
  if (value instanceof RegExp) {
    const result = new RegExp(value.source, value.flags);
    seen.set(value, result);
    return result as unknown as T;
  }
  if (value instanceof ArrayBuffer) {
    const result = value.slice(0);
    seen.set(value, result);
    return result as unknown as T;
  }
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView & { length: number };
    const buffer = structuredCloneLike(view.buffer, seen) as ArrayBuffer;
    const result =
      value instanceof DataView
        ? new DataView(buffer, view.byteOffset, view.byteLength)
        : new (value.constructor as new (b: ArrayBuffer, o: number, l: number) => ArrayBufferView)(
            buffer,
            view.byteOffset,
            view.length
          );
    seen.set(value, result);
    return result as unknown as T;
  }
  if (value instanceof Map) {
    const result = new Map();
    seen.set(value, result);
    for (const [k, v] of value) {
      result.set(structuredCloneLike(k, seen), structuredCloneLike(v, seen));
    }
    return result as unknown as T;
  }
  if (value instanceof Set) {
    const result = new Set();
    seen.set(value, result);
    for (const v of value) {
      result.add(structuredCloneLike(v, seen));
    }
    return result as unknown as T;
  }
  if (Array.isArray(value)) {
    const result = new Array(value.length);
    seen.set(value, result);
    for (let i = 0; i < value.length; i += 1) {
      if (i in value) {
        result[i] = structuredCloneLike(value[i], seen);
      }
    }
    return result as unknown as T;
  }

  const result: Record<string, unknown> = {};
  seen.set(value, result);
  for (const key of Object.keys(value)) {
    const item = (value as Record<string, unknown>)[key];
    if (typeof item === "function" || typeof item === "symbol") {
      continue;
    }
    result[key] = structuredCloneLike(item, seen);
  }
  return result as unknown as T;
}

export function ObjectUtils_fromArray<K extends string, V>(arr: Array<[K, V]>): Record<K, V> {
  return arr.reduce<Record<K, V>>(
    (memo, [key, value]) => {
      memo[key] = value;
      return memo;
    },
    {} as Record<K, V>
  );
}
