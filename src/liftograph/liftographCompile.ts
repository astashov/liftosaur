import { Exercise_resolveNameAndEquipmentParts } from "../models/exercise";
import { ISettings, IStatsKey, statsLengthDef, statsPercentageDef, statsWeightDef } from "../types";
import {
  ILiftographArg,
  ILiftographAtom,
  ILiftographDiagnostic,
  ILiftographDocument,
  ILiftographListItem,
  ILiftographPair,
  ILiftographScriptNode,
  ILiftographSpan,
  ILiftographTextItem,
  ILiftographValue,
  ILiftographWidgetItem,
  LiftographDocument_valueText,
} from "./liftographDocument";
import { LiftographEnvironment_forSource } from "./liftographEnvironments";
import { parser as liftoscriptParser } from "../liftoscript";
import { ILiftographCompiledScript, LiftographFold_compileScript } from "./liftographFold";
import {
  ILiftographPresetName,
  LiftographPresets_fromScript,
  LiftographPresets_isName,
  liftographPresets,
} from "./liftographPresets";
import { ILiftographSource } from "./liftographRows";
import { LiftographScriptFns_muscleGroupKeys } from "./liftographScriptFns";
import { LiftographLayout_maxRowItems, LiftographLayout_minShare } from "./liftographLayout";

export type { ILiftographSource } from "./liftographRows";

export type ILiftographDuration = { n: number; unit: "d" | "w" | "m" | "y" } | "all";
export type ILiftographAgg = "max" | "min" | "sum" | "avg" | "last" | "count";
export type ILiftographSmoothAgg = Exclude<ILiftographAgg, "last">;

export interface ILiftographSeriesSpec {
  id: string;
  name?: string;
  source: ILiftographSource;
  values:
    | { type: "preset"; preset: ILiftographPresetName; arg?: string }
    | { type: "script"; script: ILiftographCompiledScript };
  xMode: "time" | "number";
  group?: { agg: ILiftographAgg; duration?: ILiftographDuration };
  smooth?: { agg: ILiftographSmoothAgg; window: number | ILiftographDuration };
  mark?: "line" | "bars" | "dots";
  axis?: "left" | "right";
  color?: string;
  span: ILiftographSpan;
}

export type ILiftographCompiledSeries =
  | { status: "ready"; spec: ILiftographSeriesSpec }
  | { status: "invalid"; name?: string; message: string; span: ILiftographSpan };

export type ILiftographWidget = (
  | { kind: "graph"; range: ILiftographDuration; series: ILiftographCompiledSeries[]; span: ILiftographSpan }
  | {
      kind: "value";
      series: ILiftographSeriesSpec;
      compare?: ILiftographDuration;
      trend?: ILiftographDuration;
      span: ILiftographSpan;
    }
  | {
      kind: "muscles";
      range: ILiftographDuration;
      show: ILiftographMusclesPart[];
      groups?: string[];
      source?: ILiftographSource;
      span: ILiftographSpan;
    }
  | { kind: "calendar"; range: ILiftographDuration; span: ILiftographSpan }
  | { kind: "text"; markdown: string; span: ILiftographSpan }
  | { kind: "unsupported"; message: string; span: ILiftographSpan }
  | { kind: "error"; message: string; span: ILiftographSpan }
) & { caption?: string };

export interface ILiftographCompiled {
  layout: { items: ILiftographWidget[]; caption?: string }[];
  diagnostics: ILiftographDiagnostic[];
}

const seriesKeys = ["name", "source", "y", "group", "smooth", "mark", "axis", "color"];
export const LiftographCompile_keys: Record<"series" | "graph" | "value" | "muscles" | "calendar", readonly string[]> =
  {
    series: seriesKeys,
    graph: ["range"],
    value: [...seriesKeys, "compare", "trend"],
    muscles: ["range", "show", "source"],
    calendar: ["range"],
  };
export const LiftographCompile_aggs: readonly ILiftographAgg[] = ["max", "min", "sum", "avg", "last", "count"];
export const LiftographCompile_smoothAggs: readonly ILiftographSmoothAgg[] = ["max", "min", "sum", "avg", "count"];
const aggs = LiftographCompile_aggs;
const smoothAggs = LiftographCompile_smoothAggs;
const statsKeys: readonly string[] = [...statsWeightDef, ...statsLengthDef, ...statsPercentageDef];

class CompileError extends Error {
  public readonly span: ILiftographSpan;
  constructor(message: string, span: ILiftographSpan) {
    super(message);
    this.span = span;
  }
}

