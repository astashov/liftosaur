import {
  ILiftographArg,
  ILiftographAtom,
  ILiftographDocument,
  ILiftographPair,
  ILiftographScriptNode,
  ILiftographSpan,
  ILiftographValue,
  ILiftographWidgetItem,
  LiftographDocument_parse,
  LiftographDocument_valueText,
} from "./liftographDocument";
import { ILiftographAgg, LiftographCompile_aggs, LiftographCompile_duration } from "./liftographCompile";
import { Exercise_resolveNameAndEquipmentParts } from "../models/exercise";
import { IAllCustomExercises, IExerciseType } from "../types";
import { ILiftographPresetName, LiftographPresets_isName, liftographPresets } from "./liftographPresets";
import { LiftographScriptSyntax_pointArity } from "./liftographScriptSyntax";
import { LiftographWrite_quote, LiftographWrite_quoted } from "./liftographWrite";
import { parser as liftoscriptParser } from "../liftoscript";
import { LiftographPalette_names } from "./liftographPalette";

export interface ILiftographModelRaw {
  type: "raw";
  text: string;
}
export type ILiftographModelDay = { type: "number"; value: number } | { type: "name"; value: string };
export type ILiftographModelSource =
  | {
      type: "exercise";
      name?: string;
      equipment?: string;
      label?: string;
      program?: string;
      day?: ILiftographModelDay;
    }
  | { type: "workout"; program?: string; day?: ILiftographModelDay }
  | { type: "stats"; key: string }
  | ILiftographModelRaw;
export type ILiftographModelValues =
  | { type: "preset"; preset: ILiftographPresetName; arg?: string }
  | { type: "script"; text: string }
  | ILiftographModelRaw;
export type ILiftographModelAgg = { type: "agg"; agg: ILiftographAgg; window?: string } | ILiftographModelRaw;
export interface ILiftographModelPair {
  key: string;
  text: string;
}

export interface ILiftographModelSeries {
  name?: string;
  source?: ILiftographModelSource;
  values?: ILiftographModelValues;
  group?: ILiftographModelAgg;
  smooth?: ILiftographModelAgg;
  mark?: "line" | "bars" | "dots";
  axis?: "left" | "right";
  color?: string;
  extra: ILiftographModelPair[];
}
export type ILiftographModelEntry = { type: "series"; series: ILiftographModelSeries } | { type: "line"; text: string };
export interface ILiftographModelShow {
  type: "show";
  map: boolean;
  sets: boolean;
  groups?: string[];
}

export type ILiftographWidgetModel =
  | { kind: "graph"; range?: string; entries: ILiftographModelEntry[]; extra: ILiftographModelPair[] }
  | { kind: "value"; series: ILiftographModelSeries; compare?: string; trend?: string }
  | {
      kind: "muscles";
      range?: string;
      show?: ILiftographModelShow | ILiftographModelRaw;
      source?: ILiftographModelSource;
      extra: ILiftographModelPair[];
    }
  | { kind: "calendar"; range?: string; extra: ILiftographModelPair[] };
export interface ILiftographModelFormat {
  eol: string;
  indent: string;
}

const BLOCK_INDENT = "  ";
const MARKS: readonly NonNullable<ILiftographModelSeries["mark"]>[] = ["line", "bars", "dots"];
const AXES: readonly NonNullable<ILiftographModelSeries["axis"]>[] = ["left", "right"];

function slice(text: string, span: ILiftographSpan): string {
  return text.slice(span.from, span.to);
}

function valueSource(text: string, pair: ILiftographPair): string {
  return pair.value != null ? slice(text, pair.value.span) : "";
}

function isClosed(value: ILiftographValue): boolean {
  return value.type === "call" || value.type === "quoted" ? value.isClosed : true;
}

function singleAtom(value: ILiftographValue | undefined): ILiftographAtom | undefined {
  return value?.type === "atoms" && value.atoms.length === 1 ? value.atoms[0] : undefined;
}

function plainText(value: ILiftographValue | undefined): string | undefined {
  if (value == null || !isClosed(value) || (value.type !== "atoms" && value.type !== "quoted")) {
    return undefined;
  }
  return LiftographDocument_valueText(value);
}

