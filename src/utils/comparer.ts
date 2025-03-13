import { ObjectUtils } from "./object";

export namespace ComparerUtils {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export function noFns<T extends object>(prev: T, next: T): boolean {
    if (Object.keys(prev).length !== Object.keys(next).length) {
      return false;
    } else {
      const result = ObjectUtils.keys(prev).every((key) => {
        if (typeof prev[key] !== "function") {
          const result = prev[key] === next[key];
          return result;
        } else {
          return true;
        }
      });
      return result;
    }
  }
}