class Unsupported extends CompileError {}

function isStatsKey(key: string): key is IStatsKey {
  return statsKeys.indexOf(key) !== -1;
}

function durationUnit(char: string): "d" | "w" | "m" | "y" | undefined {
  return char === "d" || char === "w" || char === "m" || char === "y" ? char : undefined;
}

export function LiftographCompile_duration(atom: ILiftographAtom): ILiftographDuration | undefined {
  if (atom.kind === "identifier" && atom.text === "all") {
    return "all";
  }
  if (atom.kind !== "duration") {
    return undefined;
  }
  const n = Number(atom.text.slice(0, -1));
  const unit = durationUnit(atom.text[atom.text.length - 1]);
  return unit != null && n > 0 ? { n, unit } : undefined;
}

function durationDays(duration: ILiftographDuration): number {
  if (duration === "all") {
    return Infinity;
  }
  return duration.unit === "d"
    ? duration.n
    : duration.unit === "w"
      ? duration.n * 7
      : duration.unit === "m"
        ? duration.n * 30
        : duration.n * 365;
}

interface ICallShape {
  name: string;
  args: ILiftographArg[];
  hasParens: boolean;
}

function valueSpan(pair: ILiftographPair): ILiftographSpan {
  return pair.value?.span ?? pair.span;
}

function shown(pair: ILiftographPair): string {
  return pair.value != null ? LiftographDocument_valueText(pair.value) : "";
}

function requireValue(pair: ILiftographPair): ILiftographValue {
  if (pair.value == null) {
    throw new CompileError(`'${pair.key}:' needs a value`, pair.span);
  }
  if ((pair.value.type === "call" || pair.value.type === "quoted") && !pair.value.isClosed) {
    throw new CompileError(
      pair.value.type === "call" ? `'${pair.value.name.text}(' has no closing ')'` : "This text has no closing quote",
      pair.value.span
    );
  }
  return pair.value;
}

function singleAtom(value: ILiftographValue | undefined): ILiftographAtom | undefined {
  return value?.type === "atoms" && value.atoms.length === 1 ? value.atoms[0] : undefined;
}

function callShape(pair: ILiftographPair): ICallShape | undefined {
  const value = requireValue(pair);
  if (value.type === "call") {
    return { name: value.name.text, args: value.args, hasParens: true };
  }
  const atom = singleAtom(value);
  return atom?.kind === "identifier" ? { name: atom.text, args: [], hasParens: false } : undefined;
}

function argText(value: ILiftographValue | undefined, pair: ILiftographPair): string {
  if (value == null) {
    throw new CompileError(`'${pair.key}:' has an empty argument`, valueSpan(pair));
  }
  if (value.type === "quoted" && !value.isClosed) {
    throw new CompileError("This text has no closing quote", value.span);
  }
  return LiftographDocument_valueText(value);
}

export type ILiftographMusclesPart = "map" | "sets";
const SHOW_ALL: ILiftographMusclesPart[] = ["map", "sets"];

function parseShow(pair: ILiftographPair, settings: ISettings): { show: ILiftographMusclesPart[]; groups?: string[] } {
  const value = requireValue(pair);
  const items: ILiftographListItem[] =
    value.type === "list"
      ? value.items
      : value.type === "call"
        ? [value]
        : value.type === "atoms" && value.atoms.length === 1
          ? [{ type: "atom", atom: value.atoms[0], span: value.span }]
          : [];
  if (items.length === 0) {
    throw new CompileError("'show:' is map, sets, or both", valueSpan(pair));
  }
  const show: ILiftographMusclesPart[] = [];
  let groups: string[] | undefined;
  for (const item of items) {
    const name = item.type === "atom" ? item.atom.text : item.name.text;
    if (name !== "map" && name !== "sets") {
      throw new CompileError("'show:' is map, sets, or both", item.span);
    }
    if (item.type === "call") {
      if (name !== "sets") {
        throw new CompileError("Only sets(...) takes muscle groups", item.span);
      }
      if (!item.isClosed) {
        throw new CompileError("'sets(' has no closing ')'", item.span);
      }
      groups = item.args.map((arg) => {
        const group = arg.type === "positional" ? argText(arg.value, pair) : undefined;
        if (group == null || group === "total" || !LiftographScriptFns_muscleGroupKeys(settings).has(group)) {
          throw new CompileError(`Unknown muscle group '${group ?? ""}'`, arg.span);
        }
        return group;
      });
      if (groups.length === 0) {
        throw new CompileError("sets(...) needs at least one muscle group, like sets(chest)", item.span);
      }
    }
    show.push(name);
  }
  return { show, groups };
}

