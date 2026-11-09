import { ILiftographAgg } from "./liftographCompile";
import { ILiftographPresetName, liftographPresets } from "./liftographPresets";
import { LiftographPalette_names } from "./liftographPalette";
import {
  ILiftographModelAgg,
  ILiftographModelDay,
  ILiftographModelEntry,
  ILiftographModelSeries,
  ILiftographModelSource,
  ILiftographModelValues,
  ILiftographWidgetModel,
} from "./liftographWidgetModel";

export type ILiftographModelAggField = "group" | "smooth";
export type ILiftographSourceKind = "exercise" | "workout" | "stats";
export type ILiftographSourceChoice =
  | { type: "none" }
  | { type: "pickExercise" }
  | { type: "set"; series: ILiftographModelSeries };

const DEFAULT_WINDOWS: Record<ILiftographModelAggField, string> = { group: "1w", smooth: "5" };
const DEFAULT_STAT = "weight";
const DEFAULT_MUSCLE_GROUP = "total";

export function LiftographWidgetEdit_newSeries(): ILiftographModelSeries {
  return { name: "New series", source: { type: "exercise", name: "Squat" }, extra: [] };
}

export function LiftographWidgetEdit_presetsFor(source: ILiftographModelSource | undefined): ILiftographPresetName[] {
  if (source == null || source.type === "raw") {
    return [];
  }
  return Object.values(liftographPresets)
    .filter((preset) => preset.sources.indexOf(source.type) !== -1)
    .map((preset) => preset.name);
}

export function LiftographWidgetEdit_setSource(
  series: ILiftographModelSeries,
  source: ILiftographModelSource
): ILiftographModelSeries {
  const values = series.values;
  const isAllowed =
    values?.type !== "preset" ||
    source.type === "raw" ||
    LiftographWidgetEdit_presetsFor(source).indexOf(values.preset) !== -1;
  return { ...series, source, values: isAllowed ? values : undefined };
}

export function LiftographWidgetEdit_chooseSource(
  series: ILiftographModelSeries,
  kind: ILiftographSourceKind
): ILiftographSourceChoice {
  if (series.source?.type === kind) {
    return { type: "none" };
  } else if (kind === "exercise") {
    return { type: "pickExercise" };
  }
  const source: ILiftographModelSource =
    kind === "workout" ? { type: "workout", ...programAndDay(series.source) } : { type: "stats", key: DEFAULT_STAT };
  return { type: "set", series: LiftographWidgetEdit_setSource(series, source) };
}

export function LiftographWidgetEdit_withPreset(
  values: ILiftographModelValues | undefined,
  preset: ILiftographPresetName
): ILiftographModelValues {
  if (!liftographPresets[preset].hasArg) {
    return { type: "preset", preset };
  }
  const arg = values?.type === "preset" ? values.arg : undefined;
  return { type: "preset", preset, arg: arg ?? DEFAULT_MUSCLE_GROUP };
}

export function LiftographWidgetEdit_withAgg(
  current: ILiftographModelAgg | undefined,
  agg: ILiftographAgg | undefined,
  field: ILiftographModelAggField
): ILiftographModelAgg | undefined {
  if (agg == null) {
    return undefined;
  }
  const window = current?.type === "agg" ? current.window : DEFAULT_WINDOWS[field];
  return window != null ? { type: "agg", agg, window } : { type: "agg", agg };
}

function mapEntries(
  model: ILiftographWidgetModel,
  fn: (entries: ILiftographModelEntry[]) => ILiftographModelEntry[]
): ILiftographWidgetModel {
  return model.kind === "graph" ? { ...model, entries: fn(model.entries) } : model;
}

function autoColor(position: number): string {
  return LiftographPalette_names[position % LiftographPalette_names.length];
}

