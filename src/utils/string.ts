export namespace StringUtils {
  export function pad(str: string, width: number, fill: string = "0"): string {
    return str.length >= width ? str : new Array(width - str.length + 1).join(fill) + str;
  }

  export function capitalize(string: string): string {
    return string[0].toUpperCase() + string.slice(1);
  }

  export function dashcase(string: string): string {
    return string.replace(/:/g, "").replace(/\s+/g, "-").toLowerCase();
  }

  export function fuzzySearch(needle: string, haystack: string): boolean {
    if (needle.length > haystack.length) {
      return false;
    } else if (needle === haystack) {
      return true;
    } else {
      outer: for (let i = 0, j = 0; i < needle.length; i++) {
        const nch = needle.charCodeAt(i);
        while (j < haystack.length) {
          // eslint-disable-next-line no-plusplus
          if (haystack.charCodeAt(j++) === nch) {
            continue outer;
          }
        }
        return false;
      }
      return true;
    }
  }
}