export const LiftographCompile_maxTrend: ILiftographDuration = { n: 1, unit: "y" };
export const LiftographCompile_maxDuration: ILiftographDuration = { n: 10, unit: "y" };

function durationLabel(duration: ILiftographDuration): string {
  return duration === "all" ? "all" : `${duration.n}${duration.unit}`;
}

function limitDuration(
  duration: ILiftographDuration,
  max: ILiftographDuration,
  span: ILiftographSpan,
  allowAll: boolean
): ILiftographDuration {
  if ((duration === "all" && !allowAll) || (duration !== "all" && durationDays(duration) > durationDays(max))) {
    throw new CompileError(`This duration can be at most ${durationLabel(max)}`, span);
  }
  return duration;
}

function requireDuration(
  pair: ILiftographPair,
  max: ILiftographDuration = LiftographCompile_maxDuration,
  allowAll: boolean = true
): ILiftographDuration {
  const value = requireValue(pair);
  const atom = singleAtom(value);
  const duration = atom != null ? LiftographCompile_duration(atom) : undefined;
  if (duration == null) {
    throw new CompileError(`'${shown(pair)}' is not a duration, like 7d, 4w, 3m, 1y or all`, value.span);
  }
  return limitDuration(duration, max, value.span, allowAll);
}

function parseFilters(
  args: ILiftographArg[],
  pair: ILiftographPair
): { words: string[]; label?: string; program?: string; day?: string | number } {
  const result: { words: string[]; label?: string; program?: string; day?: string | number } = { words: [] };
  for (const arg of args) {
    if (arg.type === "positional") {
      result.words.push(argText(arg.value, pair));
      continue;
    }
    const key = arg.key.text;
    const value = argText(arg.value, pair);
    if (key === "label") {
      result.label = value;
    } else if (key === "program") {
      result.program = value;
    } else if (key === "day") {
      const atom = singleAtom(arg.value);
      const day = atom?.kind === "number" ? Number(atom.text) : undefined;
      result.day = day != null && Number.isInteger(day) ? day : value;
    } else {
      throw new Unsupported(`Unknown filter '${key}' in ${shown(pair)}`, valueSpan(pair));
    }
  }
  return result;
}

function parseSource(pair: ILiftographPair, settings: ISettings): ILiftographSource {
  const parsed = callShape(pair);
  if (parsed == null) {
    throw new CompileError(`'${shown(pair)}' is not a source`, valueSpan(pair));
  }
  const args = parsed.args;
  if (parsed.name === "exercise") {
    const filters = parseFilters(args, pair);
    const source: ILiftographSource = {
      type: "exercise",
      label: filters.label,
      program: filters.program,
      day: filters.day,
    };
    if (filters.words.length > 0) {
      const resolved = Exercise_resolveNameAndEquipmentParts(filters.words, settings.exercises);
      if (resolved == null) {
        throw new CompileError(`Unknown exercise '${filters.words.join(", ")}'`, valueSpan(pair));
      }
      source.exerciseId = resolved.exercise.id;
      source.equipment = resolved.exercise.equipment ?? resolved.exercise.defaultEquipment ?? undefined;
    }
    return source;
  } else if (parsed.name === "workout") {
    const filters = parseFilters(args, pair);
    if (filters.words.length > 0 || filters.label != null) {
      throw new CompileError(`workout() takes only program: and day:`, valueSpan(pair));
    }
    return { type: "workout", program: filters.program, day: filters.day };
  } else if (parsed.name === "stats") {
    const [first, ...rest] = args;
    if (rest.length > 0 || first?.type === "named") {
      throw new Unsupported(`Unknown stats filter in ${shown(pair)}`, valueSpan(pair));
    }
    const key = first != null ? argText(first.value, pair) : undefined;
    if (key == null || !isStatsKey(key)) {
      throw new CompileError(`Unknown stat '${key ?? ""}'`, valueSpan(pair));
    }
    return { type: "stats", key };
  }
  throw new Unsupported(`Unknown source '${parsed.name}'`, valueSpan(pair));
}

