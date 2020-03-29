export namespace ObjectUtils {
  export function keys<T extends {}>(obj: T): Array<keyof T> {
    return Object.keys(obj) as Array<keyof T>;
  }
}
