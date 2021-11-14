import { ObjectUtils } from "./object";

export namespace ComparerUtils {
  export function noFns<T>(prev: T, next: T): boolean {
    if (Object.keys(prev).length !== Object.keys(next).length) {
      return false;
    } else {
      return ObjectUtils.keys(prev).every((key) => {
        if (typeof prev[key] !== "function") {
          const result = prev[key] === next[key];
          return result;
        } else {
          return true;
        }
      });
    }
  }
}
