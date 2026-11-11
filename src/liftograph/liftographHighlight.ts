import { IterMode, SyntaxNode, Tree } from "@lezer/common";
import {
  ILiftoEditorStyledRange,
  LiftoEditorBrain_pushLiftoscriptRanges,
} from "../components/primitives/liftoEditorBrain";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { ILiftographDiagnostic, ILiftographDocument, LiftographDocument_scripts } from "./liftographDocument";
import * as T from "./liftographParser.terms";

export type ILiftographTokenKind = "kind" | "key" | "value" | "caption" | "hidden";

export interface ILiftographToken {
  from: number;
  to: number;
  kind: ILiftographTokenKind;
}

function tokenKind(node: SyntaxNode): ILiftographTokenKind | undefined {
  switch (node.type.id) {
    case T.TextLine:
      return "caption";
    case T.HiddenLine:
      return "hidden";
    case T.Value:
      return "value";
    case T.Key:
      return node.parent?.type.id === T.Head && node.parent.getChild(T.Colon) == null ? "kind" : "key";
    default:
      return undefined;
  }
}

export function LiftographHighlight_tokens(doc: ILiftographDocument): ILiftographToken[] {
  const tokens: ILiftographToken[] = [];
  doc.tree.iterate({
    mode: IterMode.IgnoreMounts,
    enter: (ref) => {
      if (ref.type.id === T.Script) {
        return false;
      }
      const kind = tokenKind(ref.node);
      if (kind != null && ref.to > ref.from) {
        tokens.push({ from: ref.from, to: ref.to, kind });
        return false;
      }
      return true;
    },
  });
  return tokens;
}

export function LiftographHighlight_clampSpan(
  span: { from: number; to: number },
  textLength: number
): { from: number; to: number } | undefined {
  const from = Math.min(span.from, Math.max(0, textLength - 1));
  const to = Math.min(Math.max(span.to, from + 1), textLength);
  return to > from ? { from, to } : undefined;
}

export function LiftographHighlight_markRanges(
  ranges: ILiftoEditorStyledRange[],
  textLength: number
): ILiftoEditorStyledRange[] {
  return ranges.filter((range) => range.end > range.start && range.end <= textLength);
}

export function LiftographHighlight_lintSpans(
  diagnostics: ILiftographDiagnostic[],
  textLength: number
): { from: number; to: number; message: string }[] {
  return diagnostics.flatMap((diagnostic) => {
    const span = LiftographHighlight_clampSpan(diagnostic.span, textLength);
    return span != null ? [{ ...span, message: diagnostic.message }] : [];
  });
}

export function LiftographHighlight_diagnosticRanges(
  diagnostics: ILiftographDiagnostic[],
  textLength: number
): ILiftoEditorStyledRange[] {
  return diagnostics.flatMap((diagnostic) => {
    const span = LiftographHighlight_clampSpan(diagnostic.span, textLength);
    return span != null
      ? [{ start: span.from, end: span.to, backgroundColor: `${Tailwind_semantic().text.error}26` }]
      : [];
  });
}

export function LiftographHighlight_cssStyle(range: ILiftoEditorStyledRange): string {
  return [
    range.color != null ? `color: ${range.color}` : "",
    range.backgroundColor != null ? `background-color: ${range.backgroundColor}` : "",
    range.bold ? "font-weight: 600" : "",
    range.italic ? "font-style: italic" : "",
  ]
    .filter((s) => s !== "")
    .join("; ");
}

export function LiftographHighlight_styledRanges(
  doc: ILiftographDocument,
  scriptTrees: (script: string) => Tree,
  diagnostics: ILiftographDiagnostic[]
): ILiftoEditorStyledRange[] {
  const syntax = Tailwind_semantic().syntax;
  const styles: Record<ILiftographTokenKind, Omit<ILiftoEditorStyledRange, "start" | "end">> = {
    kind: { color: syntax.keyword, bold: true },
    key: { color: syntax.attributeName },
    value: { color: syntax.attributeValue },
    caption: { color: syntax.docComment },
    hidden: { color: syntax.blockComment, italic: true },
  };
  const ranges: ILiftoEditorStyledRange[] = LiftographHighlight_tokens(doc).map((token) => ({
    start: token.from,
    end: token.to,
    ...styles[token.kind],
  }));
  for (const script of LiftographDocument_scripts(doc)) {
    LiftoEditorBrain_pushLiftoscriptRanges(
      { parseLiftoscript: scriptTrees },
      doc.text,
      script.textSpan.from,
      script.textSpan.to,
      ranges
    );
  }
  return [...ranges, ...LiftographHighlight_diagnosticRanges(diagnostics, doc.text.length)];
}

export interface ILiftographHighlightSegment {
  text: string;
  style?: Omit<ILiftoEditorStyledRange, "start" | "end">;
}

export function LiftographHighlight_segments(
  doc: ILiftographDocument,
  scriptTrees: (script: string) => Tree
): ILiftographHighlightSegment[] {
  const ranges = LiftographHighlight_styledRanges(doc, scriptTrees, []).sort((a, b) => a.start - b.start);
  const text = doc.text;
  const segments: ILiftographHighlightSegment[] = [];
  let cursor = 0;
  for (const { start, end, ...style } of ranges) {
    if (start < cursor) {
      continue;
    }
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start) });
    }
    segments.push({ text: text.slice(start, end), style });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }
  return segments;
}
