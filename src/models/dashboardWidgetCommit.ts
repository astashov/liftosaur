import { ILiftographWidgetItem, LiftographDocument_parse } from "../liftograph/liftographDocument";
import { ILiftographLayout, LiftographLayout_build, LiftographLayout_slot } from "../liftograph/liftographLayout";
import { ILiftographLayoutTarget, LiftographLayoutEdit_insert } from "../liftograph/liftographLayoutEdit";
import { ILiftographModelFormat } from "../liftograph/liftographWidgetModel";
import { TextDiff_minimalEdit } from "../utils/textDiff";

export type IDashboardWidgetAnchor = {
  baseText: string;
  format: ILiftographModelFormat;
} & (
  | { type: "replace"; from: number; to: number; caret: number }
  | { type: "insert"; target: ILiftographLayoutTarget }
);

export type IDashboardWidgetCommitResult =
  | { kind: "ok"; text: string; caret: number }
  | { kind: "alert"; message: string };

const INSERT_FORMAT: ILiftographModelFormat = { eol: "\n", indent: "" };

function widgets(text: string): ILiftographWidgetItem[] {
  return LiftographDocument_parse(text)
    .items.flatMap((item) => (item.type === "row" ? item.items : [item]))
    .flatMap((item) => (item.type === "widget" ? [item] : []));
}

function widgetAt(text: string, from: number): ILiftographWidgetItem | undefined {
  return widgets(text).find((item) => item.span.from === from);
}

function caretAfterInsert(before: string, after: string): number {
  const start = TextDiff_minimalEdit(before, after)?.start ?? 0;
  const widget = widgets(after).find((item) => item.span.to > start);
  return widget?.kindSpan.from ?? start;
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
    caret: widget.kindSpan.from,
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
    return {
      kind: "ok",
      text: text.slice(0, anchor.from) + snippet + text.slice(anchor.to),
      caret: anchor.caret,
    };
  }
  const layout = LiftographLayout_build(LiftographDocument_parse(text));
  const inserted = LiftographLayoutEdit_insert(layout, anchor.target, snippet);
  if (!inserted.success) {
    return { kind: "alert", message: inserted.error };
  }
  return { kind: "ok", text: inserted.data, caret: caretAfterInsert(text, inserted.data) };
}

export interface IDashboardWidgetModalData {
  snippet: string;
  anchor: IDashboardWidgetAnchor;
}

export interface IDashboardWidgetModalResult {
  anchor: IDashboardWidgetAnchor;
  snippet: string | undefined;
  then?: "text";
}

export function DashboardWidgetCommit_result(
  anchor: IDashboardWidgetAnchor,
  isTouched: boolean,
  written: string,
  then?: "text"
): IDashboardWidgetModalResult {
  const isNoop = !isTouched && anchor.type === "replace";
  return { anchor, snippet: isNoop ? undefined : written, ...(then != null ? { then } : {}) };
}

export interface IDashboardWidgetResolution {
  text?: string;
  alert?: string;
  textModeCaret?: number;
}

export function DashboardWidgetCommit_resolve(
  text: string,
  result: IDashboardWidgetModalResult
): IDashboardWidgetResolution {
  const { anchor, snippet } = result;
  if (snippet == null) {
    const caret = anchor.type === "replace" ? anchor.caret : undefined;
    return result.then === "text" && caret != null ? { textModeCaret: caret } : {};
  }
  const commit = DashboardWidgetCommit_apply(text, anchor, snippet);
  if (commit.kind === "alert") {
    return { alert: commit.message };
  }
  return { text: commit.text, ...(result.then === "text" ? { textModeCaret: commit.caret } : {}) };
}
