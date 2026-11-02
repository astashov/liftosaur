import { ensureSyntaxTree, foldService, indentService, LanguageSupport, LRLanguage } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { Tree } from "@lezer/common";
import { parser } from "./liftographParser";
import { ILiftographDocument, LiftographDocument_lineAt } from "./liftographDocument";

const PARSE_BUDGET_MS = 50;
const INDENT_UNIT = 2;

const language = LRLanguage.define({ name: "liftograph", parser });

export function LiftographLanguage_tree(state: EditorState): Tree | undefined {
  return ensureSyntaxTree(state, state.doc.length, PARSE_BUDGET_MS) ?? undefined;
}

export function LiftographLanguage_foldRange(
  doc: ILiftographDocument,
  state: EditorState,
  lineStart: number,
  lineEnd: number
): { from: number; to: number } | undefined {
  const blocks = doc.items.flatMap((item) => (item.type === "row" ? [item, ...item.items] : [item]));
  const block = blocks.find((item) => item.span.from === lineStart && item.span.to > lineEnd);
  if (block == null) {
    return undefined;
  }
  const lastLine = state.doc.lineAt(block.span.to);
  return lastLine.from - 1 > lineEnd ? { from: lineEnd, to: lastLine.from - 1 } : undefined;
}

export function LiftographLanguage_indent(doc: ILiftographDocument, pos: number): number | undefined {
  const line = LiftographDocument_lineAt(doc, pos);
  if (line == null || line.owner === "skip") {
    return undefined;
  }
  const blocks = doc.items.flatMap((item) => (item.type === "row" ? [item, ...item.items] : [item]));
  const opener = blocks.find(
    (item) => item.span.from === line.span.from && (item.type === "row" || (item.type === "widget" && item.hasBlock))
  );
  if (opener != null) {
    return (opener.type === "widget" ? opener.kindSpan.from - opener.span.from : 0) + INDENT_UNIT;
  }
  if (line.owner === "top") {
    return undefined;
  }
  if (line.owner === "row") {
    return INDENT_UNIT;
  }
  const header = line.widget;
  return header != null ? header.kindSpan.from - header.span.from + INDENT_UNIT : undefined;
}

export function LiftographLanguage_support(document: (state: EditorState) => ILiftographDocument): LanguageSupport {
  return new LanguageSupport(language, [
    foldService.of(
      (state, lineStart, lineEnd) => LiftographLanguage_foldRange(document(state), state, lineStart, lineEnd) ?? null
    ),
    indentService.of((context, pos) => LiftographLanguage_indent(document(context.state), pos) ?? null),
  ]);
}
