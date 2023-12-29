export namespace MathUtils {
  export function round(value: number, to: number): number {
    return Math.round(value / to) * to;
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
}
