import { IHistoryRecord, ISettings, IStats } from "../types";
import { ILiftographSeriesSpec, ILiftographWidget, LiftographCompile_document } from "./liftographCompile";
import { ILiftographDiagnostic, ILiftographSpan, LiftographDocument_parse } from "./liftographDocument";
import {
  ILiftographFoldContext,
  ILiftographFoldError,
  ILiftographFoldResult,
  LiftographFold_context,
  LiftographFold_run,
} from "./liftographFold";
import { LiftographRows_build } from "./liftographRows";
import {
  ILiftographSeriesPoints,
  ILiftographValueResult,
  LiftographShape_series,
  LiftographShape_value,
} from "./liftographShape";

export interface ILiftographEngineInput {
  history: IHistoryRecord[];
  stats: IStats;
  settings: ISettings;
  today: number;
}

export type ILiftographSeriesResult =
  | { status: "ready"; spec: ILiftographSeriesSpec; points: ILiftographSeriesPoints }
  | { status: "error"; name?: string; message: string; span: ILiftographSpan };

export type ILiftographWidgetResult =
  | { type: "graph"; widget: Extract<ILiftographWidget, { kind: "graph" }>; series: ILiftographSeriesResult[] }
  | {
      type: "value";
      widget: Extract<ILiftographWidget, { kind: "value" }>;
      value?: ILiftographValueResult;
      error?: ILiftographFoldError;
    }
  | { type: "static"; widget: Exclude<ILiftographWidget, { kind: "graph" | "value" }> };

export interface ILiftographEngineResult {
  layout: { caption?: string; items: ILiftographWidgetResult[] }[];
  diagnostics: ILiftographDiagnostic[];
}

function fold(
  series: ILiftographSeriesSpec,
  input: ILiftographEngineInput,
  context: ILiftographFoldContext
): ILiftographFoldResult {
  const rows = LiftographRows_build(series.source, input.history, input.stats, input.settings);
  return LiftographFold_run(series, rows, context);
}

export function LiftographEngine_evaluateWidget(
  widget: ILiftographWidget,
  input: ILiftographEngineInput,
  context: ILiftographFoldContext = LiftographFold_context(input.settings, input.stats)
): ILiftographWidgetResult {
  if (widget.kind === "graph") {
    const series = widget.series.map((compiled): ILiftographSeriesResult => {
      if (compiled.status === "invalid") {
        return { status: "error", name: compiled.name, message: compiled.message, span: compiled.span };
      }
      const result = fold(compiled.spec, input, context);
      if (result.error != null) {
        return {
          status: "error",
          name: compiled.spec.name,
          message: result.error.message,
          span: result.error.span ?? compiled.spec.span,
        };
      }
      const points = LiftographShape_series(result, compiled.spec, input.settings, input.today, widget.range);
      return { status: "ready", spec: compiled.spec, points };
    });
    return { type: "graph", widget, series };
  } else if (widget.kind === "value") {
    const result = fold(widget.series, input, context);
    if (result.error != null) {
      return { type: "value", widget, error: { ...result.error, span: result.error.span ?? widget.span } };
    }
    return { type: "value", widget, value: LiftographShape_value(result, widget, input.settings, input.today) };
  }
  return { type: "static", widget };
}

function runtimeDiagnostics(result: ILiftographWidgetResult): ILiftographDiagnostic[] {
  if (result.type === "graph") {
    return result.series.flatMap((s) => (s.status === "error" ? [{ message: s.message, span: s.span }] : []));
  } else if (result.type === "value" && result.error?.span != null) {
    return [{ message: result.error.message, span: result.error.span }];
  }
  return [];
}

export function LiftographEngine_evaluate(text: string, input: ILiftographEngineInput): ILiftographEngineResult {
  const compiled = LiftographCompile_document(LiftographDocument_parse(text), input.settings);
  const context = LiftographFold_context(input.settings, input.stats);
  const layout = compiled.layout.map((row) => ({
    caption: row.caption,
    items: row.items.map((widget) => LiftographEngine_evaluateWidget(widget, input, context)),
  }));
  const seen = new Set(compiled.diagnostics.map((d) => `${d.span.from}:${d.span.to}:${d.message}`));
  const runtime = layout
    .flatMap((row) => row.items.flatMap(runtimeDiagnostics))
    .filter((d) => !seen.has(`${d.span.from}:${d.span.to}:${d.message}`));
  return { layout, diagnostics: [...compiled.diagnostics, ...runtime] };
}
