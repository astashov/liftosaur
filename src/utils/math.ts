export namespace MathUtils {
  export function round(value: number, to: number): number {
    return roundFloat(Math.round(value / to) * to, 4);
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
}

export function n(value: number, precision: number = 2): string {
  return `${MathUtils.roundFloat(value, precision)}`;
}