function parseAgg(pair: ILiftographPair): { agg: string; arg?: ILiftographAtom; hasArg: boolean } {
  const parsed = callShape(pair);
  const [first, ...rest] = parsed?.args ?? [];
  const arg = first?.type === "positional" ? singleAtom(first.value) : undefined;
  if (parsed == null || rest.length > 0 || (first != null && arg == null)) {
    throw new CompileError(`'${shown(pair)}' is not an aggregate, like max(1w)`, valueSpan(pair));
  }
  return { agg: parsed.name, arg, hasArg: first != null };
}

function compileSeries(
  pairs: ILiftographPair[],
  script: ILiftographScriptNode | undefined,
  span: ILiftographSpan,
  text: string,
  settings: ISettings,
  allowedKeys: readonly string[]
): ILiftographSeriesSpec {
  const byKey = pairsByKey(pairs, allowedKeys);
  const sourcePair = byKey.source;
  if (sourcePair == null) {
    throw new CompileError("A series needs a source, like 'source: exercise(Squat)'", span);
  }
  const source = parseSource(sourcePair, settings);
  let values: ILiftographSeriesSpec["values"];
  let xMode: ILiftographSeriesSpec["xMode"] = "time";
  const yPair = byKey.y;
  if (yPair != null && script != null) {
    throw new CompileError("A series takes either 'y:' or a script, not both", yPair.span);
  }
  const scriptPreset =
    script != null
      ? LiftographPresets_fromScript(liftoscriptParser.parse(script.text), script.text, source.type)
      : undefined;
  if (
    scriptPreset != null &&
    (scriptPreset.arg == null || LiftographScriptFns_muscleGroupKeys(settings).has(scriptPreset.arg))
  ) {
    values = { type: "preset", preset: scriptPreset.preset, arg: scriptPreset.arg };
  } else if (script != null) {
    const environment = LiftographEnvironment_forSource(source.type);
    const compiled = LiftographFold_compileScript(script.text, script.textSpan.from, environment, settings);
    if (!("environment" in compiled)) {
      throw new CompileError(compiled.message, compiled.span);
    }
    values = { type: "script", script: compiled };
    xMode = compiled.arity === 2 ? "number" : "time";
  } else if (yPair == null) {
    values = defaultValues(source);
  } else {
    const parsed = callShape(yPair);
    if (parsed == null || !LiftographPresets_isName(parsed.name)) {
      throw new Unsupported(`Unknown preset '${shown(yPair)}'`, valueSpan(yPair));
    }
    const preset = liftographPresets[parsed.name];
    if (!preset.hasArg && parsed.hasParens) {
      throw new Unsupported(`'${preset.name}' takes no arguments`, valueSpan(yPair));
    }
    if (preset.sources.indexOf(source.type) === -1) {
      throw new CompileError(`'${preset.name}' doesn't work with a ${source.type} source`, yPair.span);
    }
    const [first, ...rest] = parsed.args;
    if (preset.hasArg && (rest.length > 0 || first?.type === "named")) {
      throw new CompileError(`'${preset.name}' takes one muscle group, like ${preset.name}(chest)`, valueSpan(yPair));
    }
    const arg = first?.type === "positional" ? argText(first.value, yPair) : undefined;
    if (preset.hasArg && (arg == null || !LiftographScriptFns_muscleGroupKeys(settings).has(arg))) {
      throw new CompileError(`Unknown muscle group '${arg ?? ""}'`, valueSpan(yPair));
    }
    values = { type: "preset", preset: preset.name, arg: preset.hasArg ? arg : undefined };
  }
  const spec: ILiftographSeriesSpec = {
    id: text.slice(span.from, span.to),
    name: byKey.name != null ? LiftographDocument_valueText(requireValue(byKey.name)) : undefined,
    source,
    values,
    xMode,
    span,
  };
  if (byKey.group != null) {
    const groupPair = byKey.group;
    const { agg, arg, hasArg } = parseAgg(groupPair);
    const groupAgg = aggs.find((a) => a === agg);
    if (groupAgg == null) {
      throw new CompileError(`Unknown aggregate '${agg}'`, valueSpan(groupPair));
    }
    const duration = arg != null ? LiftographCompile_duration(arg) : undefined;
    if (xMode === "time" && duration == null) {
      throw new CompileError(`'group:' needs a duration here, like ${agg}(1w)`, valueSpan(groupPair));
    }
    if (xMode === "number" && hasArg) {
      throw new CompileError(`'group:' takes no duration with point(x, y)`, valueSpan(groupPair));
    }
    spec.group = { agg: groupAgg, duration };
  }
  if (byKey.smooth != null) {
    const smoothPair = byKey.smooth;
    const { agg, arg } = parseAgg(smoothPair);
    const smoothAgg = smoothAggs.find((a) => a === agg);
    if (smoothAgg == null || arg == null) {
      throw new CompileError(
        `'${shown(smoothPair)}' is not a smoothing, like avg(5) or avg(30d)`,
        valueSpan(smoothPair)
      );
    }
    const count = arg.kind === "number" ? Number(arg.text) : undefined;
    const window = count != null && Number.isInteger(count) ? count : LiftographCompile_duration(arg);
    if (window == null || window === 0 || (xMode === "number" && typeof window !== "number")) {
      throw new CompileError(`'${arg.text}' is not a smoothing window here`, valueSpan(smoothPair));
    }
    if (typeof window !== "number") {
      limitDuration(window, LiftographCompile_maxDuration, valueSpan(smoothPair), false);
    }
    spec.smooth = { agg: smoothAgg, window };
  }
  if (byKey.mark != null) {
    const mark = singleAtom(requireValue(byKey.mark))?.text;
    if (mark !== "line" && mark !== "bars" && mark !== "dots") {
      throw new CompileError(`'mark:' is line, bars or dots`, valueSpan(byKey.mark));
    }
    spec.mark = mark;
  }
  if (byKey.axis != null) {
    const axis = singleAtom(requireValue(byKey.axis))?.text;
    if (axis !== "left" && axis !== "right") {
      throw new CompileError(`'axis:' is left or right`, valueSpan(byKey.axis));
    }
    spec.axis = axis;
  }
  if (byKey.color != null) {
    spec.color = LiftographDocument_valueText(requireValue(byKey.color));
  }
  return spec;
}

