export namespace StringUtils {
  export function pad(str: string, width: number, fill: string = "0"): string {
    return str.length >= width ? str : new Array(width - str.length + 1).join(fill) + str;
  }

  export function capitalize(string: string): string {
    return string[0].toUpperCase() + string.slice(1);
  }
}