function keepingColors(
  entries: ILiftographModelEntry[],
  change: (all: ILiftographModelEntry[]) => ILiftographModelEntry[]
): ILiftographModelEntry[] {
  const before = new Map<ILiftographModelSeries, string>();
  entries
    .flatMap((entry) => (entry.type === "series" ? [entry.series] : []))
    .forEach((series, position) => {
      if (series.color == null) {
        before.set(series, autoColor(position));
      }
    });
  let position = 0;
  return change(entries).map((entry) => {
    if (entry.type !== "series") {
      return entry;
    }
    const color = before.get(entry.series);
    const current = autoColor(position);
    position += 1;
    return color != null && color !== current ? { type: "series", series: { ...entry.series, color } } : entry;
  });
}

export function LiftographWidgetEdit_addSeries(
  model: ILiftographWidgetModel,
  series: ILiftographModelSeries
): ILiftographWidgetModel {
  return mapEntries(model, (entries) => [...entries, { type: "series", series }]);
}

export function LiftographWidgetEdit_removeSeries(
  model: ILiftographWidgetModel,
  entryIndex: number
): ILiftographWidgetModel {
  return mapEntries(model, (entries) => keepingColors(entries, (all) => all.filter((_entry, i) => i !== entryIndex)));
}

export function LiftographWidgetEdit_setSeries(
  model: ILiftographWidgetModel,
  entryIndex: number,
  series: ILiftographModelSeries
): ILiftographWidgetModel {
  if (model.kind === "value") {
    return { ...model, series };
  }
  return mapEntries(model, (entries) =>
    entries.map(
      (entry, i): ILiftographModelEntry =>
        i === entryIndex && entry.type === "series" ? { type: "series", series } : entry
    )
  );
}

export function LiftographWidgetEdit_seriesIndices(model: ILiftographWidgetModel): number[] {
  return model.kind === "graph" ? model.entries.flatMap((entry, i) => (entry.type === "series" ? [i] : [])) : [];
}

export function LiftographWidgetEdit_moveSeries(
  model: ILiftographWidgetModel,
  fromPosition: number,
  toPosition: number
): ILiftographWidgetModel {
  const indices = LiftographWidgetEdit_seriesIndices(model);
  if (fromPosition === toPosition || indices[fromPosition] == null || indices[toPosition] == null) {
    return model;
  }
  return mapEntries(model, (entries) =>
    keepingColors(entries, (all) => {
      const order = indices.map((i) => all[i]);
      const [moved] = order.splice(fromPosition, 1);
      order.splice(toPosition, 0, moved);
      const result = [...all];
      indices.forEach((entryIndex, i) => {
        result[entryIndex] = order[i];
      });
      return result;
    })
  );
}

export function LiftographWidgetEdit_seriesAt(
  model: ILiftographWidgetModel,
  entryIndex: number
): ILiftographModelSeries | undefined {
  if (model.kind === "value") {
    return model.series;
  }
  const entry = model.kind === "graph" ? model.entries[entryIndex] : undefined;
  return entry?.type === "series" ? entry.series : undefined;
}

function programAndDay(source: ILiftographModelSource | undefined): { program?: string; day?: ILiftographModelDay } {
  if (source?.type !== "exercise" && source?.type !== "workout") {
    return {};
  }
  return {
    ...(source.program != null ? { program: source.program } : {}),
    ...(source.day != null ? { day: source.day } : {}),
  };
}

function withExercise(
  source: ILiftographModelSource | undefined,
  name: string,
  equipment: string | undefined
): ILiftographModelSource {
  const filters = {
    ...(source?.type === "exercise" && source.label != null ? { label: source.label } : {}),
    ...programAndDay(source),
  };
  return { type: "exercise", name, ...(equipment != null ? { equipment } : {}), ...filters };
}

export function LiftographWidgetEdit_pickExercise(
  model: ILiftographWidgetModel,
  entryIndex: number,
  name: string,
  equipment: string | undefined
): ILiftographWidgetModel {
  const series = LiftographWidgetEdit_seriesAt(model, entryIndex);
  if (series == null) {
    return model;
  }
  const source = withExercise(series.source, name, equipment);
  return LiftographWidgetEdit_setSeries(model, entryIndex, LiftographWidgetEdit_setSource(series, source));
}
