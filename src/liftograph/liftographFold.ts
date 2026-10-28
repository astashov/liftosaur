import { SyntaxNode } from "@lezer/common";
import {
  ILiftoscriptBindingValue,
  ILiftoscriptDashboardBindings,
  ILiftoscriptEnvironment,
} from "../liftoscriptEnvironment";
import { LiftoscriptSyntaxError, NodeName } from "../liftoscriptEvaluator";
import { Weight_build, Weight_convertTo, Weight_is } from "../models/weight";
import { ScriptRunner } from "../parser";
import { IProgramState, ISettings, IStats } from "../types";
import type { ILiftographSeriesSpec } from "./liftographCompile";
import { ILiftographDiagnostic, ILiftographSpan } from "./liftographDocument";
import { LiftographEnvironment_bindings } from "./liftographEnvironments";
import { ILiftographBodyweightPoint, LiftographMeasures_bodyweightSeries } from "./liftographMeasures";
import { liftographPresets } from "./liftographPresets";
import { ILiftographRow } from "./liftographRows";
import {
  ILiftographPointValue,
  ILiftographRawPoint,
  ILiftographScriptFns,
  LiftographScriptFns_create,
  LiftographScriptFns_muscleGroupKeys,
} from "./liftographScriptFns";

export interface ILiftographCompiledScript {
  text: string;
  offset: number;
  environment: ILiftoscriptEnvironment;
  arity: 1 | 2;
  stateKeys: string[];
}

export interface ILiftographEmission {
  rowId: string;
  ts: number;
  order: number;
  x?: number;
  y: number;
}

export type ILiftographValueKind = "weight" | "number";

export interface ILiftographCheckpoint {
  state: IProgramState;
  yKind?: ILiftographValueKind;
  xKind?: ILiftographValueKind;
}

export interface ILiftographFoldError {
  message: string;
  rowId?: string;
  span?: ILiftographSpan;
}

export interface ILiftographFoldResult {
  emissions: ILiftographEmission[];
  checkpoint: ILiftographCheckpoint;
  error?: ILiftographFoldError;
}

export interface ILiftographFoldContext {
  settings: ISettings;
  bodyweights: ILiftographBodyweightPoint[];
  scriptFns: ILiftographScriptFns;
}

const muscleGroupFns = ["muscleSets", "muscleVolume"];

function templateBindings(environment: ILiftoscriptEnvironment): ILiftoscriptDashboardBindings {
  const bindings: Record<string, ILiftoscriptBindingValue> = {};
  for (const [name, type] of Object.entries(environment.bindingTypes)) {
    bindings[name] = type === "array" ? [] : type === "weight" ? Weight_build(0, "lb") : type === "string" ? "" : 0;
  }
  return bindings;
}

function fnCalls(node: SyntaxNode, script: string, name: string): SyntaxNode[][] {
  const calls: SyntaxNode[][] = [];
  const cursor = node.cursor();
  do {
    if (cursor.node.type.name === NodeName.BuiltinFunctionExpression) {
      const keyword = cursor.node.firstChild;
      if (keyword != null && script.slice(keyword.from, keyword.to) === name) {
        const args: SyntaxNode[] = [];
        for (let child = keyword.nextSibling; child != null; child = child.nextSibling) {
          args.push(child);
        }
        calls.push(args);
      }
    }
  } while (cursor.next());
  return calls;
}

function runner(
  text: string,
  state: IProgramState,
  bindings: ILiftoscriptDashboardBindings,
  fns: ILiftographScriptFns,
  environment: ILiftoscriptEnvironment,
  settings: ISettings
): ScriptRunner {
  return new ScriptRunner(text, state, {}, { kind: "dashboard", environment, bindings, fns: fns.fns }, settings.units, {
    unit: settings.units,
    prints: [],
  });
}

function unknownMuscleGroup(tree: SyntaxNode, text: string, settings: ISettings): ILiftographSpan | undefined {
  const known = LiftographScriptFns_muscleGroupKeys(settings);
  for (const name of muscleGroupFns) {
    for (const [arg] of fnCalls(tree, text, name)) {
      if (arg?.type.name === NodeName.String && !known.has(text.slice(arg.from + 1, arg.to - 1))) {
        return { from: arg.from, to: arg.to };
      }
    }
  }
  return undefined;
}

