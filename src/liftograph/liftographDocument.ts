import { SyntaxNode, Tree } from "@lezer/common";
import { parser } from "./liftographParser";
import * as T from "./liftographParser.terms";

export interface ILiftographSpan {
  from: number;
  to: number;
}

export type ILiftographAtomKind = "identifier" | "number" | "duration" | "word";

export interface ILiftographAtom {
  kind: ILiftographAtomKind;
  text: string;
  span: ILiftographSpan;
}

export type ILiftographValue =
  | { type: "atoms"; atoms: ILiftographAtom[]; span: ILiftographSpan }
  | { type: "quoted"; content: string; contentSpan: ILiftographSpan; isClosed: boolean; span: ILiftographSpan }
  | { type: "call"; name: ILiftographAtom; args: ILiftographArg[]; isClosed: boolean; span: ILiftographSpan }
  | { type: "list"; items: ILiftographAtom[]; span: ILiftographSpan };

export type ILiftographArg =
  | { type: "named"; key: ILiftographAtom; value?: ILiftographValue; span: ILiftographSpan }
  | { type: "positional"; value: ILiftographValue; span: ILiftographSpan };

export interface ILiftographPair {
  key: string;
  keySpan: ILiftographSpan;
  hasColon: boolean;
  value?: ILiftographValue;
  span: ILiftographSpan;
}

export interface ILiftographScriptNode {
  text: string;
  span: ILiftographSpan;
  textSpan: ILiftographSpan;
}

export interface ILiftographSeriesNode {
  pairs: ILiftographPair[];
  script?: ILiftographScriptNode;
  syntaxError?: ILiftographDiagnostic;
  span: ILiftographSpan;
}

export interface ILiftographTextItem {
  type: "text";
  markdown: string;
  span: ILiftographSpan;
}

export interface ILiftographWidgetItem {
  type: "widget";
  kind: string;
  kindSpan: ILiftographSpan;
  pairs: ILiftographPair[];
  script?: ILiftographScriptNode;
  series: ILiftographSeriesNode[];
  hasBlock: boolean;
  caption?: ILiftographTextItem;
  syntaxError?: ILiftographDiagnostic;
  span: ILiftographSpan;
}

export interface ILiftographRowItem {
  type: "row";
  items: (ILiftographWidgetItem | ILiftographTextItem)[];
  caption?: ILiftographTextItem;
  span: ILiftographSpan;
}

export interface ILiftographDiagnostic {
  message: string;
  span: ILiftographSpan;
}

export type ILiftographLineOwner = "top" | "row" | "graph" | "skip";

export interface ILiftographLine {
  span: ILiftographSpan;
  owner: ILiftographLineOwner;
  widget?: ILiftographWidgetItem;
}

export interface ILiftographDocument {
  text: string;
  tree: Tree;
  items: (ILiftographWidgetItem | ILiftographTextItem | ILiftographRowItem)[];
  lines: ILiftographLine[];
  hiddenSpans: ILiftographSpan[];
  diagnostics: ILiftographDiagnostic[];
}

const CAPTION_MARK = "//";
const SPACED_CAPTION_MARK = "// ";

type IFrame =
  | { type: "row"; row: ILiftographRowItem; openSpan: ILiftographSpan; owner: ILiftographSpan }
  | { type: "graph"; widget: ILiftographWidgetItem; openSpan: ILiftographSpan; owner: ILiftographSpan }
  | { type: "skip"; openSpan: ILiftographSpan; owner?: ILiftographSpan };

interface IPendingText {
  lines: string[];
  span: ILiftographSpan;
}

interface IPhysicalLine {
  span: ILiftographSpan;
  node?: SyntaxNode;
  errors: SyntaxNode[];
  extras: SyntaxNode[];
}

function spanOf(node: SyntaxNode): ILiftographSpan {
  return { from: node.from, to: node.to };
}

function children(node: SyntaxNode): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  for (let child = node.firstChild; child != null; child = child.nextSibling) {
    result.push(child);
  }
  return result;
}

