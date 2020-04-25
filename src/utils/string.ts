export namespace StringUtils {
  export function pad(str: string, width: number, fill: string = "0"): string {
    return str.length >= width ? str : new Array(width - str.length + 1).join(fill) + str;
  }
}