interface ICall {
  name: string;
  args: ILiftographArg[];
}

function callOf(value: ILiftographValue | undefined): ICall | undefined {
  if (value?.type === "call") {
    return value.isClosed ? { name: value.name.text, args: value.args } : undefined;
  }
  const atom = singleAtom(value);
  return atom?.kind === "identifier" ? { name: atom.text, args: [] } : undefined;
}

interface IFilters {
  words: string[];
  label?: string;
  program?: string;
  day?: ILiftographModelDay;
}

function filtersOf(args: ILiftographArg[]): IFilters | undefined {
  const result: IFilters = { words: [] };
  for (const arg of args) {
    const text = plainText(arg.value);
    if (text == null) {
      return undefined;
    }
    if (arg.type === "positional") {
      result.words.push(text);
    } else if (arg.key.text === "label") {
      result.label = text;
    } else if (arg.key.text === "program") {
      result.program = text;
    } else if (arg.key.text === "day") {
      const atom = singleAtom(arg.value);
      const day = atom?.kind === "number" ? Number(atom.text) : undefined;
      result.day =
        day != null && Number.isInteger(day) ? { type: "number", value: day } : { type: "name", value: text };
    } else {
      return undefined;
    }
  }
  return result;
}

function readSource(text: string, pair: ILiftographPair): ILiftographModelSource {
  const raw: ILiftographModelRaw = { type: "raw", text: valueSource(text, pair) };
  const call = callOf(pair.value);
  if (call == null) {
    return raw;
  }
  if (call.name === "stats") {
    const [first, ...rest] = call.args;
    const key = first?.type === "positional" ? plainText(first.value) : undefined;
    return key != null && rest.length === 0 ? { type: "stats", key } : raw;
  }
  const filters = filtersOf(call.args);
  if (filters == null) {
    return raw;
  }
  const { words, label, ...where } = filters;
  if (call.name === "exercise" && words.length <= 2) {
    const [name, equipment] = words;
    return {
      type: "exercise",
      ...(name != null ? { name } : {}),
      ...(equipment != null ? { equipment } : {}),
      ...(label != null ? { label } : {}),
      ...where,
    };
  } else if (call.name === "workout" && words.length === 0 && label == null) {
    return { type: "workout", ...where };
  }
  return raw;
}

function readValues(text: string, pair: ILiftographPair): ILiftographModelValues {
  const call = callOf(pair.value);
  if (call == null || !LiftographPresets_isName(call.name)) {
    return { type: "raw", text: valueSource(text, pair) };
  }
  const [first, ...rest] = call.args;
  const arg = first?.type === "positional" ? plainText(first.value) : undefined;
  if (rest.length > 0 || (first != null && arg == null)) {
    return { type: "raw", text: valueSource(text, pair) };
  }
  return arg != null ? { type: "preset", preset: call.name, arg } : { type: "preset", preset: call.name };
}

function readAgg(text: string, pair: ILiftographPair): ILiftographModelAgg {
  const raw: ILiftographModelRaw = { type: "raw", text: valueSource(text, pair) };
  const call = callOf(pair.value);
  const agg = LiftographCompile_aggs.find((a) => a === call?.name);
  if (call == null || agg == null || call.args.length > 1) {
    return raw;
  }
  const [first] = call.args;
  if (first == null) {
    return { type: "agg", agg };
  }
  const atom = first.type === "positional" ? singleAtom(first.value) : undefined;
  return atom != null ? { type: "agg", agg, window: atom.text } : raw;
}

function enumOf<T extends string>(value: ILiftographValue | undefined, options: readonly T[]): T | undefined {
  const atom = singleAtom(value);
  return options.find((option) => option === atom?.text);
}

function withExtra(extra: ILiftographModelPair[], text: string, pair: ILiftographPair): ILiftographModelPair[] {
  return [...extra.filter((p) => p.key !== pair.key), { key: pair.key, text: valueSource(text, pair) }];
}