function atomKind(node: SyntaxNode): ILiftographAtomKind | undefined {
  switch (node.type.id) {
    case T.Identifier:
      return "identifier";
    case T.Number:
      return "number";
    case T.Duration:
      return "duration";
    case T.Word:
      return "word";
    default:
      return undefined;
  }
}

function atomsOf(text: string, node: SyntaxNode): ILiftographAtom[] {
  return children(node).flatMap((child): ILiftographAtom[] => {
    if (child.type.id === T.Group || child.type.id === T.ArgAtoms) {
      return atomsOf(text, child);
    }
    const kind = child.type.id === T.OpenParen || child.type.id === T.CloseParen ? "word" : atomKind(child);
    return kind != null ? [{ kind, text: text.slice(child.from, child.to), span: spanOf(child) }] : [];
  });
}

function quotePiece(text: string, node: SyntaxNode): string {
  if (node.type.id === T.QuoteText) {
    return text.slice(node.from, node.to);
  }
  return node.type.id === T.Escape ? text.slice(node.from + 1, node.to) : "";
}

function quotedValue(text: string, node: SyntaxNode): ILiftographValue {
  const open = node.getChild(T.QuoteOpen);
  const close = node.getChild(T.QuoteClose);
  return {
    type: "quoted",
    content: children(node)
      .map((child) => quotePiece(text, child))
      .join(""),
    contentSpan: { from: open?.to ?? node.from, to: close?.from ?? node.to },
    isClosed: close != null,
    span: spanOf(node),
  };
}

function argValue(text: string, node: SyntaxNode): ILiftographValue | undefined {
  const inner = node.firstChild;
  if (inner == null) {
    return undefined;
  }
  if (inner.type.id === T.Quoted) {
    return quotedValue(text, inner);
  }
  return { type: "atoms", atoms: atomsOf(text, inner), span: spanOf(inner) };
}

function callValue(text: string, node: SyntaxNode): ILiftographValue {
  const nameNode = node.getChild(T.Identifier);
  const args = node.getChildren(T.Arg).flatMap((arg): ILiftographArg[] => {
    const named = arg.getChild(T.NamedArg);
    if (named != null) {
      const keyNode = named.getChild(T.Key);
      const valueNode = named.getChild(T.ArgValue);
      if (keyNode == null) {
        return [];
      }
      return [
        {
          type: "named",
          key: { kind: "identifier", text: text.slice(keyNode.from, keyNode.to), span: spanOf(keyNode) },
          value: valueNode != null ? argValue(text, valueNode) : undefined,
          span: spanOf(arg),
        },
      ];
    }
    const positional = arg.getChild(T.ArgValue);
    const value = positional != null ? argValue(text, positional) : undefined;
    return value != null ? [{ type: "positional", value, span: spanOf(arg) }] : [];
  });
  return {
    type: "call",
    name: {
      kind: "identifier",
      text: nameNode != null ? text.slice(nameNode.from, nameNode.to) : "",
      span: nameNode != null ? spanOf(nameNode) : { from: node.from, to: node.from },
    },
    args,
    isClosed: node.getChild(T.CloseParen) != null,
    span: spanOf(node),
  };
}

function valueOf(text: string, node: SyntaxNode): ILiftographValue | undefined {
  const inner = node.firstChild;
  if (inner == null) {
    return undefined;
  }
  switch (inner.type.id) {
    case T.Call:
      return callValue(text, inner);
    case T.Quoted:
      return quotedValue(text, inner);
    case T.List:
      return { type: "list", items: atomsOf(text, inner), span: spanOf(inner) };
    case T.Atoms:
      return { type: "atoms", atoms: atomsOf(text, inner), span: spanOf(inner) };
    default:
      return undefined;
  }
}

