import { IHistoryRecord, ISettings, IStats } from "../types";
import { ILiftographCompiled, ILiftographSeriesSpec, LiftographCompile_document } from "./liftographCompile";
import { LiftographDocument_parse } from "./liftographDocument";
import {
  ILiftographFoldContext,
  ILiftographFoldResult,
  LiftographFold_context,
  LiftographFold_run,
} from "./liftographFold";
import { ILiftographRow, ILiftographSource, LiftographRows_build } from "./liftographRows";

export interface ILiftographSeriesEvalInput {
  history: IHistoryRecord[];
  stats: IStats;
  settings: ISettings;
  today: number;
}

export interface ILiftographSeriesEval {
  input: ILiftographSeriesEvalInput;
  context: ILiftographFoldContext;
  rowsBySource: Map<string, ILiftographRow[]>;
  compiledByText: Map<string, ILiftographCompiled>;
}

export function LiftographSeriesEval_create(input: ILiftographSeriesEvalInput): ILiftographSeriesEval {
  return {
    input,
    context: LiftographFold_context(input.settings, input.stats),
    rowsBySource: new Map(),
    compiledByText: new Map(),
  };
}

export function LiftographSeriesEval_compile(evaluation: ILiftographSeriesEval, text: string): ILiftographCompiled {
  let compiled = evaluation.compiledByText.get(text);
  if (compiled == null) {
    compiled = LiftographCompile_document(LiftographDocument_parse(text), evaluation.input.settings);
    evaluation.compiledByText.set(text, compiled);
  }
  return compiled;
}

export function LiftographSeriesEval_emptyStats(): IStats {
  return { weight: {}, length: {}, percentage: {} };
}

export function LiftographSeriesEval_sourceKey(source: ILiftographSource): string {
  if (source.type === "stats") {
    return JSON.stringify([source.type, source.key]);
  } else if (source.type === "workout") {
    return JSON.stringify([source.type, source.program, source.day]);
  }
  return JSON.stringify([source.type, source.exerciseId, source.equipment, source.label, source.program, source.day]);
}

export function LiftographSeriesEval_rows(
  evaluation: ILiftographSeriesEval,
  source: ILiftographSource
): ILiftographRow[] {
  const key = LiftographSeriesEval_sourceKey(source);
  let rows = evaluation.rowsBySource.get(key);
  if (rows == null) {
    const { history, stats, settings } = evaluation.input;
    rows = LiftographRows_build(source, history, stats, settings);
    evaluation.rowsBySource.set(key, rows);
  }
  return rows;
}

export function LiftographSeriesEval_fold(
  evaluation: ILiftographSeriesEval,
  series: ILiftographSeriesSpec
): ILiftographFoldResult {
  return LiftographFold_run(series, LiftographSeriesEval_rows(evaluation, series.source), evaluation.context);
}