function seriesField(
  series: ILiftographModelSeries,
  text: string,
  pair: ILiftographPair
): ILiftographModelSeries | undefined {
  switch (pair.key) {
    case "name": {
      const name = plainText(pair.value);
      return name != null ? { ...series, name } : undefined;
    }
    case "source":
      return { ...series, source: readSource(text, pair) };
    case "y":
      return { ...series, values: readValues(text, pair) };
    case "group":
      return { ...series, group: readAgg(text, pair) };
    case "smooth":
      return { ...series, smooth: readAgg(text, pair) };
    case "mark": {
      const mark = enumOf(pair.value, MARKS);
      return mark != null ? { ...series, mark } : undefined;
    }
    case "axis": {
      const axis = enumOf(pair.value, AXES);
      return axis != null ? { ...series, axis } : undefined;
    }
    case "color": {
      const color = plainText(pair.value);
      return color != null ? { ...series, color } : undefined;
    }
    default:
      return undefined;
  }
}

function withoutField(series: ILiftographModelSeries, key: string): ILiftographModelSeries {
  switch (key) {
    case "name":
      return { ...series, name: undefined };
    case "y":
      return { ...series, values: undefined };
    case "mark":
      return { ...series, mark: undefined };
    case "axis":
      return { ...series, axis: undefined };
    case "color":
      return { ...series, color: undefined };
    default:
      return series;
  }
}

function readSeries(
  text: string,
  pairs: ILiftographPair[],
  script: ILiftographScriptNode | undefined
): ILiftographModelSeries | undefined {
  let series: ILiftographModelSeries = { extra: [] };
  for (const pair of pairs) {
    const extra = series.extra.filter((p) => p.key !== pair.key);
    const next = pair.value != null && isClosed(pair.value) ? seriesField(series, text, pair) : undefined;
    series =
      next != null ? { ...next, extra } : { ...withoutField(series, pair.key), extra: withExtra(extra, text, pair) };
  }
  if (script != null) {
    if (series.values != null) {
      return undefined;
    }
    series = { ...series, values: { type: "script", text: script.text } };
  }
  return series;
}

function readShow(
  value: ILiftographValue | undefined,
  raw: ILiftographModelRaw
): ILiftographModelShow | ILiftographModelRaw {
  const items = value?.type === "list" ? value.items : value != null && callOf(value) != null ? [value] : [];
  const show: ILiftographModelShow = { type: "show", map: false, sets: false };
  for (const item of items) {
    const call = item.type === "atom" ? { name: item.atom.text, args: [] } : callOf(item);
    if (call?.name === "map" && call.args.length === 0) {
      show.map = true;
    } else if (call?.name === "sets") {
      show.sets = true;
      const groups = call.args.map((arg) => (arg.type === "positional" ? plainText(arg.value) : undefined));
      if (groups.some((group) => group == null)) {
        return raw;
      }
      show.groups = groups.length > 0 ? groups.flatMap((group) => (group != null ? [group] : [])) : undefined;
    } else {
      return raw;
    }
  }
  return show.map || show.sets ? show : raw;
}

interface IWidgetKeys {
  known: Partial<Record<string, ILiftographPair>>;
  extra: ILiftographModelPair[];
}

function widgetKeys(text: string, pairs: ILiftographPair[], keys: readonly string[]): IWidgetKeys {
  const result: IWidgetKeys = { known: {}, extra: [] };
  for (const pair of pairs) {
    if (keys.indexOf(pair.key) !== -1 && pair.value != null && isClosed(pair.value)) {
      result.known[pair.key] = pair;
      result.extra = result.extra.filter((p) => p.key !== pair.key);
    } else {
      delete result.known[pair.key];
      result.extra = withExtra(result.extra, text, pair);
    }
  }
  return result;
}

function rawOf(text: string, pair: ILiftographPair | undefined): string | undefined {
  return pair != null ? valueSource(text, pair) : undefined;
}

function graphEntries(doc: ILiftographDocument, widget: ILiftographWidgetItem): ILiftographModelEntry[] | undefined {
  const text = doc.text;
  const lines = doc.lines.filter((line) => line.owner === "graph" && line.widget === widget);
  const entries: ILiftographModelEntry[] = [];
  for (const line of lines) {
    if (line.span.to === widget.span.to) {
      continue;
    }
    const node = widget.series.find((s) => s.span.from === line.span.from);
    if (node == null) {
      entries.push({ type: "line", text: slice(text, line.span).trimStart() });
      continue;
    }
    const series = readSeries(text, node.pairs, node.script);
    if (series == null) {
      return undefined;
    }
    entries.push({ type: "series", series });
  }
  return entries;
}