function defaultValues(source: ILiftographSource): ILiftographSeriesSpec["values"] {
  if (source.type === "exercise") {
    return { type: "preset", preset: "maxWeight" };
  } else if (source.type === "workout") {
    return { type: "preset", preset: "volume" };
  }
  return { type: "preset", preset: "value" };
}

function pairsByKey(pairs: ILiftographPair[], allowed: readonly string[]): Partial<Record<string, ILiftographPair>> {
  const result: Partial<Record<string, ILiftographPair>> = {};
  for (const pair of pairs) {
    if (!pair.hasColon) {
      throw new CompileError("Expected 'key: value'", pair.span);
    }
    if (allowed.indexOf(pair.key) === -1) {
      throw new Unsupported(`Unknown key '${pair.key}'`, pair.span);
    }
    result[pair.key] = pair;
  }
  return result;
}

function compileGraphSeries(
  node: ILiftographWidgetItem["series"][number],
  doc: ILiftographDocument,
  settings: ISettings,
  diagnostics: ILiftographDiagnostic[]
): ILiftographCompiledSeries {
  try {
    if (node.syntaxError != null) {
      throw new CompileError(node.syntaxError.message, node.syntaxError.span);
    }
    return {
      status: "ready",
      spec: compileSeries(node.pairs, node.script, node.span, doc.text, settings, LiftographCompile_keys.series),
    };
  } catch (e) {
    if (!(e instanceof CompileError)) {
      throw e;
    }
    diagnostics.push({ message: e.message, span: e.span });
    const name = node.pairs.find((pair) => pair.key === "name");
    return {
      status: "invalid",
      name: name?.value != null ? LiftographDocument_valueText(name.value) : undefined,
      message: e.message,
      span: node.span,
    };
  }
}

