import { ILiftographWidgetItem, LiftographDocument_parse } from "../liftograph/liftographDocument";
import { ILiftographLayout, LiftographLayout_build, LiftographLayout_slot } from "../liftograph/liftographLayout";
import { ILiftographLayoutTarget, LiftographLayoutEdit_insert } from "../liftograph/liftographLayoutEdit";
import { ILiftographModelFormat } from "../liftograph/liftographWidgetModel";

export type IDashboardWidgetAnchor = {
  baseText: string;
  format: ILiftographModelFormat;
} & ({ type: "replace"; from: number; to: number } | { type: "insert"; target: ILiftographLayoutTarget });

export type IDashboardWidgetCommitResult =
  | { kind: "noop" }
  | { kind: "write"; text: string }
  | { kind: "alert"; message: string };

export interface IDashboardWidgetModalData {
  snippet: string;
  anchor: IDashboardWidgetAnchor;
}

export interface IDashboardWidgetModalResult {
  anchor: IDashboardWidgetAnchor;
  snippet: string | undefined;
}

const INSERT_FORMAT: ILiftographModelFormat = { eol: "\n", indent: "" };

function widgetAt(text: string, from: number): ILiftographWidgetItem | undefined {
  return LiftographDocument_parse(text)
    .items.flatMap((item) => (item.type === "row" ? item.items : [item]))
    .flatMap((item) => (item.type === "widget" ? [item] : []))
    .find((item) => item.span.from === from);
}

export function DashboardWidgetCommit_anchor(
  layout: ILiftographLayout,
  slotId: number
): IDashboardWidgetAnchor | undefined {
  const slot = LiftographLayout_slot(layout, slotId);
  const widget = slot != null ? widgetAt(layout.text, slot.itemFrom) : undefined;
  if (widget == null) {
    return undefined;
  }
  return {
    type: "replace",
    baseText: layout.text,
    format: { eol: layout.eol, indent: layout.text.slice(widget.span.from, widget.kindSpan.from) },
    from: widget.span.from,
    to: widget.span.to,
  };
}

export function DashboardWidgetCommit_insertAnchor(
  layout: ILiftographLayout,
  target: ILiftographLayoutTarget
): IDashboardWidgetAnchor {
  return { type: "insert", baseText: layout.text, format: INSERT_FORMAT, target };
}

export function DashboardWidgetCommit_snippet(anchor: IDashboardWidgetAnchor): string | undefined {
  return anchor.type === "replace" ? anchor.baseText.slice(anchor.from, anchor.to) : undefined;
}

export function DashboardWidgetCommit_apply(
  text: string,
  anchor: IDashboardWidgetAnchor,
  snippet: string
): IDashboardWidgetCommitResult {
  if (text !== anchor.baseText) {
    return { kind: "alert", message: "The dashboard changed while the widget was open, so the edit was not saved" };
  }
  if (anchor.type === "replace") {
    return { kind: "write", text: text.slice(0, anchor.from) + snippet + text.slice(anchor.to) };
  }
  const layout = LiftographLayout_build(LiftographDocument_parse(text));
  const inserted = LiftographLayoutEdit_insert(layout, anchor.target, snippet);
  return inserted.success ? { kind: "write", text: inserted.data } : { kind: "alert", message: inserted.error };
}

export function DashboardWidgetCommit_result(
  anchor: IDashboardWidgetAnchor,
  isTouched: boolean,
  written: string
): IDashboardWidgetModalResult {
  const isNoop = !isTouched && anchor.type === "replace";
  return { anchor, snippet: isNoop ? undefined : written };
}

export function DashboardWidgetCommit_resolve(
  text: string,
  result: IDashboardWidgetModalResult
): IDashboardWidgetCommitResult {
  return result.snippet == null ? { kind: "noop" } : DashboardWidgetCommit_apply(text, result.anchor, result.snippet);
}