export function LiftographWidgetModel_read(snippet: string): ILiftographWidgetModel | undefined {
  const doc = LiftographDocument_parse(snippet);
  const [item, ...rest] = doc.items;
  if (item?.type !== "widget" || rest.length > 0 || doc.diagnostics.length > 0) {
    return undefined;
  }
  const blocked = item.hasBlock && item.kind !== "graph";
  if (blocked || (item.script != null && item.kind !== "value")) {
    return undefined;
  }
  if (item.kind === "graph") {
    const keys = widgetKeys(snippet, item.pairs, ["range"]);
    const entries = graphEntries(doc, item);
    return entries != null
      ? { kind: "graph", range: rawOf(snippet, keys.known.range), entries, extra: keys.extra }
      : undefined;
  } else if (item.kind === "value") {
    const isValueKey = (p: ILiftographPair): boolean => p.key === "compare" || p.key === "trend";
    const keys = widgetKeys(snippet, item.pairs.filter(isValueKey), ["compare", "trend"]);
    const series = readSeries(
      snippet,
      item.pairs.filter((p) => !isValueKey(p)),
      item.script
    );
    return series != null
      ? {
          kind: "value",
          series: { ...series, extra: [...series.extra, ...keys.extra] },
          compare: rawOf(snippet, keys.known.compare),
          trend: rawOf(snippet, keys.known.trend),
        }
      : undefined;
  } else if (item.kind === "muscles") {
    const keys = widgetKeys(snippet, item.pairs, ["range", "show", "source"]);
    const show = keys.known.show;
    const source = keys.known.source;
    return {
      kind: "muscles",
      range: rawOf(snippet, keys.known.range),
      show: show != null ? readShow(show.value, { type: "raw", text: valueSource(snippet, show) }) : undefined,
      source: source != null ? readSource(snippet, source) : undefined,
      extra: keys.extra,
    };
  } else if (item.kind === "calendar") {
    const keys = widgetKeys(snippet, item.pairs, ["range"]);
    return { kind: "calendar", range: rawOf(snippet, keys.known.range), extra: keys.extra };
  }
  return undefined;
}

function writeDay(day: ILiftographModelDay): string {
  return day.type === "number" ? `${day.value}` : LiftographWrite_quoted(day.value);
}

function writeCall(name: string, args: string[]): string {
  return args.length > 0 ? `${name}(${args.join(", ")})` : name;
}

function filterArgs(source: { program?: string; day?: ILiftographModelDay; label?: string }): string[] {
  return [
    ...(source.label != null ? [`label: ${LiftographWrite_quote(source.label)}`] : []),
    ...(source.program != null ? [`program: ${LiftographWrite_quote(source.program)}`] : []),
    ...(source.day != null ? [`day: ${writeDay(source.day)}`] : []),
  ];
}

function writeSource(source: ILiftographModelSource): string {
  switch (source.type) {
    case "raw":
      return source.text;
    case "stats":
      return `stats(${LiftographWrite_quote(source.key)})`;
    case "workout":
      return writeCall("workout", filterArgs(source));
    case "exercise": {
      const words = [source.name, source.equipment].flatMap((w) => (w != null ? [LiftographWrite_quote(w)] : []));
      return writeCall("exercise", [...words, ...filterArgs(source)]);
    }
  }
}

function writeAgg(agg: ILiftographModelAgg): string {
  return agg.type === "raw" ? agg.text : agg.window != null ? `${agg.agg}(${agg.window})` : agg.agg;
}

function defaultPreset(source: ILiftographModelSource | undefined): ILiftographPresetName | undefined {
  switch (source?.type) {
    case "exercise":
      return "maxWeight";
    case "workout":
      return "volume";
    case "stats":
      return "value";
    default:
      return undefined;
  }
}