function compileWidget(
  widget: ILiftographWidgetItem,
  doc: ILiftographDocument,
  settings: ISettings,
  diagnostics: ILiftographDiagnostic[]
): ILiftographWidget {
  if (widget.syntaxError != null) {
    throw new CompileError(widget.syntaxError.message, widget.syntaxError.span);
  }
  if (widget.kind !== "graph" && widget.hasBlock && ["value", "muscles", "calendar"].indexOf(widget.kind) !== -1) {
    throw new CompileError(`'${widget.kind}' takes no '{ }' block`, widget.span);
  }
  if (widget.kind !== "graph" && widget.kind !== "value" && widget.script != null) {
    throw new CompileError(`'${widget.kind}' takes no script`, widget.script.span);
  }
  if (widget.kind === "graph") {
    const keys = pairsByKey(widget.pairs, LiftographCompile_keys.graph);
    if (widget.script != null) {
      throw new CompileError("A graph keeps its scripts on its series lines", widget.script.span);
    }
    const series = widget.series.map((node) => compileGraphSeries(node, doc, settings, diagnostics));
    const modes = new Set(series.flatMap((s) => (s.status === "ready" ? [s.spec.xMode] : [])));
    if (modes.size > 1) {
      throw new CompileError("All series in one graph must use the same x-axis", widget.span);
    }
    return {
      kind: "graph",
      range: keys.range != null ? requireDuration(keys.range) : "all",
      series,
      span: widget.span,
    };
  } else if (widget.kind === "value") {
    const valuePairs = widget.pairs.filter((p) => p.key !== "compare" && p.key !== "trend");
    const keys = pairsByKey(widget.pairs, LiftographCompile_keys.value);
    const series = compileSeries(
      valuePairs,
      widget.script,
      widget.span,
      doc.text,
      settings,
      LiftographCompile_keys.series
    );
    if (series.xMode === "number") {
      throw new CompileError("A value takes point(y) only", widget.span);
    }
    return {
      kind: "value",
      series,
      compare: keys.compare != null ? requireDuration(keys.compare, LiftographCompile_maxDuration, false) : undefined,
      trend: keys.trend != null ? requireDuration(keys.trend, LiftographCompile_maxTrend, false) : undefined,
      span: widget.span,
    };
  } else if (widget.kind === "muscles") {
    const keys = pairsByKey(widget.pairs, LiftographCompile_keys.muscles);
    const range = keys.range != null ? requireDuration(keys.range) : { n: 7, unit: "d" as const };
    if (durationDays(range) < 7) {
      throw new CompileError(
        "The muscles range is at least 7d",
        keys.range != null ? valueSpan(keys.range) : widget.span
      );
    }
    const { show, groups } = keys.show != null ? parseShow(keys.show, settings) : { show: SHOW_ALL, groups: undefined };
    const sourcePair = keys.source;
    const source = sourcePair != null ? parseSource(sourcePair, settings) : undefined;
    if (sourcePair != null && source?.type !== "workout") {
      throw new CompileError("The muscles source is a workout(...) filter", valueSpan(sourcePair));
    }
    return {
      kind: "muscles",
      range,
      show,
      groups,
      source,
      span: widget.span,
    };
  } else if (widget.kind === "calendar") {
    const keys = pairsByKey(widget.pairs, LiftographCompile_keys.calendar);
    return {
      kind: "calendar",
      range: keys.range != null ? requireDuration(keys.range) : { n: 3, unit: "m" },
      span: widget.span,
    };
  }
  throw new Unsupported(`Unknown widget '${widget.kind}'`, widget.span);
}

export function LiftographCompile_document(doc: ILiftographDocument, settings: ISettings): ILiftographCompiled {
  const diagnostics: ILiftographDiagnostic[] = [...doc.diagnostics];

  function compileItem(item: ILiftographWidgetItem | ILiftographTextItem): ILiftographWidget {
    if (item.type === "text") {
      return { kind: "text", markdown: item.markdown, span: item.span };
    }
    const caption = item.caption?.markdown;
    try {
      return { ...compileWidget(item, doc, settings, diagnostics), caption };
    } catch (e) {
      if (e instanceof Unsupported) {
        diagnostics.push({ message: e.message, span: e.span });
        return { kind: "unsupported", message: e.message, span: item.span, caption };
      } else if (e instanceof CompileError) {
        diagnostics.push({ message: e.message, span: e.span });
        return { kind: "error", message: e.message, span: item.span, caption };
      }
      throw e;
    }
  }

  const layout: ILiftographCompiled["layout"] = [];
  for (const item of doc.items) {
    if (item.type !== "row") {
      layout.push({ items: [compileItem(item)] });
      continue;
    }
    const items = item.items.map(compileItem);
    if (items.length > LiftographLayout_maxRowItems) {
      diagnostics.push({ message: `A row holds at most ${LiftographLayout_maxRowItems} items`, span: item.span });
    }
    items.forEach((widget) => {
      const share = LiftographLayout_minShare(widget.kind);
      if (items.length > share) {
        diagnostics.push({ message: `A ${widget.kind} needs at least 1/${share} of the row`, span: widget.span });
      }
    });
    if (items.length > 0) {
      layout.push({ items, caption: item.caption?.markdown });
    }
  }
  const unique = diagnostics.filter(
    (d, i) =>
      diagnostics.findIndex(
        (o) => o.message === d.message && o.span.from === d.span.from && o.span.to === d.span.to
      ) === i
  );
  return { layout, diagnostics: unique };
}
