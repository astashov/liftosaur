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
}
