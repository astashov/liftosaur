import { IAllCustomExercises, IExerciseType } from "../types";
import { Exercise_resolveNameAndEquipmentParts } from "./exercise";
import { ILiftographAtom, ILiftographValue, LiftographDocument_parse } from "../liftograph/liftographDocument";
import { ILiftographAgg, LiftographCompile_duration } from "../liftograph/liftographCompile";
import { ILiftographPresetName } from "../liftograph/liftographPresets";
import { LiftographScriptSyntax_pointArity } from "../liftograph/liftographScriptSyntax";
import { parser as liftoscriptParser } from "../liftoscript";
import {
  ILiftographModelAgg,
  ILiftographModelDay,
  ILiftographModelSeries,
  ILiftographModelSource,
  ILiftographWidgetModel,
  LiftographWidgetModel_defaultPreset,
} from "../liftograph/liftographWidgetModel";
import { ILiftographModelAggField, LiftographWidgetEdit_seriesAt } from "../liftograph/liftographWidgetEdit";

const WINDOWS: Record<ILiftographModelAggField, string[]> = {
  group: ["1w", "2w", "1m", "3m"],
  smooth: ["3", "5", "10", "30d"],
};

const AGG_WORDS: Record<ILiftographAgg, string> = {
  max: "the max",
  min: "the min",
  sum: "the sum",
  avg: "the average",
  last: "the last value",
  count: "the count",
};

const UNIT_WORDS: Record<"d" | "w" | "m" | "y", string> = { d: "day", w: "week", m: "month", y: "year" };

const PRESET_LABELS: Record<ILiftographPresetName, string> = {
  maxWeight: "Max weight",
  e1rm: "e1RM",
  volume: "Volume",
  maxReps: "Max reps",
  muscleSets: "Sets per muscle",
  muscleVolume: "Volume per muscle",
  duration: "Duration",
  value: "Value",
};

const PICKER_FALLBACK: IExerciseType = { id: "squat", equipment: "barbell" };

function singleAtom(value: ILiftographValue | undefined): ILiftographAtom | undefined {
  return value?.type === "atoms" && value.atoms.length === 1 ? value.atoms[0] : undefined;
}

function probeAtom(key: string, text: string): ILiftographAtom | undefined {
  const probe = LiftographDocument_parse(`value / ${key}: ${text}`).items[0];
  const pairs = probe?.type === "widget" ? probe.pairs : [];
  return pairs.length === 1 ? singleAtom(pairs[0]?.value) : undefined;
}

function periodWords(window: string): string {
  const atom = probeAtom("w", window);
  const duration = atom != null ? LiftographCompile_duration(atom) : undefined;
  if (duration == null || duration === "all") {
    return window;
  }
  const unit = UNIT_WORDS[duration.unit];
  return duration.n === 1 ? unit : `${duration.n} ${unit}s`;
}

export function DashboardWidgetFields_isNumeric(series: ILiftographModelSeries): boolean {
  const values = series.values;
  if (values?.type !== "script") {
    return false;
  }
  return LiftographScriptSyntax_pointArity(liftoscriptParser.parse(values.text), values.text).has(2);
}

export function DashboardWidgetFields_presetLabel(preset: ILiftographPresetName): string {
  return PRESET_LABELS[preset];
}

export function DashboardWidgetFields_sourceLabel(source: ILiftographModelSource | undefined): string {
  switch (source?.type) {
    case undefined:
      return "No source";
    case "raw":
      return source.text;
    case "stats":
      return source.key;
    case "workout":
      return "All workouts";
    case "exercise":
      return source.name == null ? "Any exercise" : [source.name, source.equipment].filter((w) => w != null).join(", ");
  }
}

function valuesLabel(series: ILiftographModelSeries): string | undefined {
  const values = series.values;
  if (values == null) {
    const preset = LiftographWidgetModel_defaultPreset(series.source);
    return preset != null ? PRESET_LABELS[preset] : undefined;
  } else if (values.type === "preset") {
    return values.arg != null ? `${PRESET_LABELS[values.preset]} (${values.arg})` : PRESET_LABELS[values.preset];
  } else if (values.type === "script") {
    return "Custom script";
  }
  return values.text;
}