function writeValues(series: ILiftographModelSeries): string | undefined {
  const values = series.values;
  if (values == null) {
    return defaultPreset(series.source);
  } else if (values.type === "raw") {
    return values.text;
  } else if (values.type === "preset") {
    return values.arg != null ? `${values.preset}(${LiftographWrite_quote(values.arg)})` : values.preset;
  }
  return undefined;
}

function pair(key: string, value: string | undefined): string[] {
  return value != null ? [`${key}: ${value}`] : [];
}

function seriesFields(series: ILiftographModelSeries): string[] {
  return [
    ...pair("name", series.name != null ? LiftographWrite_quote(series.name) : undefined),
    ...pair("source", series.source != null ? writeSource(series.source) : undefined),
    ...pair("y", writeValues(series)),
    ...pair("group", series.group != null ? writeAgg(series.group) : undefined),
    ...pair("smooth", series.smooth != null ? writeAgg(series.smooth) : undefined),
    ...pair("mark", series.mark),
    ...pair("axis", series.axis),
    ...pair("color", series.color != null ? LiftographWrite_quote(series.color) : undefined),
  ];
}

function extraFields(extra: ILiftographModelPair[]): string[] {
  return extra.map((p) => `${p.key}: ${p.text}`);
}

function scriptTail(series: ILiftographModelSeries): string {
  return series.values?.type === "script" ? ` {~${series.values.text}~}` : "";
}

function line(fields: string[], tail: string = ""): string {
  return fields.join(" / ") + tail;
}

function writeShow(show: ILiftographModelShow | ILiftographModelRaw): string {
  if (show.type === "raw") {
    return show.text;
  }
  const sets = show.groups != null && show.groups.length > 0 ? `sets(${show.groups.join(", ")})` : "sets";
  return [...(show.map ? ["map"] : []), ...(show.sets ? [sets] : [])].join(", ");
}

export function LiftographWidgetModel_write(model: ILiftographWidgetModel, format: ILiftographModelFormat): string {
  const indent = format.indent;
  switch (model.kind) {
    case "graph": {
      const head = indent + line(["graph", ...pair("range", model.range), ...extraFields(model.extra)]) + " {";
      const body = model.entries.map((entry) =>
        entry.type === "line" && entry.text === ""
          ? ""
          : indent +
            BLOCK_INDENT +
            (entry.type === "line"
              ? entry.text
              : line([...seriesFields(entry.series), ...extraFields(entry.series.extra)], scriptTail(entry.series)))
      );
      return [head, ...body, `${indent}}`].join(format.eol);
    }
    case "value":
      return (
        indent +
        line(
          [
            "value",
            ...seriesFields(model.series),
            ...pair("compare", model.compare),
            ...pair("trend", model.trend),
            ...extraFields(model.series.extra),
          ],
          scriptTail(model.series)
        )
      );
    case "muscles":
      return (
        indent +
        line([
          "muscles",
          ...pair("range", model.range),
          ...pair("show", model.show != null ? writeShow(model.show) : undefined),
          ...pair("source", model.source != null ? writeSource(model.source) : undefined),
          ...extraFields(model.extra),
        ])
      );
    case "calendar":
      return indent + line(["calendar", ...pair("range", model.range), ...extraFields(model.extra)]);
  }
}

export function LiftographWidgetModel_newSeries(): ILiftographModelSeries {
  return { name: "New series", source: { type: "exercise", name: "Squat" }, extra: [] };
}

export function LiftographWidgetModel_presetsFor(source: ILiftographModelSource | undefined): ILiftographPresetName[] {
  if (source == null || source.type === "raw") {
    return [];
  }
  return Object.values(liftographPresets)
    .filter((preset) => preset.sources.indexOf(source.type) !== -1)
    .map((preset) => preset.name);
}

export function LiftographWidgetModel_setSource(
  series: ILiftographModelSeries,
  source: ILiftographModelSource
): ILiftographModelSeries {
  const values = series.values;
  const isAllowed =
    values?.type !== "preset" ||
    source.type === "raw" ||
    LiftographWidgetModel_presetsFor(source).indexOf(values.preset) !== -1;
  return { ...series, source, values: isAllowed ? values : undefined };
}

