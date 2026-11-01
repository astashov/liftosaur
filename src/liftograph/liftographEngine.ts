import {
  ILiftographDuration,
  ILiftographSeriesSpec,
  ILiftographWidget,
  LiftographCompile_document,
} from "./liftographCompile";
import { ILiftographDiagnostic, ILiftographSpan, LiftographDocument_parse } from "./liftographDocument";
import { ILiftographFoldError } from "./liftographFold";
import {
  ILiftographSeriesEval,
  ILiftographSeriesEvalInput,
  LiftographSeriesEval_create,
  LiftographSeriesEval_fold,
} from "./liftographSeriesEval";
import {
  ILiftographSeriesPoints,
  ILiftographValueResult,
  LiftographShape_series,
  LiftographShape_value,
} from "./liftographShape";

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

export function LiftographEngine_evaluateWidget(
  widget: ILiftographWidget,
  evaluation: ILiftographSeriesEval,
  rangeOverride?: ILiftographDuration
): ILiftographWidgetResult {
  const { input } = evaluation;
  if (widget.kind === "graph") {
    const series = widget.series.map((compiled): ILiftographSeriesResult => {
      if (compiled.status === "invalid") {
        return { status: "error", name: compiled.name, message: compiled.message, span: compiled.span };
      }
      const result = LiftographSeriesEval_fold(evaluation, compiled.spec);
      if (result.error != null) {
        return {
          status: "error",
          name: compiled.spec.name,
          message: result.error.message,
          span: result.error.span ?? compiled.spec.span,
        };
      }
      const points = LiftographShape_series(
        result,
        compiled.spec,
        input.settings,
        input.today,
        rangeOverride ?? widget.range
      );
      return { status: "ready", spec: compiled.spec, points };
    });
    return { type: "graph", widget, series };
  } else if (widget.kind === "value") {
    const result = LiftographSeriesEval_fold(evaluation, widget.series);
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

export function LiftographEngine_evaluate(text: string, input: ILiftographSeriesEvalInput): ILiftographEngineResult {
  const compiled = LiftographCompile_document(LiftographDocument_parse(text), input.settings);
  const evaluation = LiftographSeriesEval_create(input);
  const layout = compiled.layout.map((row) => ({
    caption: row.caption,
    items: row.items.map((widget) => LiftographEngine_evaluateWidget(widget, evaluation)),
  }));
  const seen = new Set(compiled.diagnostics.map((d) => `${d.span.from}:${d.span.to}:${d.message}`));
  const runtime = layout
    .flatMap((row) => row.items.flatMap(runtimeDiagnostics))
    .filter((d) => !seen.has(`${d.span.from}:${d.span.to}:${d.message}`));
  return { layout, diagnostics: [...compiled.diagnostics, ...runtime] };
}
