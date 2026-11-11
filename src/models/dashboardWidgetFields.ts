import { IAllCustomExercises, IExerciseType, ISettings } from "../types";
import { Exercise_resolveNameAndEquipmentParts } from "./exercise";
import { Muscle_getAvailableMuscleGroups, Muscle_getMuscleGroupName } from "./muscle";
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

export type IDashboardValueField = "compare" | "trend";

const VALUE_DURATIONS: Record<IDashboardValueField, string[]> = {
  compare: ["1w", "4w", "3m", "1y"],
  trend: ["4w", "3m", "6m", "1y"],
};

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

function singleAtom(value: ILiftographValue | undefined): ILiftographAtom | undefined {
  return value?.type === "atoms" && value.atoms.length === 1 ? value.atoms[0] : undefined;
}

function probeAtom(key: string, text: string): ILiftographAtom | undefined {
  const probe = LiftographDocument_parse(`value / ${key}: ${text}`).items[0];
  const pairs = probe?.type === "widget" ? probe.pairs : [];
  return pairs.length === 1 ? singleAtom(pairs[0]?.value) : undefined;
}

function periodWords(window: string, isCounted: boolean = false): string {
  const atom = probeAtom("w", window);
  const duration = atom != null ? LiftographCompile_duration(atom) : undefined;
  if (duration == null || duration === "all") {
    return window;
  }
  const unit = UNIT_WORDS[duration.unit];
  if (duration.n === 1) {
    return isCounted ? `1 ${unit}` : unit;
  }
  return `${duration.n} ${unit}s`;
}

export function DashboardWidgetFields_durations(field: IDashboardValueField): string[] {
  return VALUE_DURATIONS[field];
}

export function DashboardWidgetFields_isCustom(options: string[], value: string | undefined): boolean {
  return value != null && options.indexOf(value) === -1;
}

export function DashboardWidgetFields_valueHint(field: IDashboardValueField, duration: string | undefined): string {
  if (field === "compare") {
    return duration == null
      ? "Shows only the current value."
      : `Shows the change since ${periodWords(duration, true)} ago, like "▲ 7.5 vs ${duration}".`;
  }
  return duration == null
    ? "No small chart under the number."
    : `Draws a small chart of the last ${periodWords(duration, true)} under the number.`;
}

export function DashboardWidgetFields_muscleGroups(settings: ISettings, hasTotal: boolean): string[] {
  const groups = Muscle_getAvailableMuscleGroups(settings);
  return hasTotal ? ["total", ...groups] : groups;
}

export function DashboardWidgetFields_muscleGroupLabel(group: string, settings: ISettings): string {
  return group === "total" ? "All muscles" : Muscle_getMuscleGroupName(group, settings);
}

export function DashboardWidgetFields_toggleGroup(
  groups: string[] | undefined,
  group: string,
  all: string[]
): string[] | undefined {
  const current = groups ?? [];
  if (current.indexOf(group) !== -1) {
    const removed = current.filter((g) => g !== group);
    return removed.length > 0 ? removed : undefined;
  }
  const added = [...current, group];
  return [...all.filter((g) => added.indexOf(g) !== -1), ...added.filter((g) => all.indexOf(g) === -1)];
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
): IExerciseType | undefined {
  const series = LiftographWidgetEdit_seriesAt(model, entryIndex);
  return DashboardWidgetFields_exerciseType(series?.source, exercises);
}

export function DashboardWidgetFields_windows(field: ILiftographModelAggField): string[] {
  return WINDOWS[field];
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