function pairOf(text: string, node: SyntaxNode): ILiftographPair | undefined {
  const keyNode = node.getChild(T.Key);
  if (keyNode == null) {
    return undefined;
  }
  const valueNode = node.getChild(T.Value);
  return {
    key: text.slice(keyNode.from, keyNode.to),
    keySpan: spanOf(keyNode),
    hasColon: node.getChild(T.Colon) != null,
    value: valueNode != null ? valueOf(text, valueNode) : undefined,
    span: spanOf(node),
  };
}

function scriptOf(text: string, node: SyntaxNode): { script: ILiftographScriptNode; isClosed: boolean } {
  const body = node.getChild(T.ScriptBody);
  const open = node.getChild(T.ScriptOpen);
  const close = node.getChild(T.ScriptClose);
  const bodyFrom = body?.from ?? open?.to ?? node.from;
  const bodyTo = body?.to ?? close?.from ?? (close == null ? text.length : bodyFrom);
  const to = close != null ? close.to : text.length;
  return {
    script: {
      text: text.slice(bodyFrom, bodyTo),
      span: { from: node.from, to },
      textSpan: { from: bodyFrom, to: bodyTo },
    },
    isClosed: close != null,
  };
}

function physicalLines(text: string, tree: Tree): IPhysicalLine[] {
  const lines: IPhysicalLine[] = [];
  let current: IPhysicalLine = { span: { from: 0, to: text.length }, errors: [], extras: [] };
  for (const node of children(tree.topNode)) {
    if (node.type.id === T.LineBreak) {
      current.span.to = node.from;
      lines.push(current);
      current = { span: { from: node.to, to: text.length }, errors: [], extras: [] };
    } else if (node.type.id === T.Line) {
      if (current.node == null) {
        current.node = node;
      } else {
        current.extras.push(node);
      }
    } else if (node.type.isError) {
      current.errors.push(node);
    }
  }
  lines.push(current);
  return lines;
}

function lineErrors(node: SyntaxNode): SyntaxNode[] {
  return children(node).flatMap((child) => {
    if (child.type.id === T.Script || child.type.id === T.Quoted) {
      return [];
    }
    return child.type.isError ? [child, ...lineErrors(child)] : lineErrors(child);
  });
}

function opensBlockAnywhere(tree: Tree, span: ILiftographSpan): boolean {
  let found = false;
  tree.iterate({
    from: span.from,
    to: span.to,
    enter: (node) => {
      if (node.type.id === T.Script || found) {
        return false;
      }
      if (node.type.id === T.BlockOpen && node.from >= span.from && node.to <= span.to) {
        found = true;
      }
      return undefined;
    },
  });
  return found;
}

function errorSpan(node: SyntaxNode, line: ILiftographSpan): ILiftographSpan {
  return node.to > node.from
    ? spanOf(node)
    : { from: Math.max(line.from, node.from - 1), to: Math.max(node.from, line.from + 1) };
}

