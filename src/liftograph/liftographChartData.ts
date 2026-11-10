import { IHistoryRecord, ISettings } from "../types";
import { ILiftographSeriesEval, LiftographSeriesEval_rows } from "./liftographSeriesEval";
import { DateUtils_format } from "../utils/date";
import { MathUtils_formatCompact } from "../utils/math";
import { ILiftographDuration, ILiftographSeriesSpec, ILiftographWidget } from "./liftographCompile";
import { ILiftographWidgetResult, LiftographEngine_evaluateWidget } from "./liftographEngine";
import { LiftographPalette_entry } from "./liftographPalette";

export interface ILiftographChartSeries {
  id: number;
  label: string;
  color: string;
  textColor: string;
  mark: "line" | "dots" | "bars";
  axis: "left" | "right";
  unit?: string;
}

export interface ILiftographChartData {
  xMode: "time" | "linear";
  data: (number | null)[][];
  sources: (number | undefined)[][];
  series: ILiftographChartSeries[];
  errors: { name?: string; message: string }[];
}

export interface ILiftographChartReadout {
  label: string;
  values: { name: string; value: string; color: string }[];
}

export const LiftographChartData_ranges: ILiftographDuration[] = [
  { n: 1, unit: "m" },
  { n: 3, unit: "m" },
  { n: 6, unit: "m" },
  { n: 1, unit: "y" },
  "all",
];

export function LiftographChartData_build(
  result: Extract<ILiftographWidgetResult, { type: "graph" }>,
  _settings: ISettings
): ILiftographChartData {
  const errors: ILiftographChartData["errors"] = [];
  const ready: {
    id: number;
    spec: ILiftographSeriesSpec;
    points: { x: number; y: number }[];
    sources: (number | undefined)[];
    unit?: string;
  }[] = [];
  for (const [id, series] of result.series.entries()) {
    if (series.status === "ready") {
      ready.push({
        id,
        spec: series.spec,
        points: series.points.points,
        sources: series.points.sources,
        unit: series.points.y.unit,
      });
    } else {
      errors.push({ name: series.name, message: series.message });
    }
  }
  const xMode = ready[0]?.spec.xMode === "number" ? "linear" : "time";
  const byX = new Map<number, { y: number; source?: number }[][]>();
  ready.forEach((series, index) => {
    const counts = new Map<number, number>();
    series.points.forEach((point, pointIndex) => {
      const x = xMode === "time" ? point.x / 1000 : point.x;
      const occurrence = counts.get(x) ?? 0;
      counts.set(x, occurrence + 1);
      const rows = byX.get(x) ?? [];
      if (rows.length <= occurrence) {
        rows.push(ready.map(() => ({ y: NaN })));
      }
      rows[occurrence][index] = { y: point.y, source: series.sources[pointIndex] };
      byX.set(x, rows);
    });
  });
  const xs = Array.from(byX.keys()).sort((a, b) => a - b);
  const data: (number | null)[][] = [[], ...ready.map(() => [])];
  const sources: (number | undefined)[][] = ready.map(() => []);
  for (const x of xs) {
    for (const row of byX.get(x) ?? []) {
      data[0].push(x);
      row.forEach((cell, index) => {
        data[index + 1].push(isNaN(cell.y) ? null : cell.y);
        sources[index].push(cell.source);
      });
    }
  }
  const series = ready.map((s): ILiftographChartSeries => {
    const palette = LiftographPalette_entry(s.spec.color, s.id);
    return {
      id: s.id,
      label: s.spec.name ?? `Series ${s.id + 1}`,
      color: palette.stroke,
      textColor: palette.text,
      mark: s.spec.mark ?? (s.spec.xMode === "number" && s.spec.group == null ? "dots" : "line"),
      axis: s.spec.axis ?? "left",
      unit: s.unit,
    };
  });
  return { xMode, data, sources, series, errors };
}

export function LiftographChartData_records(
  result: Extract<ILiftographWidgetResult, { type: "graph" }>,
  evaluation: ILiftographSeriesEval
): Map<number, IHistoryRecord> {
  const records = new Map<number, IHistoryRecord>();
  for (const series of result.series) {
    if (series.status !== "ready") {
      continue;
    }
    for (const row of LiftographSeriesEval_rows(evaluation, series.spec.source)) {
      if (row.type === "exercise" || row.type === "workout") {
        records.set(row.ts, row.record);
      }
    }
  }
  return records;
}