export function LiftographWidgetModel_isNumeric(series: ILiftographModelSeries): boolean {
  const values = series.values;
  if (values?.type !== "script") {
    return false;
  }
  return LiftographScriptSyntax_pointArity(liftoscriptParser.parse(values.text), values.text).has(2);
}

function mapEntries(
  model: ILiftographWidgetModel,
  fn: (entries: ILiftographModelEntry[]) => ILiftographModelEntry[]
): ILiftographWidgetModel {
  return model.kind === "graph" ? { ...model, entries: fn(model.entries) } : model;
}

export function LiftographWidgetModel_addSeries(
  model: ILiftographWidgetModel,
  series: ILiftographModelSeries
): ILiftographWidgetModel {
  return mapEntries(model, (entries) => [...entries, { type: "series", series }]);
}

function autoColor(position: number): string {
  return LiftographPalette_names[position % LiftographPalette_names.length];
}

function keepingColors(
  entries: ILiftographModelEntry[],
  change: (entries: ILiftographModelEntry[]) => ILiftographModelEntry[]
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

export function LiftographWidgetModel_removeSeries(
  model: ILiftographWidgetModel,
  entryIndex: number
): ILiftographWidgetModel {
  return mapEntries(model, (entries) => keepingColors(entries, (all) => all.filter((_entry, i) => i !== entryIndex)));
}

export function LiftographWidgetModel_setSeries(
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

export function LiftographWidgetModel_seriesIndices(model: ILiftographWidgetModel): number[] {
  return model.kind === "graph" ? model.entries.flatMap((entry, i) => (entry.type === "series" ? [i] : [])) : [];
}

export function LiftographWidgetModel_moveSeries(
  model: ILiftographWidgetModel,
  from: number,
  to: number
): ILiftographWidgetModel {
  const indices = LiftographWidgetModel_seriesIndices(model);
  if (from === to || indices[from] == null || indices[to] == null) {
    return model;
  }
  return mapEntries(model, (entries) =>
    keepingColors(entries, (all) => {
      const order = indices.map((i) => all[i]);
      const [moved] = order.splice(from, 1);
      order.splice(to, 0, moved);
      const result = [...all];
      indices.forEach((entryIndex, i) => {
        result[entryIndex] = order[i];
      });
      return result;
    })
  );
}

export function LiftographWidgetModel_withExercise(
  source: ILiftographModelSource | undefined,
  name: string,
  equipment: string | undefined
): ILiftographModelSource {
  const filters =
    source?.type === "exercise"
      ? {
          ...(source.label != null ? { label: source.label } : {}),
          ...(source.program != null ? { program: source.program } : {}),
          ...(source.day != null ? { day: source.day } : {}),
        }
      : {};
  return { type: "exercise", name, ...(equipment != null ? { equipment } : {}), ...filters };
}

export function LiftographWidgetModel_seriesAt(
  model: ILiftographWidgetModel,
  entryIndex: number
): ILiftographModelSeries | undefined {
  if (model.kind === "value") {
    return model.series;
  }
  const entry = model.kind === "graph" ? model.entries[entryIndex] : undefined;
  return entry?.type === "series" ? entry.series : undefined;
}

export function LiftographWidgetModel_pickExercise(
  model: ILiftographWidgetModel,
  entryIndex: number,
  name: string,
  equipment: string | undefined
): ILiftographWidgetModel {
  const series = LiftographWidgetModel_seriesAt(model, entryIndex);
  if (series == null) {
    return model;
  }
  const source = LiftographWidgetModel_withExercise(series.source, name, equipment);
  return LiftographWidgetModel_setSeries(model, entryIndex, LiftographWidgetModel_setSource(series, source));
}

export function LiftographWidgetModel_groupsFromText(text: string | undefined): string[] | undefined {
  const groups = (text ?? "")
    .split(",")
    .map((group) => group.trim())
    .filter((group) => group !== "");
  return groups.length > 0 ? groups : undefined;
}

export function LiftographWidgetModel_withAgg(
  current: ILiftographModelAgg | undefined,
  agg: ILiftographAgg | undefined,
  defaultWindow: string | undefined
): ILiftographModelAgg | undefined {
  if (agg == null) {
    return undefined;
  }
  const window = current?.type === "agg" ? current.window : defaultWindow;
  return window != null ? { type: "agg", agg, window } : { type: "agg", agg };
}

export function LiftographWidgetModel_dayFromText(text: string): ILiftographModelDay | undefined {
  const trimmed = text.trim();
  if (trimmed === "") {
    return undefined;
  }
  const probe = LiftographDocument_parse(`value / day: ${trimmed}`).items[0];
  const atom = singleAtom(probe?.type === "widget" ? probe.pairs[0]?.value : undefined);
  const n = atom?.kind === "number" ? Number(atom.text) : undefined;
  return n != null && Number.isInteger(n) ? { type: "number", value: n } : { type: "name", value: trimmed };
}

export function LiftographWidgetModel_dayText(day: ILiftographModelDay | undefined): string {
  return day == null ? "" : `${day.value}`;
}

export function LiftographWidgetModel_sourceLabel(source: ILiftographModelSource | undefined): string {
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

export function LiftographWidgetModel_exerciseType(
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

export type ILiftographModelAggField = "group" | "smooth";

const WINDOWS: Record<ILiftographModelAggField, string[]> = {
  group: ["1w", "2w", "1m", "3m"],
  smooth: ["3", "5", "10", "30d"],
};

export function LiftographWidgetModel_filterOptions(options: string[], current: string | undefined): string[] {
  return current != null && options.indexOf(current) === -1 ? [...options, current] : options;
}

export function LiftographWidgetModel_windows(field: ILiftographModelAggField, current: string | undefined): string[] {
  return LiftographWidgetModel_filterOptions(WINDOWS[field], current);
}

const AGG_WORDS: Record<ILiftographAgg, string> = {
  max: "the max",
  min: "the min",
  sum: "the sum",
  avg: "the average",
  last: "the last value",
  count: "the count",
};

const UNIT_WORDS: Record<"d" | "w" | "m" | "y", string> = { d: "day", w: "week", m: "month", y: "year" };

function windowAtom(window: string): ILiftographAtom | undefined {
  const probe = LiftographDocument_parse(`value / w: ${window}`).items[0];
  return singleAtom(probe?.type === "widget" ? probe.pairs[0]?.value : undefined);
}

function periodWords(window: string): string {
  const atom = windowAtom(window);
  const duration = atom != null ? LiftographCompile_duration(atom) : undefined;
  if (duration == null || duration === "all") {
    return window;
  }
  const unit = UNIT_WORDS[duration.unit];
  return duration.n === 1 ? unit : `${duration.n} ${unit}s`;
}

export function LiftographWidgetModel_aggHint(
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
  const atom = windowAtom(agg.window);
  const last = atom?.kind === "number" ? `${atom.text} points` : periodWords(agg.window);
  return `Each point becomes ${what} of the last ${last}.`;
}

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

export function LiftographWidgetModel_presetLabel(preset: ILiftographPresetName): string {
  return PRESET_LABELS[preset];
}

function valuesLabel(series: ILiftographModelSeries): string | undefined {
  const values = series.values;
  if (values == null) {
    const preset = defaultPreset(series.source);
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

export function LiftographWidgetModel_seriesSummary(series: ILiftographModelSeries): string {
  return [LiftographWidgetModel_sourceLabel(series.source), valuesLabel(series), groupLabel(series.group)]
    .filter((part): part is string => part != null)
    .join(" · ");
}

export function LiftographWidgetModel_splitOptions(
  options: string[],
  current: string | undefined,
  limit: number
): { visible: string[]; rest: string[] } {
  const visible = options.slice(0, limit);
  const rest = options.slice(limit).filter((option) => option !== current);
  const isHidden = current != null && visible.indexOf(current) === -1;
  return { visible: isHidden ? [...visible, current] : visible, rest };
}

const PICKER_FALLBACK: IExerciseType = { id: "squat", equipment: "barbell" };

export function LiftographWidgetModel_pickerExercise(
  model: ILiftographWidgetModel,
  entryIndex: number,
  exercises: IAllCustomExercises
): IExerciseType {
  const series = LiftographWidgetModel_seriesAt(model, entryIndex);
  return LiftographWidgetModel_exerciseType(series?.source, exercises) ?? PICKER_FALLBACK;
}