export function LiftographFold_compileScript(
  text: string,
  offset: number,
  environment: ILiftoscriptEnvironment,
  settings: ISettings
): ILiftographCompiledScript | ILiftographDiagnostic {
  const fns = LiftographScriptFns_create(settings);
  const at = (span: ILiftographSpan): ILiftographSpan => ({ from: offset + span.from, to: offset + span.to });
  try {
    const probe = runner(text, {}, templateBindings(environment), fns, environment, settings);
    const stateKeys = Array.from(probe.getStateVariableKeys()).sort();
    const state: IProgramState = {};
    for (const key of stateKeys) {
      state[key] = 0;
    }
    const [, tree] = runner(text, state, templateBindings(environment), fns, environment, settings).parse();
    const arities = new Set(fnCalls(tree.topNode, text, "point").map((args) => args.length));
    if (arities.size > 1) {
      return {
        message: "All point() calls in one series must take the same number of arguments",
        span: at({ from: 0, to: text.length }),
      };
    }
    const unknownGroup = unknownMuscleGroup(tree.topNode, text, settings);
    if (unknownGroup != null) {
      return {
        message: `Unknown muscle group ${text.slice(unknownGroup.from, unknownGroup.to)}`,
        span: at(unknownGroup),
      };
    }
    return { text, offset, environment, arity: arities.has(2) ? 2 : 1, stateKeys };
  } catch (e) {
    if (e instanceof LiftoscriptSyntaxError) {
      return { message: e.message, span: at({ from: e.from, to: e.to }) };
    }
    throw e;
  }
}

export function LiftographFold_context(settings: ISettings, stats: IStats): ILiftographFoldContext {
  return {
    settings,
    bodyweights: LiftographMeasures_bodyweightSeries(stats),
    scriptFns: LiftographScriptFns_create(settings),
  };
}

export function LiftographFold_initialCheckpoint(series: ILiftographSeriesSpec): ILiftographCheckpoint {
  const state: IProgramState = {};
  if (series.values.type === "script") {
    for (const key of series.values.script.stateKeys) {
      state[key] = 0;
    }
  }
  return { state };
}

function convert(value: ILiftographPointValue, settings: ISettings): { value: number; kind: ILiftographValueKind } {
  return Weight_is(value)
    ? { value: Weight_convertTo(value, settings.units).value, kind: "weight" }
    : { value, kind: "number" };
}

function rowPoints(
  series: ILiftographSeriesSpec,
  row: ILiftographRow,
  state: IProgramState,
  context: ILiftographFoldContext
): { state: IProgramState; points: ILiftographRawPoint[] } {
  if (series.values.type === "preset") {
    const value = liftographPresets[series.values.preset].evaluate(row, context.settings, series.values.arg);
    return { state, points: value != null ? [{ y: value }] : [] };
  }
  const script = series.values.script;
  const nextState: IProgramState = { ...state };
  context.scriptFns.beginRow(row);
  const bindings = LiftographEnvironment_bindings(row, context);
  runner(script.text, nextState, bindings, context.scriptFns, script.environment, context.settings).execute();
  return { state: nextState, points: context.scriptFns.takePoints() };
}

export function LiftographFold_step(
  series: ILiftographSeriesSpec,
  row: ILiftographRow,
  checkpoint: ILiftographCheckpoint,
  context: ILiftographFoldContext
): { checkpoint: ILiftographCheckpoint; emissions: ILiftographEmission[]; error?: ILiftographFoldError } {
  let result: { state: IProgramState; points: ILiftographRawPoint[] };
  try {
    result = rowPoints(series, row, checkpoint.state, context);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const offset = series.values.type === "script" ? series.values.script.offset : undefined;
    const span =
      e instanceof LiftoscriptSyntaxError && offset != null ? { from: offset + e.from, to: offset + e.to } : undefined;
    return { checkpoint, emissions: [], error: { message, rowId: row.id, span } };
  }
  let { yKind, xKind } = checkpoint;
  const emissions: ILiftographEmission[] = [];
  for (const [order, point] of result.points.entries()) {
    const y = convert(point.y, context.settings);
    const x = point.x != null ? convert(point.x, context.settings) : undefined;
    if ((yKind != null && yKind !== y.kind) || (xKind != null && xKind !== x?.kind)) {
      return {
        checkpoint,
        emissions: [],
        error: { message: "This series mixes weights and plain numbers", rowId: row.id, span: series.span },
      };
    }
    yKind = y.kind;
    xKind = x?.kind;
    emissions.push({ rowId: row.id, ts: row.ts, order, x: x?.value, y: y.value });
  }
  return { checkpoint: { state: result.state, yKind, xKind }, emissions };
}

export function LiftographFold_run(
  series: ILiftographSeriesSpec,
  rows: ILiftographRow[],
  context: ILiftographFoldContext
): ILiftographFoldResult {
  let checkpoint = LiftographFold_initialCheckpoint(series);
  const emissions: ILiftographEmission[] = [];
  for (const row of rows) {
    const step = LiftographFold_step(series, row, checkpoint, context);
    if (step.error != null) {
      return { emissions: [], checkpoint, error: step.error };
    }
    checkpoint = step.checkpoint;
    emissions.push(...step.emissions);
  }
  return { emissions, checkpoint };
}
