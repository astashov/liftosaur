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
import { ILiftographAgg, LiftographCompile_aggs } from "./liftographCompile";
import { ILiftographPresetName, LiftographPresets_isName } from "./liftographPresets";
import { LiftographWrite_quote, LiftographWrite_quoted } from "./liftographWrite";

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
  const hasOutsideLines = doc.hiddenSpans.some((span) => span.from < item.span.from || span.to > item.span.to);
  if (item.caption != null || hasOutsideLines) {
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

export function LiftographWidgetModel_defaultPreset(
  source: ILiftographModelSource | undefined
): ILiftographPresetName | undefined {
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
    return LiftographWidgetModel_defaultPreset(series.source);
  } else if (values.type === "raw") {
    return values.text;
  } else if (values.type === "preset") {
    return values.arg != null ? `${values.preset}(${LiftographWrite_quote(values.arg)})` : values.preset;
  }
  return undefined;
}

function written(key: string, value: string | undefined): ILiftographModelPair[] {
  return value != null ? [{ key, text: value }] : [];
}

function seriesFields(series: ILiftographModelSeries): ILiftographModelPair[] {
  return [
    ...written("name", series.name != null ? LiftographWrite_quote(series.name) : undefined),
    ...written("source", series.source != null ? writeSource(series.source) : undefined),
    ...written("y", writeValues(series)),
    ...written("group", series.group != null ? writeAgg(series.group) : undefined),
    ...written("smooth", series.smooth != null ? writeAgg(series.smooth) : undefined),
    ...written("mark", series.mark),
    ...written("axis", series.axis),
    ...written("color", series.color != null ? LiftographWrite_quote(series.color) : undefined),
  ];
}

function withUnsetExtra(fields: ILiftographModelPair[], extra: ILiftographModelPair[]): ILiftographModelPair[] {
  return [...fields, ...extra.filter((p) => fields.every((field) => field.key !== p.key))];
}

function scriptTail(series: ILiftographModelSeries): string {
  return series.values?.type === "script" ? ` {~${series.values.text}~}` : "";
}

function joinLine(head: string, fields: ILiftographModelPair[], tail: string = ""): string {
  return [head, ...fields.map((field) => `${field.key}: ${field.text}`)].join(" / ") + tail;
}

function seriesLine(series: ILiftographModelSeries): string {
  const fields = withUnsetExtra(seriesFields(series), series.extra);
  const [first, ...rest] = fields;
  return first != null ? joinLine(`${first.key}: ${first.text}`, rest, scriptTail(series)) : scriptTail(series).trim();
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
      const head = indent + joinLine("graph", withUnsetExtra(written("range", model.range), model.extra)) + " {";
      const body = model.entries.map((entry) =>
        entry.type === "line" && entry.text === ""
          ? ""
          : indent + BLOCK_INDENT + (entry.type === "line" ? entry.text : seriesLine(entry.series))
      );
      return [head, ...body, `${indent}}`].join(format.eol);
    }
    case "value": {
      const fields = [
        ...seriesFields(model.series),
        ...written("compare", model.compare),
        ...written("trend", model.trend),
      ];
      return indent + joinLine("value", withUnsetExtra(fields, model.series.extra), scriptTail(model.series));
    }
    case "muscles": {
      const fields = [
        ...written("range", model.range),
        ...written("show", model.show != null ? writeShow(model.show) : undefined),
        ...written("source", model.source != null ? writeSource(model.source) : undefined),
      ];
      return indent + joinLine("muscles", withUnsetExtra(fields, model.extra));
    }
    case "calendar":
      return indent + joinLine("calendar", withUnsetExtra(written("range", model.range), model.extra));
  }
}
