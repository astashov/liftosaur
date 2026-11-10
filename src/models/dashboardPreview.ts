import { ISettings } from "../types";
import { DateUtils_formatYYYYMMDD } from "../utils/date";
import {
  ILiftographEngineResult,
  ILiftographSeriesResult,
  ILiftographWidgetResult,
} from "../liftograph/liftographEngine";
import { LiftographMuscles_sections } from "../liftograph/liftographMuscles";
import { ILiftographWindow } from "../liftograph/liftographShape";
import { Muscle_getMuscleGroupName } from "./muscle";
import { DashboardApi_compileErrors, IDashboardApiDetail } from "./dashboardApi";

export const DashboardPreview_maxMuscleGroups = 12;

export interface IDashboardPreviewPoint {
  x: number | string;
  y: number;
}

export type IDashboardPreviewSeries =
  | {
      name?: string;
      status: "ready";
      pointCount: number;
      unit?: string;
      first?: IDashboardPreviewPoint;
      last?: IDashboardPreviewPoint;
    }
  | { name?: string; status: "error"; message: string };

export interface IDashboardPreviewWindow {
  from: string;
  to: string;
}

interface IDashboardPreviewBase {
  row: number;
  rowCaption?: string;
  caption?: string;
}

export type IDashboardPreviewWidget = IDashboardPreviewBase &
  (
    | { kind: "graph"; xMode: "time" | "number" | "unknown"; series: IDashboardPreviewSeries[] }
    | {
        kind: "value";
        name?: string;
        value?: number;
        delta?: number;
        unit?: string;
        isEmpty: boolean;
        error?: string;
      }
    | {
        kind: "muscles";
        window: IDashboardPreviewWindow;
        unit: "sets/week";
        groups: { key: string; name: string; sets: number }[];
        truncated: boolean;
      }
    | { kind: "calendar"; window: IDashboardPreviewWindow; total: number; streakWeeks: number }
    | { kind: "text"; markdown: string }
    | { kind: "unsupported" | "error"; message: string }
  );

export interface IDashboardPreview {
  evaluatedAt: string;
  errors: IDashboardApiDetail[];
  widgets: IDashboardPreviewWidget[];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function windowOf(window: ILiftographWindow): IDashboardPreviewWindow {
  return { from: DateUtils_formatYYYYMMDD(window.from), to: DateUtils_formatYYYYMMDD(window.to) };
}

function series(result: ILiftographSeriesResult): IDashboardPreviewSeries {
  if (result.status === "error") {
    return { name: result.name, status: "error", message: result.message };
  }
  const { points, xMode, y } = result.points;
  const point = (p: { x: number; y: number } | undefined): IDashboardPreviewPoint | undefined =>
    p == null ? undefined : { x: xMode === "time" ? DateUtils_formatYYYYMMDD(p.x) : p.x, y: round(p.y) };
  return {
    name: result.spec.name,
    status: "ready",
    pointCount: points.length,
    unit: y.unit,
    first: point(points[0]),
    last: point(points[points.length - 1]),
  };
}

function widget(
  item: ILiftographWidgetResult,
  row: number,
  rowCaption: string | undefined,
  settings: ISettings
): IDashboardPreviewWidget {
  const base = { row, rowCaption, caption: item.widget.caption };
  if (item.type === "graph") {
    const compiled = item.widget.series.find((s) => s.status === "ready");
    const xMode = compiled?.status === "ready" ? compiled.spec.xMode : "unknown";
    return { ...base, kind: "graph", xMode, series: item.series.map(series) };
  } else if (item.type === "value") {
    const value = item.value?.value;
    return {
      ...base,
      kind: "value",
      name: item.widget.series.name,
      value: value != null ? round(value) : undefined,
      delta: item.value?.compare != null ? round(item.value.compare) : undefined,
      unit: item.value?.axis.unit,
      isEmpty: value == null,
      error: item.error?.message,
    };
  } else if (item.type === "muscles") {
    const rows = LiftographMuscles_sections(item.widget, item.muscles, settings).flat();
    const groups = rows
      .map((r) => ({
        key: r.muscleGroup,
        name: Muscle_getMuscleGroupName(r.muscleGroup, settings),
        sets: round(r.split.strength + r.split.hypertrophy),
      }))
      .sort((a, b) => b.sets - a.sets);
    return {
      ...base,
      kind: "muscles",
      window: windowOf(item.muscles.window),
      unit: "sets/week",
      groups: groups.slice(0, DashboardPreview_maxMuscleGroups),
      truncated: groups.length > DashboardPreview_maxMuscleGroups,
    };
  } else if (item.type === "calendar") {
    return {
      ...base,
      kind: "calendar",
      window: windowOf(item.calendar.window),
      total: item.calendar.total,
      streakWeeks: item.calendar.streakWeeks,
    };
  }
  const { widget: staticWidget } = item;
  return staticWidget.kind === "text"
    ? { ...base, kind: "text", markdown: staticWidget.markdown }
    : { ...base, kind: staticWidget.kind, message: staticWidget.message };
}

export function DashboardPreview_summarize(
  text: string,
  result: ILiftographEngineResult,
  settings: ISettings,
  now: number
): IDashboardPreview {
  return {
    evaluatedAt: new Date(now).toISOString(),
    errors: DashboardApi_compileErrors(text, settings),
    widgets: result.layout.flatMap((row, index) =>
      row.items.map((item) => widget(item, index + 1, row.caption, settings))
    ),
  };
}