function groupLabel(group: ILiftographModelAgg | undefined): string | undefined {
  if (group == null) {
    return undefined;
  } else if (group.type === "raw") {
    return group.text;
  }
  return group.window != null ? `${group.agg} per ${periodWords(group.window)}` : group.agg;
}

export function DashboardWidgetFields_seriesSummary(series: ILiftographModelSeries): string {
  return [DashboardWidgetFields_sourceLabel(series.source), valuesLabel(series), groupLabel(series.group)]
    .filter((part): part is string => part != null)
    .join(" · ");
}

export function DashboardWidgetFields_dayFromText(text: string): ILiftographModelDay | undefined {
  const trimmed = text.trim();
  if (trimmed === "") {
    return undefined;
  }
  const atom = probeAtom("day", trimmed);
  const n = atom?.kind === "number" ? Number(atom.text) : undefined;
  return n != null && Number.isInteger(n) ? { type: "number", value: n } : { type: "name", value: trimmed };
}

export function DashboardWidgetFields_dayText(day: ILiftographModelDay | undefined): string {
  return day == null ? "" : `${day.value}`;
}

export function DashboardWidgetFields_textValue(text: string): string | undefined {
  return text.trim() === "" ? undefined : text;
}

export function DashboardWidgetFields_groupsFromText(text: string | undefined): string[] | undefined {
  const groups = (text ?? "")
    .split(",")
    .map((group) => group.trim())
    .filter((group) => group !== "");
  return groups.length > 0 ? groups : undefined;
}

export function DashboardWidgetFields_exerciseType(
  source: ILiftographModelSource | undefined,
  exercises: IAllCustomExercises
): IExerciseType | undefined {
  if (source?.type !== "exercise" || source.name == null) {
    return undefined;
  }
  const parts = source.equipment != null ? [source.name, source.equipment] : [source.name];
  const resolved = Exercise_resolveNameAndEquipmentParts(parts, exercises);
  if (resolved == null) {
    return undefined;
  }
  const equipment = resolved.exercise.equipment ?? resolved.exercise.defaultEquipment;
  return equipment != null ? { id: resolved.exercise.id, equipment } : { id: resolved.exercise.id };
}

export function DashboardWidgetFields_pickerExercise(
  model: ILiftographWidgetModel,
  entryIndex: number,
  exercises: IAllCustomExercises
): IExerciseType {
  const series = LiftographWidgetEdit_seriesAt(model, entryIndex);
  return DashboardWidgetFields_exerciseType(series?.source, exercises) ?? PICKER_FALLBACK;
}

export function DashboardWidgetFields_windows(field: ILiftographModelAggField, current: string | undefined): string[] {
  const windows = WINDOWS[field];
  return current != null && windows.indexOf(current) === -1 ? [...windows, current] : windows;
}

export function DashboardWidgetFields_splitOptions(
  options: string[],
  current: string | undefined,
  limit: number
): { visible: string[]; rest: string[] } {
  const visible = options.slice(0, limit);
  const rest = options.slice(limit).filter((option) => option !== current);
  const isHidden = current != null && visible.indexOf(current) === -1;
  return { visible: isHidden ? [...visible, current] : visible, rest };
}

export function DashboardWidgetFields_aggHint(
  field: ILiftographModelAggField,
  agg: ILiftographModelAgg | undefined
): string {
  if (agg == null) {
    return field === "group" ? "One point per workout." : "No smoothing, the line follows every point.";
  }
  if (agg.type === "raw") {
    return "";
  }
  const what = AGG_WORDS[agg.agg];
  if (agg.window == null) {
    return field === "group" ? `One point per x value: ${what} of the points there.` : "";
  }
  if (field === "group") {
    return `One point per ${periodWords(agg.window)}: ${what} of that period.`;
  }
  const atom = probeAtom("w", agg.window);
  const last = atom?.kind === "number" ? `${atom.text} points` : periodWords(agg.window);
  return `Each point becomes ${what} of the last ${last}.`;
}
