import { IHistoryRecord, ISettings, IStats } from "../types";
import { ILiftographCompiled, ILiftographSeriesSpec, LiftographCompile_document } from "./liftographCompile";
import { LiftographDocument_parse } from "./liftographDocument";
import {
  ILiftographFoldContext,
  ILiftographFoldResult,
  LiftographFold_context,
  LiftographFold_run,
} from "./liftographFold";
import {
  ILiftographRow,
  ILiftographSource,
  LiftographRows_finished,
  LiftographRows_fromFinished,
} from "./liftographRows";

export interface ILiftographSeriesEvalInput {
  history: IHistoryRecord[];
  stats: IStats;
  settings: ISettings;
  today: number;
}

export interface ILiftographSeriesEval {
  input: ILiftographSeriesEvalInput;
  context: ILiftographFoldContext;
  finished?: IHistoryRecord[];
  rowsBySource: Map<string, ILiftographRow[]>;
  compiledByText: Map<string, ILiftographCompiled>;
  foldBySeries: WeakMap<ILiftographSeriesSpec, ILiftographFoldResult>;
}

export function LiftographSeriesEval_create(input: ILiftographSeriesEvalInput): ILiftographSeriesEval {
  return {
    input,
    context: LiftographFold_context(input.settings, input.stats),
    rowsBySource: new Map(),
    compiledByText: new Map(),
    foldBySeries: new WeakMap(),
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

function finished(evaluation: ILiftographSeriesEval): IHistoryRecord[] {
  if (evaluation.finished == null) {
    evaluation.finished = LiftographRows_finished(evaluation.input.history);
  }
  return evaluation.finished;
}

export function LiftographSeriesEval_rows(
  evaluation: ILiftographSeriesEval,
  source: ILiftographSource
): ILiftographRow[] {
  const key = LiftographSeriesEval_sourceKey(source);
  let rows = evaluation.rowsBySource.get(key);
  if (rows == null) {
    const { stats, settings } = evaluation.input;
    rows = LiftographRows_fromFinished(source, source.type === "stats" ? [] : finished(evaluation), stats, settings);
    evaluation.rowsBySource.set(key, rows);
  }
  return rows;
}

export function LiftographSeriesEval_fold(
  evaluation: ILiftographSeriesEval,
  series: ILiftographSeriesSpec
): ILiftographFoldResult {
  let result = evaluation.foldBySeries.get(series);
  if (result == null) {
    result = LiftographFold_run(series, LiftographSeriesEval_rows(evaluation, series.source), evaluation.context);
    evaluation.foldBySeries.set(series, result);
  }
  return result;
}
