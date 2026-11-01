import { ISettings } from "../types";
import { ILiftographDuration, ILiftographWidget } from "./liftographCompile";
import { LiftographChartData_formatValue } from "./liftographChartData";
import { ILiftographWidgetResult } from "./liftographEngine";

export interface ILiftographValueView {
  number: string;
  unit?: string;
  change?: { direction: "up" | "down" | "same"; tone: "good" | "bad" | "neutral"; text: string };
  changeLabel: string;
  trend?: ({ x: number; y: number } | undefined)[];
}

function durationLabel(duration: ILiftographDuration): string {
  return duration === "all" ? "all" : `${duration.n}${duration.unit}`;
}

function normalizedTrend(trend: (number | undefined)[] | undefined): ILiftographValueView["trend"] {
  const values = (trend ?? []).filter((v): v is number => v != null);
  if (trend == null || values.length < 2) {
    return undefined;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return trend.map((v, i) => (v != null ? { x: i / (trend.length - 1), y: 1 - (v - min) / span } : undefined));
}

export function LiftographValueView_format(
  widget: Extract<ILiftographWidget, { kind: "value" }>,
  result: Extract<ILiftographWidgetResult, { type: "value" }>,
  _settings: ISettings
): ILiftographValueView {
  const value = result.value?.value;
  const unit = result.value?.axis.unit;
  if (value == null) {
    return { number: "—", unit, changeLabel: "no data yet", trend: normalizedTrend(result.value?.trend) };
  }
  const number = LiftographChartData_formatValue(value);
  const compare = result.value?.compare;
  if (widget.compare == null || compare == null) {
    return { number, unit, changeLabel: "", trend: normalizedTrend(result.value?.trend) };
  }
  const direction = compare > 0 ? "up" : compare < 0 ? "down" : "same";
  const isNeutral = widget.series.source.type === "stats" || direction === "same";
  const tone = isNeutral ? "neutral" : direction === "up" ? "good" : "bad";
  const text = direction === "same" ? "no change" : LiftographChartData_formatValue(Math.abs(compare), unit);
  return {
    number,
    unit,
    change: { direction, tone, text },
    changeLabel: `vs ${durationLabel(widget.compare)}`,
    trend: normalizedTrend(result.value?.trend),
  };
}

export function LiftographValueView_path(
  trend: NonNullable<ILiftographValueView["trend"]>,
  width: number,
  height: number
): string {
  let path = "";
  let isDrawing = false;
  for (const point of trend) {
    if (point == null) {
      isDrawing = false;
      continue;
    }
    path += `${isDrawing ? "L" : "M"}${(point.x * width).toFixed(2)} ${(point.y * height).toFixed(2)}`;
    isDrawing = true;
  }
  return path;
}