export function LiftographDocument_parse(text: string, tree: Tree = parser.parse(text)): ILiftographDocument {
  const items: ILiftographDocument["items"] = [];
  const lines: ILiftographLine[] = [];
  const hiddenSpans: ILiftographSpan[] = [];
  const diagnostics: ILiftographDiagnostic[] = [];
  const stack: IFrame[] = [];
  let pendingText: IPendingText | undefined;

  function error(message: string, span: ILiftographSpan): void {
    diagnostics.push({ message, span });
  }

  function currentContainer(): ILiftographRowItem | undefined {
    const top = stack[stack.length - 1];
    return top?.type === "row" ? top.row : undefined;
  }

  function isSkipping(): boolean {
    return stack.some((frame) => frame.type === "skip");
  }

  function owner(): ILiftographLine {
    const top = stack[stack.length - 1];
    if (isSkipping()) {
      return { span: { from: 0, to: 0 }, owner: "skip" };
    } else if (top?.type === "graph") {
      return { span: { from: 0, to: 0 }, owner: "graph", widget: top.widget };
    }
    return { span: { from: 0, to: 0 }, owner: top?.type === "row" ? "row" : "top" };
  }

  function takeText(): ILiftographTextItem | undefined {
    if (pendingText == null) {
      return undefined;
    }
    const item: ILiftographTextItem = { type: "text", markdown: pendingText.lines.join("\n"), span: pendingText.span };
    pendingText = undefined;
    return item;
  }

  function flushTextAsItem(): void {
    const item = takeText();
    if (item == null) {
      return;
    }
    const top = stack[stack.length - 1];
    if (top == null) {
      items.push(item);
    } else if (top.type === "row") {
      top.row.items.push(item);
    }
  }

  function addWidget(widget: ILiftographWidgetItem): void {
    const row = currentContainer();
    if (row != null) {
      row.items.push(widget);
    } else {
      items.push(widget);
    }
  }

  function closeFrame(span: ILiftographSpan): void {
    const frame = stack.pop();
    if (frame == null) {
      error("This '}' closes nothing", span);
    } else if (frame.owner != null) {
      frame.owner.to = span.to;
    }
  }

  function textLine(node: SyntaxNode, span: ILiftographSpan): void {
    const markOpen = node.getChild(T.SpacedCaption) != null ? SPACED_CAPTION_MARK : CAPTION_MARK;
    const markdown = text.slice(node.from + markOpen.length, node.to);
    if (pendingText == null) {
      pendingText = { lines: [markdown], span: { ...span } };
    } else {
      pendingText.lines.push(markdown);
      pendingText.span.to = span.to;
    }
  }

  function fieldLine(node: SyntaxNode, line: IPhysicalLine): void {
    const span = line.span;
    const head = node.getChild(T.Head);
    const headPair = head != null ? pairOf(text, head) : undefined;
    const fields = node.getChildren(T.Field).flatMap((field) => {
      const pair = pairOf(text, field);
      return pair != null ? [pair] : [];
    });
    const scriptNode = node.getChild(T.Script);
    const parsedScript = scriptNode != null ? scriptOf(text, scriptNode) : undefined;
    const opensBlock = node.getChild(T.BlockOpen) != null;
    const isKindHead = headPair != null && !headPair.hasColon;
    const found: ILiftographDiagnostic[] = [
      ...(parsedScript != null && !parsedScript.isClosed
        ? [{ message: "The script has no closing '~}'", span: parsedScript.script.span }]
        : []),
      ...fields.filter((f) => !f.hasColon).map((f) => ({ message: "Expected 'key: value'", span: f.span })),
      ...[...line.errors, ...lineErrors(node)].map((bad) => ({
        message: "Expected 'key: value'",
        span: errorSpan(bad, span),
      })),
      ...line.extras.map((extra) => ({ message: "Unexpected text at the end of the line", span: spanOf(extra) })),
    ];
    const syntaxErrors = (): ILiftographDiagnostic | undefined => {
      diagnostics.push(...found);
      return found[0];
    };
    if (isKindHead && headPair.key === "row" && opensBlock && fields.length === 0 && found.length === 0) {
      const caption = takeText();
      if (stack.length > 0) {
        error("A row can't be inside another row or a graph", span);
        stack.push({ type: "skip", openSpan: span });
        return;
      }
      const row: ILiftographRowItem = { type: "row", items: [], caption, span: { ...span } };
      items.push(row);
      stack.push({ type: "row", row, openSpan: span, owner: row.span });
      return;
    }
    const top = stack[stack.length - 1];
    if (top?.type === "graph") {
      takeText();
      if (isKindHead) {
        error("Expected a series line, like 'name: Squat / source: exercise(Squat)'", span);
        return;
      }
      const syntaxError = syntaxErrors();
      if (opensBlock) {
        error("A series line can't open a block", span);
      }
      top.widget.series.push({
        pairs: [...(headPair != null ? [headPair] : []), ...fields],
        script: parsedScript?.script,
        syntaxError,
        span,
      });
      return;
    }
    if (!isKindHead) {
      takeText();
      error("Expected a widget, like 'graph {' or 'value / source: workout'", span);
      return;
    }
    const syntaxError = syntaxErrors();
    const caption = takeText();
    const widget: ILiftographWidgetItem = {
      type: "widget",
      kind: headPair.key,
      kindSpan: headPair.keySpan,
      pairs: fields,
      script: parsedScript?.script,
      series: [],
      hasBlock: opensBlock,
      caption,
      syntaxError,
      span: { ...span },
    };
    addWidget(widget);
    if (opensBlock) {
      if (widget.kind === "graph") {
        stack.push({ type: "graph", widget, openSpan: span, owner: widget.span });
      } else {
        stack.push({ type: "skip", openSpan: span, owner: widget.span });
      }
    }
  }

  for (const line of physicalLines(text, tree)) {
    lines.push({ ...owner(), span: line.span });
    const node = line.node?.firstChild;
    if (node?.type.id === T.HiddenLine) {
      hiddenSpans.push(line.span);
      continue;
    }
    if (isSkipping()) {
      if (node?.type.id === T.CloseLine) {
        closeFrame(line.span);
      } else if (opensBlockAnywhere(tree, line.span)) {
        stack.push({ type: "skip", openSpan: line.span });
      }
      continue;
    }
    if (node == null) {
      if (line.errors.length > 0) {
        takeText();
        error("Expected a widget, like 'graph {' or 'value / source: workout'", line.span);
      } else {
        flushTextAsItem();
      }
      continue;
    }
    if (node.type.id === T.TextLine) {
      textLine(node, line.span);
    } else if (node.type.id === T.CloseLine) {
      flushTextAsItem();
      closeFrame(line.span);
      for (const extra of [...line.errors, ...line.extras]) {
        error("Unexpected text at the end of the line", errorSpan(extra, line.span));
      }
    } else if (node.type.id === T.FieldLine) {
      fieldLine(node, line);
    }
  }
  flushTextAsItem();
  for (let frame = stack.pop(); frame != null; frame = stack.pop()) {
    error("This block has no closing '}'", frame.openSpan);
    if (frame.owner != null) {
      frame.owner.to = text.length;
    }
  }
  return { text, tree, items, lines, hiddenSpans, diagnostics };
}