export function LiftographChartData_prepare(
  widget: Extract<ILiftographWidget, { kind: "graph" }>,
  evaluation: ILiftographSeriesEval,
  rangeOverride?: ILiftographDuration
): { chart: ILiftographChartData; records: Map<number, IHistoryRecord> } | undefined {
  const result = LiftographEngine_evaluateWidget(widget, evaluation, rangeOverride);
  if (result.type !== "graph") {
    return undefined;
  }
  return {
    chart: LiftographChartData_build(result, evaluation.input.settings),
    records: LiftographChartData_records(result, evaluation),
  };
}

export function LiftographChartData_recordAt(
  chart: ILiftographChartData,
  records: Map<number, IHistoryRecord>,
  cursorIdx: number | null,
  hiddenIds: number[] = []
): IHistoryRecord | undefined {
  if (cursorIdx == null) {
    return undefined;
  }
  for (const [index, series] of chart.series.entries()) {
    const source = chart.sources[index]?.[cursorIdx];
    const record = source != null && hiddenIds.indexOf(series.id) === -1 ? records.get(source) : undefined;
    if (record != null) {
      return record;
    }
  }
  return undefined;
}

export function LiftographChartData_hasRecordLinks(
  chart: ILiftographChartData,
  records: Map<number, IHistoryRecord>
): boolean {
  return chart.sources.some((column) => column.some((source) => source != null && records.has(source)));
}

export function LiftographChartData_recordLabel(chart: ILiftographChartData, record: IHistoryRecord): string {
  return chart.xMode === "linear" ? `Workout, ${DateUtils_format(record.startTime, true)}` : "Workout";
}

function shiftDate(today: number, duration: Exclude<ILiftographDuration, "all">): number {
  const date = new Date(today);
  if (duration.unit === "d") {
    date.setDate(date.getDate() - duration.n);
  } else if (duration.unit === "w") {
    date.setDate(date.getDate() - duration.n * 7);
  } else {
    const months = duration.unit === "m" ? duration.n : duration.n * 12;
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() - months);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  return date.getTime();
}

export function LiftographChartData_window(
  range: ILiftographDuration,
  today: number,
  chart: ILiftographChartData
): { xMin?: number; xMax?: number } {
  if (range === "all") {
    return {};
  }
  const xMax = today / 1000;
  const rangeStart = shiftDate(today, range) / 1000;
  const xs = (chart.data[0] ?? []).filter((x): x is number => x != null);
  const firstX = xs.length > 0 ? Math.min(...xs) : undefined;
  const xMin = firstX != null && firstX > rangeStart && firstX < xMax ? firstX : rangeStart;
  return { xMin, xMax };
}

export function LiftographChartData_numericWindow(chart: ILiftographChartData): { xMin?: number; xMax?: number } {
  const xs = (chart.data[0] ?? []).filter((x): x is number => x != null);
  if (xs.length === 0) {
    return {};
  }
  return { xMin: Math.min(...xs) - 0.6, xMax: Math.max(...xs) + 0.6 };
}

export function LiftographChartData_rangeLabel(range: ILiftographDuration): string {
  return range === "all" ? "All" : `${range.n}${range.unit.toUpperCase()}`;
}

export function LiftographChartData_formatValue(value: number, unit?: string): string {
  const number = MathUtils_formatCompact(value, 1);
  return unit != null ? `${number} ${unit}` : number;
}

function latestIndex(column: (number | null)[]): number | undefined {
  for (let i = column.length - 1; i >= 0; i -= 1) {
    if (column[i] != null) {
      return i;
    }
  }
  return undefined;
}

export function LiftographChartData_toggleHidden(hiddenIds: number[], id: number): number[] {
  return hiddenIds.indexOf(id) === -1 ? [...hiddenIds, id] : hiddenIds.filter((hiddenId) => hiddenId !== id);
}

export function LiftographChartData_readout(
  chart: ILiftographChartData,
  cursorIdx: number | null,
  hiddenIds: number[] = []
): ILiftographChartReadout {
  const values = chart.series.flatMap((series, index) => {
    if (hiddenIds.indexOf(series.id) !== -1) {
      return [];
    }
    const column = chart.data[index + 1] ?? [];
    const at = cursorIdx ?? latestIndex(column);
    const value = at != null ? column[at] : undefined;
    return value != null
      ? [{ name: series.label, value: LiftographChartData_formatValue(value, series.unit), color: series.textColor }]
      : [];
  });
  if (cursorIdx == null) {
    return { label: "Latest", values };
  }
  const x = chart.data[0]?.[cursorIdx];
  const label = x == null ? "" : chart.xMode === "time" ? DateUtils_format(x * 1000, true) : MathUtils_formatCompact(x);
  return { label, values };
}
