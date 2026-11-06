import {
  ILiftographDocument,
  ILiftographRowItem,
  ILiftographSpan,
  ILiftographTextItem,
  ILiftographWidgetItem,
} from "./liftographDocument";
import * as T from "./liftographParser.terms";

export interface ILiftographLineRange {
  first: number;
  last: number;
}

export interface ILiftographLayoutSlot {
  id: number;
  kind: string;
  itemFrom: number;
  caret: number;
  span: ILiftographSpan;
  lines: ILiftographLineRange;
}

export interface ILiftographLayoutRow {
  index: number;
  isRow: boolean;
  slots: ILiftographLayoutSlot[];
  span: ILiftographSpan;
  lines: ILiftographLineRange;
  openLine?: number;
  closeLine?: number;
}

export interface ILiftographLayout {
  text: string;
  lines: string[];
  eol: string;
  isText: boolean[];
  rows: ILiftographLayoutRow[];
}

export const LiftographLayout_maxRowItems = 4;

export function LiftographLayout_minShare(kind: string): 2 | 4 {
  return kind === "graph" || kind === "muscles" || kind === "calendar" ? 2 : 4;
}

export function LiftographLayout_fits(kinds: string[], count: number = kinds.length): boolean {
  return (
    kinds.length <= count &&
    count <= LiftographLayout_maxRowItems &&
    kinds.every((kind) => count <= LiftographLayout_minShare(kind))
  );
}

export function LiftographLayout_fitError(kinds: string[], count: number = kinds.length): string | undefined {
  if (count > LiftographLayout_maxRowItems) {
    return `A row holds at most ${LiftographLayout_maxRowItems} items`;
  }
  const tooWide = kinds.find((kind) => count > LiftographLayout_minShare(kind));
  return tooWide != null ? `A ${tooWide} needs at least 1/${LiftographLayout_minShare(tooWide)} of the row` : undefined;
}

function lineTypes(doc: ILiftographDocument): (number | undefined)[] {
  const types: (number | undefined)[] = [];
  let index = 0;
  for (let node = doc.tree.topNode.firstChild; node != null; node = node.nextSibling) {
    if (node.type.id === T.LineBreak) {
      index += 1;
    } else if (node.type.id === T.Line && types[index] == null) {
      types[index] = node.firstChild?.type.id;
    }
  }
  return types;
}

export function LiftographLayout_build(doc: ILiftographDocument): ILiftographLayout {
  const text = doc.text;
  const spans = doc.lines.map((line) => line.span);
  const lines = spans.map((span, i) =>
    i + 1 < spans.length ? text.slice(span.from, spans[i + 1].from).replace(/\r?\n$/, "") : text.slice(span.from, span.to)
  );
  const eol = spans.length > 1 && text.slice(spans[0].from, spans[1].from).endsWith("\r\n") ? "\r\n" : "\n";
  const types = lineTypes(doc);
  const isText = lines.map((_line, i) => types[i] === T.TextLine);
  const isHidden = lines.map((_line, i) => types[i] === T.HiddenLine);

  function lineAt(pos: number): number {
    let lo = 0;
    let hi = spans.length - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (spans[mid].from <= pos) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }

  function withHiddenAbove(first: number): number {
    let line = first;
    while (line > 0 && isHidden[line - 1]) {
      line -= 1;
    }
    return line;
  }

  function range(from: number, to: number, caption?: ILiftographTextItem): ILiftographLineRange {
    const head = caption != null ? Math.min(lineAt(caption.span.from), lineAt(from)) : lineAt(from);
    return { first: withHiddenAbove(head), last: lineAt(to) };
  }

  function spanOf(lineRange: ILiftographLineRange): ILiftographSpan {
    return { from: spans[lineRange.first].from, to: spans[lineRange.last].to };
  }

  let nextId = 0;
  function slotOf(item: ILiftographWidgetItem | ILiftographTextItem): ILiftographLayoutSlot {
    const lineRange = range(item.span.from, item.span.to, item.type === "widget" ? item.caption : undefined);
    const slot: ILiftographLayoutSlot = {
      id: nextId,
      kind: item.type === "widget" ? item.kind : "text",
      itemFrom: item.span.from,
      caret: item.type === "widget" ? item.kindSpan.from : item.span.from,
      span: spanOf(lineRange),
      lines: lineRange,
    };
    nextId += 1;
    return slot;
  }

  function blockRow(item: ILiftographRowItem, index: number): ILiftographLayoutRow {
    const lineRange = range(item.span.from, item.span.to, item.caption);
    const slots = item.items.map(slotOf);
    const lastSlotLine = slots[slots.length - 1].lines.last;
    const closeLine = lineRange.last > lastSlotLine && types[lineRange.last] === T.CloseLine ? lineRange.last : undefined;
    return {
      index,
      isRow: true,
      slots,
      span: spanOf(lineRange),
      lines: lineRange,
      openLine: lineAt(item.span.from),
      closeLine,
    };
  }

  const rows: ILiftographLayoutRow[] = [];
  for (const item of doc.items) {
    if (item.type === "row") {
      if (item.items.length > 0) {
        rows.push(blockRow(item, rows.length));
      }
    } else {
      const slot = slotOf(item);
      rows.push({ index: rows.length, isRow: false, slots: [slot], span: slot.span, lines: slot.lines });
    }
  }
  return { text, lines, eol, isText, rows };
}

export function LiftographLayout_slot(layout: ILiftographLayout, slotId: number): ILiftographLayoutSlot | undefined {
  for (const row of layout.rows) {
    const slot = row.slots.find((s) => s.id === slotId);
    if (slot != null) {
      return slot;
    }
  }
  return undefined;
}

export function LiftographLayout_rowOf(layout: ILiftographLayout, slotId: number): ILiftographLayoutRow | undefined {
  return layout.rows.find((row) => row.slots.some((s) => s.id === slotId));
}
