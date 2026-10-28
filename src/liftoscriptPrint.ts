import type { ILiftoscriptScalar } from "./liftoscriptEvaluator";
import { Weight_print } from "./models/weight";
import { IPercentage, IWeight } from "./types";

export function LiftoscriptPrint_formatValue(value: ILiftoscriptScalar): string {
  if (typeof value === "string") {
    return value;
  } else if (typeof value === "boolean") {
    return value ? "true" : "false";
  } else {
    return Weight_print(value);
  }
}

export function LiftoscriptPrint_formatLine(values: (ILiftoscriptScalar | undefined)[]): string {
  return values.map((value) => LiftoscriptPrint_formatValue(value ?? 0)).join(", ");
}

export function LiftoscriptPrint_formatLegacy(prints?: (number | IWeight | IPercentage)[][]): string[] | undefined {
  return prints?.map((line) => LiftoscriptPrint_formatLine(line));
}

export function LiftoscriptPrint_lines(lines?: string[], legacy?: (number | IWeight | IPercentage)[][]): string[] {
  return lines ?? LiftoscriptPrint_formatLegacy(legacy) ?? [];
}
