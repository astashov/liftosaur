import { DateUtils_firstDayOfWeekTimestamp } from "../utils/date";
import { ISettings } from "../types";
import type {
  ILiftographAgg,
  ILiftographDuration,
  ILiftographSeriesSpec,
  ILiftographWidget,
} from "./liftographCompile";
import { ILiftographEmission, ILiftographFoldResult, ILiftographValueKind } from "./liftographFold";

export interface ILiftographAxis {
  kind: ILiftographValueKind;
  unit?: string;
}

export interface ILiftographSeriesPoints {
  xMode: "time" | "number";
  points: { x: number; y: number }[];
  sources: (number | undefined)[];
  x?: ILiftographAxis;
  y: ILiftographAxis;
}

export interface ILiftographValueResult {
  value?: number;
  compare?: number;
  trend?: (number | undefined)[];
  axis: ILiftographAxis;
}

interface IPoint {
  x: number;
  y: number;
  source?: number;
}

function sourceOf(agg: ILiftographAgg, points: IPoint[], y: number): number | undefined {
  if (agg === "max" || agg === "min") {
    return points.find((p) => p.y === y)?.source;
  } else if (agg === "last") {
    return points[points.length - 1]?.source;
  }
  return undefined;
}

function aggregatePoints(agg: ILiftographAgg, x: number, points: IPoint[]): IPoint | undefined {
  const y = aggregate(
    agg,
    points.map((p) => p.y)
  );
  return y != null ? { x, y, source: sourceOf(agg, points, y) } : undefined;
}

function withSources(points: IPoint[]): Pick<ILiftographSeriesPoints, "points" | "sources"> {
  return { points: points.map((p) => ({ x: p.x, y: p.y })), sources: points.map((p) => p.source) };
}

const DAY_MS = 86400000;

function dayStart(ts: number): number {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function LiftographShape_dayStart(ts: number): number {
  return dayStart(ts);
}

function dayEnd(ts: number): number {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() - 1;
}

function dayNumber(ts: number): number {
  const date = new Date(ts);
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

function fromDayNumber(day: number): number {
  const date = new Date(day * DAY_MS);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).getTime();
}

export function LiftographShape_subtract(ts: number, duration: Exclude<ILiftographDuration, "all">): number {
  const date = new Date(ts);
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  if (duration.unit === "d" || duration.unit === "w") {
    return new Date(y, m, d - duration.n * (duration.unit === "w" ? 7 : 1)).getTime();
  }
  const year = duration.unit === "y" ? y - duration.n : y;
  const month = duration.unit === "m" ? m - duration.n : m;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(d, lastDay)).getTime();
}

export interface ILiftographWindow {
  from: number;
  to: number;
  days: number;
}

export function LiftographShape_window(
  today: number,
  range: ILiftographDuration,
  firstTs: number | undefined
): ILiftographWindow {
  const to = dayEnd(today);
  const from =
    range === "all"
      ? dayStart(Math.min(firstTs ?? today, today))
      : fromDayNumber(dayNumber(LiftographShape_subtract(dayStart(today), range)) + 1);
  return { from, to, days: Math.max(1, dayNumber(today) - dayNumber(from) + 1) };
}

function bucketStart(ts: number, duration: Exclude<ILiftographDuration, "all">, settings: ISettings): number {
  const date = new Date(ts);
  if (duration.unit === "d") {
    const day = dayNumber(ts);
    return fromDayNumber(Math.floor(day / duration.n) * duration.n);
  } else if (duration.unit === "w") {
    const weekStart = DateUtils_firstDayOfWeekTimestamp(ts, settings.startWeekFromMonday);
    const week = Math.floor(dayNumber(weekStart) / 7);
    return fromDayNumber(dayNumber(weekStart) - (week % duration.n) * 7);
  } else if (duration.unit === "m") {
    const month = date.getFullYear() * 12 + date.getMonth();
    const start = Math.floor(month / duration.n) * duration.n;
    return new Date(Math.floor(start / 12), start % 12, 1).getTime();
  }
  return new Date(Math.floor(date.getFullYear() / duration.n) * duration.n, 0, 1).getTime();
}

function nextBucket(start: number, duration: Exclude<ILiftographDuration, "all">): number {
  const date = new Date(start);
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return duration.unit === "d"
    ? new Date(y, m, d + duration.n).getTime()
    : duration.unit === "w"
      ? new Date(y, m, d + duration.n * 7).getTime()
      : duration.unit === "m"
        ? new Date(y, m + duration.n, 1).getTime()
        : new Date(y + duration.n, 0, 1).getTime();
}

