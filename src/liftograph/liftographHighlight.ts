import {
  ILiftoEditorStyledRange,
  LiftoEditorBrain_pushLiftoscriptRanges,
  LiftoEditorParseCache,
} from "../components/primitives/liftoEditorBrain";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import {
  ILiftographDiagnostic,
  ILiftographDocument,
  ILiftographPair,
  ILiftographTextItem,
  ILiftographWidgetItem,
  LiftographDocument_scripts,
} from "./liftographDocument";

export type ILiftographTokenKind = "kind" | "key" | "value" | "caption" | "hidden";

export interface ILiftographToken {
  from: number;
  to: number;
  kind: ILiftographTokenKind;
}

function pairTokens(pairs: ILiftographPair[]): ILiftographToken[] {
  return pairs.flatMap((pair): ILiftographToken[] => [
    { from: pair.span.from, to: pair.span.from + pair.key.length, kind: "key" },
    { from: pair.valueSpan.from, to: pair.valueSpan.to, kind: "value" },
  ]);
}

function keywordToken(text: string, from: number, keyword: string): ILiftographToken {
  const start = from + (text.slice(from).length - text.slice(from).trimStart().length);
  return { from: start, to: start + keyword.length, kind: "kind" };
}

function textTokens(item: ILiftographTextItem | undefined): ILiftographToken[] {
  return item != null ? [{ from: item.span.from, to: item.span.to, kind: "caption" }] : [];
}

function widgetTokens(text: string, widget: ILiftographWidgetItem): ILiftographToken[] {
  return [
    ...textTokens(widget.caption),
    keywordToken(text, widget.span.from, widget.kind),
    ...pairTokens(widget.pairs),
    ...widget.series.flatMap((series) => pairTokens(series.pairs)),
  ];
}

export function LiftographHighlight_tokens(doc: ILiftographDocument): ILiftographToken[] {
  const tokens = doc.items.flatMap((item): ILiftographToken[] => {
    if (item.type === "text") {
      return textTokens(item);
    } else if (item.type === "row") {
      return [
        ...textTokens(item.caption),
        keywordToken(doc.text, item.span.from, "row"),
        ...item.items.flatMap((child) => (child.type === "text" ? textTokens(child) : widgetTokens(doc.text, child))),
      ];
    }
    return widgetTokens(doc.text, item);
  });
  const hidden = doc.hiddenSpans.map((span): ILiftographToken => ({ ...span, kind: "hidden" }));
  return [...tokens, ...hidden].filter((token) => token.to > token.from).sort((a, b) => a.from - b.from);
}

export function LiftographHighlight_clampSpan(
  span: { from: number; to: number },
  textLength: number
): { from: number; to: number } | undefined {
  const from = Math.min(span.from, Math.max(0, textLength - 1));
  const to = Math.min(Math.max(span.to, from + 1), textLength);
  return to > from ? { from, to } : undefined;
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
  cache: LiftoEditorParseCache,
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
    LiftoEditorBrain_pushLiftoscriptRanges(cache, doc.text, script.textSpan.from, script.textSpan.to, ranges);
  }
  return [...ranges, ...LiftographHighlight_diagnosticRanges(diagnostics, doc.text.length)];
}
