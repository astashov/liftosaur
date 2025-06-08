/* eslint-disable no-bitwise */
export namespace StringUtils {
  export function pad(str: string, width: number, fill: string = "0"): string {
    return str.length >= width ? str : new Array(width - str.length + 1).join(fill) + str;
  }

  export function capitalize(string: string): string {
    return string[0].toUpperCase() + string.slice(1);
  }

  export function pluralize(string: string, count: number): string {
    return `${string}${count !== 1 ? "s" : ""}`;
  }

  export function dashcase(string: string): string {
    return string.replace(/[:,]/g, "").replace(/\s+/g, "-").toLowerCase();
  }

  export function undashcase(string: string): string {
    return string.replace(/-/g, " ");
  }

  export function uncamelCase(string: string): string {
    return string.replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  export function camelCase(string: string): string {
    return string
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => (index === 0 ? letter.toLowerCase() : letter.toUpperCase()))
      .replace(/\s+/g, "");
  }

  export function snakecase(string: string): string {
    return string.replace(/[:,]/g, "").replace(/\s+/g, "_").toLowerCase();
  }

  export function truncate(string: string, length: number): string {
    if (string.length > length) {
      return `${string.slice(0, length - 3)}...`;
    } else {
      return string;
    }
  }

  export function unindent(string: string): string {
    const indent = string.split("\n").reduce<number | undefined>((memo, line) => {
      const match = line.match(/^(\s*)\S/);
      if (match != null) {
        const spaces = match[1];
        if (memo == null || memo > spaces.length) {
          return spaces.length;
        }
      }
      return memo;
    }, undefined);
    if (indent != null) {
      return string
        .split("\n")
        .filter((s) => s.trim() !== "")
        .map((s) => s.slice(indent, s.length).trimEnd())
        .join("\n");
    } else {
      return string;
    }
  }

  export function indent(string: string, spaces: number): string {
    const indent = new Array(spaces + 1).join(" ");
    return string
      .split("\n")
      .map((s) => (s.trim() !== "" ? `${indent}${s}` : s))
      .join("\n");
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

  export function nextName(name: string): string {
    const match = name.match(/(\d+)$/);
    if (match) {
      const number = parseInt(match[0], 10);
      return name.replace(/\d+$/, (number + 1).toString());
    }
    return name + " 2";
  }

  export function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  export function hashString(str: string): string {
    return new Uint32Array([hashCode(str)])[0].toString(16);
  }
}
