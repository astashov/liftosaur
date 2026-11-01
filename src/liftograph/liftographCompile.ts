import { Exercise_resolveNameAndEquipment } from "../models/exercise";
import { ISettings, IStatsKey, statsLengthDef, statsPercentageDef, statsWeightDef } from "../types";
import {
  ILiftographDiagnostic,
  ILiftographDocument,
  ILiftographPair,
  ILiftographScriptNode,
  ILiftographSpan,
  ILiftographTextItem,
  ILiftographWidgetItem,
  LiftographDocument_splitArgs,
  LiftographDocument_unquote,
} from "./liftographDocument";
import { LiftographEnvironment_forSource } from "./liftographEnvironments";
import { ILiftographCompiledScript, LiftographFold_compileScript } from "./liftographFold";
import { ILiftographPresetName, LiftographPresets_isName, liftographPresets } from "./liftographPresets";
import { ILiftographSource } from "./liftographRows";
import { LiftographScriptFns_muscleGroupKeys } from "./liftographScriptFns";

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
      show: ("map" | "sets")[];
      source?: ILiftographSource;
      span: ILiftographSpan;
    }
  | { kind: "calendar"; range: ILiftographDuration; span: ILiftographSpan }
  | { kind: "text"; markdown: string; span: ILiftographSpan }
  | { kind: "unsupported"; span: ILiftographSpan }
  | { kind: "error"; message: string; span: ILiftographSpan }
) & { caption?: string };

export interface ILiftographCompiled {
  layout: { items: ILiftographWidget[]; caption?: string }[];
  diagnostics: ILiftographDiagnostic[];
}

const MAX_ROW_ITEMS = 4;
const seriesKeys = ["name", "source", "y", "group", "smooth", "mark", "axis", "color"];
const aggs: ILiftographAgg[] = ["max", "min", "sum", "avg", "last", "count"];
const smoothAggs: ILiftographSmoothAgg[] = ["max", "min", "sum", "avg", "count"];
const statsKeys: readonly string[] = [...statsWeightDef, ...statsLengthDef, ...statsPercentageDef];

class Unsupported extends Error {}

class CompileError extends Error {
  public readonly span: ILiftographSpan;
  constructor(message: string, span: ILiftographSpan) {
    super(message);
    this.span = span;
  }
}

function isStatsKey(key: string): key is IStatsKey {
  return statsKeys.indexOf(key) !== -1;
}

export function LiftographCompile_duration(value: string): ILiftographDuration | undefined {
  if (value === "all") {
    return "all";
  }
  const match = value.match(/^(\d+)([dwmy])$/);
  if (match == null || parseInt(match[1], 10) <= 0) {
    return undefined;
  }
  const unit = match[2] === "d" ? "d" : match[2] === "w" ? "w" : match[2] === "m" ? "m" : "y";
  return { n: parseInt(match[1], 10), unit };
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

function call(value: string): { name: string; args?: string } | undefined {
  const match = value.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([\s\S]*)\))?$/);
  return match != null ? { name: match[1], args: match[2] } : undefined;
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
  const duration = LiftographCompile_duration(pair.value);
  if (duration == null) {
    throw new CompileError(`'${pair.value}' is not a duration, like 7d, 4w, 3m, 1y or all`, pair.valueSpan);
  }
  return limitDuration(duration, max, pair.valueSpan, allowAll);
}

function parseFilters(
  args: string[],
  pair: ILiftographPair
): { words: string[]; label?: string; program?: string; day?: string | number } {
  const result: { words: string[]; label?: string; program?: string; day?: string | number } = { words: [] };
  for (const arg of args) {
    const colon = arg.startsWith('"') ? -1 : arg.indexOf(":");
    if (colon === -1) {
      result.words.push(LiftographDocument_unquote(arg));
      continue;
    }
    const key = arg.slice(0, colon).trim();
    const value = LiftographDocument_unquote(arg.slice(colon + 1).trim());
    if (key === "label") {
      result.label = value;
    } else if (key === "program") {
      result.program = value;
    } else if (key === "day") {
      result.day = /^\d+$/.test(value) ? parseInt(value, 10) : value;
    } else {
      throw new Unsupported(`Unknown filter '${key}' in ${pair.value}`);
    }
  }
  return result;
}