export function LiftographDocument_lineAt(doc: ILiftographDocument, pos: number): ILiftographLine | undefined {
  let lo = 0;
  let hi = doc.lines.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const line = doc.lines[mid];
    if (pos < line.span.from) {
      hi = mid - 1;
    } else if (pos > line.span.to) {
      lo = mid + 1;
    } else {
      return line;
    }
  }
  return undefined;
}

function joinAtoms(atoms: ILiftographAtom[]): string {
  return atoms.reduce(
    (memo, atom, i) => memo + (i > 0 && atoms[i - 1].span.to < atom.span.from ? " " : "") + atom.text,
    ""
  );
}

export function LiftographDocument_valueText(value: ILiftographValue): string {
  switch (value.type) {
    case "atoms":
      return joinAtoms(value.atoms);
    case "quoted":
      return value.content;
    case "list":
      return value.items.map((atom) => atom.text).join(", ");
    case "call": {
      const args = value.args.map((arg) =>
        arg.type === "named"
          ? `${arg.key.text}: ${arg.value != null ? LiftographDocument_valueText(arg.value) : ""}`
          : LiftographDocument_valueText(arg.value)
      );
      return `${value.name.text}(${args.join(", ")}${value.isClosed ? ")" : ""}`;
    }
  }
}

export function LiftographDocument_scripts(doc: ILiftographDocument): ILiftographScriptNode[] {
  const widgets = doc.items.flatMap((item) => (item.type === "row" ? item.items : [item]));
  return widgets.flatMap((item) =>
    item.type === "widget"
      ? [
          ...(item.script != null ? [item.script] : []),
          ...item.series.flatMap((s) => (s.script != null ? [s.script] : [])),
        ]
      : []
  );
}
