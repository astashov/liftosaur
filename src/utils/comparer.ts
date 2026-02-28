import { ObjectUtils_keys } from "./object";

export function ComparerUtils_noFns<T extends object>(prev: T, next: T): boolean {
  if (Object.keys(prev).length !== Object.keys(next).length) {
    return false;
  } else {
    const result = ObjectUtils_keys(prev).every((key) => {
      if (typeof prev[key] !== "function") {
        const result2 = prev[key] === next[key];
        return result2;
      } else {
        return true;
      }
    });
    return result;
  }
}
