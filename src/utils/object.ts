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
}