function parseSource(pair: ILiftographPair, settings: ISettings): ILiftographSource {
  const parsed = call(pair.value);
  if (parsed == null) {
    throw new CompileError(`'${pair.value}' is not a source`, pair.valueSpan);
  }
  const args = parsed.args != null ? LiftographDocument_splitArgs(parsed.args) : [];
  if (parsed.name === "exercise") {
    const filters = parseFilters(args, pair);
    const source: ILiftographSource = {
      type: "exercise",
      label: filters.label,
      program: filters.program,
      day: filters.day,
    };
    if (filters.words.length > 0) {
      const resolved = Exercise_resolveNameAndEquipment(filters.words.join(", "), settings.exercises);
      if (resolved == null) {
        throw new CompileError(`Unknown exercise '${filters.words.join(", ")}'`, pair.valueSpan);
      }
      source.exerciseId = resolved.exercise.id;
      source.equipment = resolved.exercise.equipment ?? resolved.exercise.defaultEquipment ?? undefined;
    }
    return source;
  } else if (parsed.name === "workout") {
    const filters = parseFilters(args, pair);
    if (filters.words.length > 0 || filters.label != null) {
      throw new CompileError(`workout() takes only program: and day:`, pair.valueSpan);
    }
    return { type: "workout", program: filters.program, day: filters.day };
  } else if (parsed.name === "stats") {
    if (args.length > 1) {
      throw new Unsupported(`Unknown stats filter in ${pair.value}`);
    }
    const key = args[0];
    if (key == null || !isStatsKey(key)) {
      throw new CompileError(`Unknown stat '${key ?? ""}'`, pair.valueSpan);
    }
    return { type: "stats", key };
  }
  throw new Unsupported(`Unknown source '${parsed.name}'`);
}

function parseAgg(pair: ILiftographPair): { agg: string; arg?: string } {
  const parsed = call(pair.value);
  if (parsed == null) {
    throw new CompileError(`'${pair.value}' is not an aggregate, like max(1w)`, pair.valueSpan);
  }
  return { agg: parsed.name, arg: parsed.args?.trim() };
}

