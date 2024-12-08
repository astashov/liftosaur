export namespace MathUtils {
  export function round(value: number, to: number): number {
    return roundFloat(Math.round(value / to) * to, 4);
  }

  export function roundTo05(value: number): number {
    return round(value, 0.5);
  }

  export function roundTo005(value: number): number {
    return round(value, 0.05);
  }

  export function roundTo0005(value: number): number {
    return round(value, 0.005);
  }

  export function roundTo00005(value: number): number {
    return round(value, 0.0005);
  }

  export function roundFloat(value: number, precision: number): number {
    return +value.toFixed(precision);
  }

  export function applyOp(a: number, b: number, opr: "+=" | "-=" | "*=" | "/=" | "="): number {
    if (opr === "=") {
      return b;
    } else if (opr === "+=") {
      return a + b;
    } else if (opr === "-=") {
      return a - b;
    } else if (opr === "*=") {
      return MathUtils.roundTo005(a * b);
    } else {
      return MathUtils.roundTo005(a / b);
    }
  }

  export function clamp(value: number, min?: number, max?: number): number {
    if (min != null && max != null) {
      return Math.max(min, Math.min(max, value));
    } else if (min != null) {
      return Math.max(min, value);
    } else if (max != null) {
      return Math.min(max, value);
    } else {
      return value;
    }
  }

  export function toWord(num?: number): string | undefined {
    if (num == null) {
      return undefined;
    }
    return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][
      num
    ];
  }

  export function parse(value?: string): number | undefined {
    if (value == null) {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }
}

export function n(value: number, precision: number = 2): string {
  return `${MathUtils.roundFloat(value, precision)}`;
}