function aggregate(agg: ILiftographAgg, values: number[]): number | undefined {
  if (agg === "count") {
    return values.length;
  } else if (agg === "sum") {
    return values.reduce((a, b) => a + b, 0);
  } else if (values.length === 0) {
    return undefined;
  } else if (agg === "max") {
    return Math.max(...values);
  } else if (agg === "min") {
    return Math.min(...values);
  } else if (agg === "avg") {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  return values[values.length - 1];
}

function isEmptyZero(agg: ILiftographAgg): boolean {
  return agg === "sum" || agg === "count";
}

function sortedEmissions(emissions: ILiftographEmission[]): ILiftographEmission[] {
  return [...emissions].sort((a, b) => a.ts - b.ts);
}

function groupByTime(
  points: IPoint[],
  group: NonNullable<ILiftographSeriesSpec["group"]>,
  settings: ISettings,
  t: number
): IPoint[] {
  const duration = group.duration;
  if (duration == null) {
    return points;
  } else if (duration === "all") {
    const point = points.length > 0 ? aggregatePoints(group.agg, points[0].x, points) : undefined;
    return point != null ? [point] : [];
  }
  const buckets = new Map<number, IPoint[]>();
  for (const point of points) {
    const start = bucketStart(point.x, duration, settings);
    const bucket = buckets.get(start) ?? [];
    bucket.push(point);
    buckets.set(start, bucket);
  }
  const starts = Array.from(buckets.keys()).sort((a, b) => a - b);
  if (starts.length === 0) {
    return [];
  }
  if (isEmptyZero(group.agg)) {
    const last = bucketStart(t, duration, settings);
    for (let start = starts[0]; start <= last; start = nextBucket(start, duration)) {
      if (!buckets.has(start)) {
        buckets.set(start, []);
      }
    }
  }
  const result: IPoint[] = [];
  for (const start of Array.from(buckets.keys()).sort((a, b) => a - b)) {
    const point = aggregatePoints(group.agg, start, buckets.get(start) ?? []);
    if (point != null) {
      result.push(point);
    }
  }
  return result;
}

function groupByX(points: IPoint[], agg: ILiftographAgg): IPoint[] {
  const groups = new Map<number, IPoint[]>();
  for (const point of points) {
    const group = groups.get(point.x) ?? [];
    group.push(point);
    groups.set(point.x, group);
  }
  const result: IPoint[] = [];
  for (const x of Array.from(groups.keys()).sort((a, b) => a - b)) {
    const point = aggregatePoints(agg, x, groups.get(x) ?? []);
    if (point != null) {
      result.push(point);
    }
  }
  return result;
}

function inDurationWindow(x: number, end: number, duration: ILiftographDuration): boolean {
  if (duration === "all") {
    return x <= dayEnd(end);
  }
  return x <= dayEnd(end) && dayStart(x) > LiftographShape_subtract(dayStart(end), duration);
}

function smooth(points: IPoint[], spec: NonNullable<ILiftographSeriesSpec["smooth"]>): IPoint[] {
  const size = spec.window;
  return points.map((point, index) => {
    const window =
      typeof size === "number"
        ? points.slice(Math.max(0, index - size + 1), index + 1)
        : points.slice(0, index + 1).filter((p) => inDurationWindow(p.x, point.x, size));
    return {
      x: point.x,
      y:
        aggregate(
          spec.agg,
          window.map((p) => p.y)
        ) ?? point.y,
    };
  });
}

function grouped(fold: ILiftographFoldResult, series: ILiftographSeriesSpec, settings: ISettings, t: number): IPoint[] {
  const cut = dayEnd(t);
  const points = sortedEmissions(fold.emissions)
    .filter((e) => e.ts <= cut)
    .map((e) => ({ x: e.ts, y: e.y, source: e.ts }));
  return series.group != null ? groupByTime(points, series.group, settings, t) : points;
}

function inRange(ts: number, t: number, range: ILiftographDuration | undefined): boolean {
  return range == null || range === "all" || dayStart(ts) > LiftographShape_subtract(t, range);
}

function axisOf(
  kind: ILiftographValueKind | undefined,
  series: ILiftographSeriesSpec,
  settings: ISettings,
  isCounted: boolean
): ILiftographAxis {
  if (isCounted) {
    return { kind: "number" };
  } else if (kind === "weight") {
    return { kind: "weight", unit: settings.units };
  } else if (series.source.type === "stats" && series.source.key === "bodyfat") {
    return { kind: "number", unit: "%" };
  } else if (series.source.type === "stats" && series.source.key === "sleep") {
    return { kind: "number", unit: "h" };
  } else if (series.source.type === "stats" && series.source.key === "calories") {
    return { kind: "number", unit: "kcal" };
  } else if (series.source.type === "stats" && series.source.key === "protein") {
    return { kind: "number", unit: "g" };
  } else if (series.source.type === "stats" && series.source.key !== "weight") {
    return { kind: "number", unit: settings.lengthUnits };
  }
  return { kind: "number" };
}

function yAxis(fold: ILiftographFoldResult, series: ILiftographSeriesSpec, settings: ISettings): ILiftographAxis {
  const isCounted = series.group?.agg === "count" || series.smooth?.agg === "count";
  return axisOf(fold.checkpoint.yKind, series, settings, isCounted);
}

function isCurrentBucketEmpty(
  points: IPoint[],
  series: ILiftographSeriesSpec,
  settings: ISettings,
  t: number
): boolean {
  const duration = series.group?.duration;
  if (duration == null || duration === "all") {
    return false;
  }
  return points[points.length - 1]?.x !== bucketStart(t, duration, settings);
}

export function LiftographShape_series(
  fold: ILiftographFoldResult,
  series: ILiftographSeriesSpec,
  settings: ISettings,
  t: number,
  range?: ILiftographDuration
): ILiftographSeriesPoints {
  if (series.xMode === "number") {
    const cut = dayEnd(t);
    let points = fold.emissions
      .filter((e) => e.ts <= cut && e.x != null && inRange(e.ts, t, range))
      .map((e): IPoint => ({ x: e.x ?? 0, y: e.y, source: e.ts }));
    points = series.group != null ? groupByX(points, series.group.agg) : [...points].sort((a, b) => a.x - b.x);
    if (series.smooth != null) {
      points = smooth(points, series.smooth);
    }
    const x = axisOf(fold.checkpoint.xKind, series, settings, false);
    return { xMode: "number", ...withSources(points), x, y: yAxis(fold, series, settings) };
  }
  let points = grouped(fold, series, settings, t);
  if (series.smooth != null) {
    points = smooth(points, series.smooth);
  }
  return {
    xMode: "time",
    ...withSources(points.filter((p) => inRange(p.x, t, range))),
    y: yAxis(fold, series, settings),
  };
}

export function LiftographShape_valueAt(
  fold: ILiftographFoldResult,
  series: ILiftographSeriesSpec,
  settings: ISettings,
  t: number
): number | undefined {
  const points = grouped(fold, series, settings, t);
  const smoothing = series.smooth;
  if (smoothing != null && typeof smoothing.window !== "number") {
    const window = smoothing.window;
    const values = points.filter((p) => inDurationWindow(p.x, t, window)).map((p) => p.y);
    return aggregate(smoothing.agg, values);
  }
  const shaped = smoothing != null ? smooth(points, smoothing) : points;
  if (isCurrentBucketEmpty(shaped, series, settings, t)) {
    return undefined;
  }
  return shaped[shaped.length - 1]?.y;
}

export function LiftographShape_value(
  fold: ILiftographFoldResult,
  widget: Extract<ILiftographWidget, { kind: "value" }>,
  settings: ISettings,
  today: number
): ILiftographValueResult {
  const value = LiftographShape_valueAt(fold, widget.series, settings, today);
  const result: ILiftographValueResult = { value, axis: yAxis(fold, widget.series, settings) };
  if (widget.compare != null && widget.compare !== "all") {
    const previous = LiftographShape_valueAt(
      fold,
      widget.series,
      settings,
      LiftographShape_subtract(today, widget.compare)
    );
    if (value != null && previous != null) {
      result.compare = value - previous;
    }
  }
  if (widget.trend != null && widget.trend !== "all") {
    const trend: (number | undefined)[] = [];
    const first = LiftographShape_subtract(dayStart(today), widget.trend);
    for (let day = dayNumber(first) + 1; day <= dayNumber(today); day += 1) {
      trend.push(LiftographShape_valueAt(fold, widget.series, settings, fromDayNumber(day)));
    }
    result.trend = trend;
  }
  return result;
}