function compileSeries(
  pairs: ILiftographPair[],
  script: ILiftographScriptNode | undefined,
  span: ILiftographSpan,
  text: string,
  settings: ISettings,
  allowedKeys: string[]
): ILiftographSeriesSpec {
  const byKey: Partial<Record<string, ILiftographPair>> = {};
  for (const pair of pairs) {
    if (allowedKeys.indexOf(pair.key) === -1) {
      throw new Unsupported(`Unknown key '${pair.key}'`);
    }
    byKey[pair.key] = pair;
  }
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
  if (script != null) {
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
    const parsed = call(yPair.value);
    if (parsed == null || !LiftographPresets_isName(parsed.name)) {
      throw new Unsupported(`Unknown preset '${yPair.value}'`);
    }
    const preset = liftographPresets[parsed.name];
    if (!preset.hasArg && parsed.args != null) {
      throw new Unsupported(`'${preset.name}' takes no arguments`);
    }
    if (preset.sources.indexOf(source.type) === -1) {
      throw new CompileError(`'${preset.name}' doesn't work with a ${source.type} source`, yPair.span);
    }
    const arg = parsed.args?.trim();
    if (preset.hasArg && (arg == null || !LiftographScriptFns_muscleGroupKeys(settings).has(arg))) {
      throw new CompileError(`Unknown muscle group '${arg ?? ""}'`, yPair.valueSpan);
    }
    values = { type: "preset", preset: preset.name, arg: preset.hasArg ? arg : undefined };
  }
  const spec: ILiftographSeriesSpec = {
    id: text.slice(span.from, span.to),
    name: byKey.name != null ? LiftographDocument_unquote(byKey.name.value) : undefined,
    source,
    values,
    xMode,
    span,
  };
  if (byKey.group != null) {
    const { agg, arg } = parseAgg(byKey.group);
    const groupAgg = aggs.find((a) => a === agg);
    if (groupAgg == null) {
      throw new CompileError(`Unknown aggregate '${agg}'`, byKey.group.valueSpan);
    }
    const duration = arg != null && arg !== "" ? LiftographCompile_duration(arg) : undefined;
    if (xMode === "time" && duration == null) {
      throw new CompileError(`'group:' needs a duration here, like ${agg}(1w)`, byKey.group.valueSpan);
    }
    if (xMode === "number" && arg != null && arg !== "") {
      throw new CompileError(`'group:' takes no duration with point(x, y)`, byKey.group.valueSpan);
    }
    spec.group = { agg: groupAgg, duration };
  }
  if (byKey.smooth != null) {
    const { agg, arg } = parseAgg(byKey.smooth);
    const smoothAgg = smoothAggs.find((a) => a === agg);
    if (smoothAgg == null || arg == null) {
      throw new CompileError(
        `'${byKey.smooth.value}' is not a smoothing, like avg(5) or avg(30d)`,
        byKey.smooth.valueSpan
      );
    }
    const window = /^\d+$/.test(arg) ? parseInt(arg, 10) : LiftographCompile_duration(arg);
    if (window == null || window === 0 || (xMode === "number" && typeof window !== "number")) {
      throw new CompileError(`'${arg}' is not a smoothing window here`, byKey.smooth.valueSpan);
    }
    if (typeof window !== "number") {
      limitDuration(window, LiftographCompile_maxDuration, byKey.smooth.valueSpan, false);
    }
    spec.smooth = { agg: smoothAgg, window };
  }
  if (byKey.mark != null) {
    const mark = byKey.mark.value;
    if (mark !== "line" && mark !== "bars" && mark !== "dots") {
      throw new CompileError(`'mark:' is line, bars or dots`, byKey.mark.valueSpan);
    }
    spec.mark = mark;
  }
  if (byKey.axis != null) {
    const axis = byKey.axis.value;
    if (axis !== "left" && axis !== "right") {
      throw new CompileError(`'axis:' is left or right`, byKey.axis.valueSpan);
    }
    spec.axis = axis;
  }
  if (byKey.color != null) {
    spec.color = byKey.color.value;
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

function pairsByKey(pairs: ILiftographPair[], allowed: string[]): Partial<Record<string, ILiftographPair>> {
  const result: Partial<Record<string, ILiftographPair>> = {};
  for (const pair of pairs) {
    if (allowed.indexOf(pair.key) === -1) {
      throw new Unsupported(`Unknown key '${pair.key}'`);
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
    return { status: "ready", spec: compileSeries(node.pairs, node.script, node.span, doc.text, settings, seriesKeys) };
  } catch (e) {
    if (!(e instanceof CompileError)) {
      throw e;
    }
    diagnostics.push({ message: e.message, span: e.span });
    const name = node.pairs.find((pair) => pair.key === "name");
    return {
      status: "invalid",
      name: name != null ? LiftographDocument_unquote(name.value) : undefined,
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
  if (widget.kind !== "graph" && widget.hasBlock && ["value", "muscles", "calendar"].indexOf(widget.kind) !== -1) {
    throw new CompileError(`'${widget.kind}' takes no '{ }' block`, widget.span);
  }
  if (widget.kind !== "graph" && widget.kind !== "value" && widget.script != null) {
    throw new CompileError(`'${widget.kind}' takes no script`, widget.script.span);
  }
  if (widget.kind === "graph") {
    const keys = pairsByKey(widget.pairs, ["range"]);
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
    const keys = pairsByKey(widget.pairs, [...seriesKeys, "compare", "trend"]);
    const series = compileSeries(valuePairs, widget.script, widget.span, doc.text, settings, seriesKeys);
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
    const keys = pairsByKey(widget.pairs, ["range", "show", "source"]);
    const range = keys.range != null ? requireDuration(keys.range) : { n: 7, unit: "d" as const };
    if (durationDays(range) < 7) {
      throw new CompileError("The muscles range is at least 7d", keys.range?.valueSpan ?? widget.span);
    }
    const show = (keys.show?.value ?? "map, sets").split(",").map((s) => s.trim());
    if (show.some((s) => s !== "map" && s !== "sets")) {
      throw new CompileError("'show:' is map, sets, or both", keys.show?.valueSpan ?? widget.span);
    }
    const sourcePair = keys.source;
    const source = sourcePair != null ? parseSource(sourcePair, settings) : undefined;
    if (sourcePair != null && source?.type !== "workout") {
      throw new CompileError("The muscles source is a workout(...) filter", sourcePair.valueSpan);
    }
    return {
      kind: "muscles",
      range,
      show: show.filter((s): s is "map" | "sets" => s === "map" || s === "sets"),
      source,
      span: widget.span,
    };
  } else if (widget.kind === "calendar") {
    const keys = pairsByKey(widget.pairs, ["range"]);
    return {
      kind: "calendar",
      range: keys.range != null ? requireDuration(keys.range) : { n: 3, unit: "m" },
      span: widget.span,
    };
  }
  throw new Unsupported(`Unknown widget '${widget.kind}'`);
}

function minShare(widget: ILiftographWidget): number {
  return widget.kind === "graph" || widget.kind === "muscles" || widget.kind === "calendar" ? 2 : 4;
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
        return { kind: "unsupported", span: item.span, caption };
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
    if (items.length > MAX_ROW_ITEMS) {
      diagnostics.push({ message: `A row holds at most ${MAX_ROW_ITEMS} items`, span: item.span });
    }
    items.forEach((widget) => {
      if (items.length > minShare(widget)) {
        diagnostics.push({
          message: `A ${widget.kind} needs at least 1/${minShare(widget)} of the row`,
          span: widget.span,
        });
      }
    });
    if (items.length > 0) {
      layout.push({ items, caption: item.caption?.markdown });
    }
  }
  return { layout, diagnostics };
}
