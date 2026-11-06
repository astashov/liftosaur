import { IEither } from "../utils/types";
import { LiftographDocument_parse } from "./liftographDocument";
import {
  ILiftographLayout,
  ILiftographLayoutRow,
  LiftographLayout_fitError,
  LiftographLayout_rowOf,
  LiftographLayout_slot,
} from "./liftographLayout";

export type ILiftographLayoutTarget =
  | { kind: "slot"; row: number; index: number }
  | { kind: "newRow"; before: number; isRow: boolean };

interface IGapPiece {
  type: "gap";
  lines: string[];
}

interface ISlotPiece {
  type: "slot";
  id?: number;
  kind: string;
  lines: string[];
}

type IBodyPiece = IGapPiece | ISlotPiece;

interface IRowPiece {
  type: "row";
  index?: number;
  isRow: boolean;
  head: string[];
  headIsText: boolean[];
  body: IBodyPiece[];
  close: string[];
}

type ITopPiece = IGapPiece | IRowPiece;

interface IModel {
  eol: string;
  top: ITopPiece[];
}

const ROW_INDENT = "  ";

function isBlank(line: string): boolean {
  return line.trim() === "";
}

function indentOf(line: string): string {
  return line.slice(0, line.length - line.trimStart().length);
}

function reindent(lines: string[], indent: string): string[] {
  const filled = lines.filter((line) => !isBlank(line));
  const common = Math.min(...filled.map((line) => indentOf(line).length));
  return lines.map((line) => (isBlank(line) ? line : indent + line.slice(common)));
}

function gap(lines: string[]): IGapPiece {
  return { type: "gap", lines };
}

function modelOf(layout: ILiftographLayout): IModel {
  const { lines } = layout;
  const top: ITopPiece[] = [];
  let cursor = 0;
  const pushGap = (list: IBodyPiece[] | ITopPiece[], from: number, to: number): void => {
    if (to >= from) {
      list.push(gap(lines.slice(from, to + 1)));
    }
  };
  const slotPiece = (row: ILiftographLayoutRow, i: number): ISlotPiece => {
    const slot = row.slots[i];
    return { type: "slot", id: slot.id, kind: slot.kind, lines: lines.slice(slot.lines.first, slot.lines.last + 1) };
  };
  for (const row of layout.rows) {
    pushGap(top, cursor, row.lines.first - 1);
    if (!row.isRow || row.openLine == null) {
      top.push({ type: "row", index: row.index, isRow: false, head: [], headIsText: [], body: [slotPiece(row, 0)], close: [] });
    } else {
      const body: IBodyPiece[] = [];
      let inner = row.openLine + 1;
      row.slots.forEach((slot, i) => {
        pushGap(body, inner, slot.lines.first - 1);
        body.push(slotPiece(row, i));
        inner = slot.lines.last + 1;
      });
      const bodyEnd = row.closeLine ?? row.lines.last + 1;
      pushGap(body, inner, bodyEnd - 1);
      top.push({
        type: "row",
        index: row.index,
        isRow: true,
        head: lines.slice(row.lines.first, row.openLine + 1),
        headIsText: layout.isText.slice(row.lines.first, row.openLine + 1),
        body,
        close: row.closeLine != null ? [lines[row.closeLine]] : [],
      });
    }
    cursor = row.lines.last + 1;
  }
  pushGap(top, cursor, lines.length - 1);
  return { eol: layout.eol, top };
}

function endsWithText(piece: ISlotPiece | IRowPiece): boolean {
  if (piece.type === "slot") {
    return piece.kind === "text";
  }
  const only = piece.body[0];
  return !piece.isRow && only?.type === "slot" && only.kind === "text";
}

function emitSequence(pieces: (IBodyPiece | IRowPiece)[], out: string[]): void {
  let isAfterText = false;
  for (const piece of pieces) {
    if (piece.type === "gap") {
      if (piece.lines.some(isBlank)) {
        isAfterText = false;
      }
      out.push(...piece.lines);
      continue;
    }
    if (isAfterText) {
      out.push("");
    }
    if (piece.type === "slot") {
      out.push(...piece.lines);
    } else {
      out.push(...piece.head);
      emitSequence(piece.body, out);
      out.push(...piece.close);
    }
    isAfterText = endsWithText(piece);
  }
}

function textOf(model: IModel): string {
  const out: string[] = [];
  emitSequence(model.top, out);
  return out.join(model.eol);
}

function rows(model: IModel): IRowPiece[] {
  return model.top.filter((piece): piece is IRowPiece => piece.type === "row");
}

function slots(row: IRowPiece): ISlotPiece[] {
  return row.body.filter((piece): piece is ISlotPiece => piece.type === "slot");
}

function findSlot(model: IModel, id: number): { row: IRowPiece; slot: ISlotPiece } | undefined {
  for (const row of rows(model)) {
    const slot = slots(row).find((s) => s.id === id);
    if (slot != null) {
      return { row, slot };
    }
  }
  return undefined;
}

function isGap(piece: { type: string } | undefined): piece is IGapPiece {
  return piece?.type === "gap";
}

function endsBlank(piece: IGapPiece): boolean {
  return piece.lines.length > 0 && isBlank(piece.lines[piece.lines.length - 1]);
}

function removeAt<T extends { type: string }>(list: (T | IGapPiece)[], index: number, isTop: boolean): void {
  list.splice(index, 1);
  const prev = list[index - 1];
  const next = list[index];
  if (isGap(prev) && isGap(next)) {
    const isDoubleBlank = endsBlank(prev) && next.lines.length > 0 && isBlank(next.lines[0]);
    list.splice(index - 1, 2, gap([...prev.lines, ...(isDoubleBlank ? next.lines.slice(1) : next.lines)]));
  } else if (isTop && index === 0 && isGap(next)) {
    const firstFilled = next.lines.findIndex((line) => !isBlank(line));
    list.splice(0, 1, ...(firstFilled >= 0 ? [gap(next.lines.slice(firstFilled))] : []));
  } else if (isTop && index === list.length && isGap(prev)) {
    const lastFilled = prev.lines.reduce((last, line, i) => (isBlank(line) ? last : i), -1);
    list.splice(index - 1, 1, ...(lastFilled >= 0 ? [gap(prev.lines.slice(0, lastFilled + 1))] : []));
  }
}

function containerIndent(row: IRowPiece): string {
  if (!row.isRow) {
    return "";
  }
  const first = slots(row)[0]?.lines.find((line) => !isBlank(line));
  return first != null ? indentOf(first) : indentOf(row.head[row.head.length - 1] ?? "") + ROW_INDENT;
}

function wrap(row: IRowPiece): void {
  if (row.isRow) {
    return;
  }
  row.isRow = true;
  row.head = ["row {"];
  row.headIsText = [false];
  row.body = row.body.map((piece) => (piece.type === "slot" ? { ...piece, lines: reindent(piece.lines, ROW_INDENT) } : piece));
  row.close = ["}"];
}

function removeSlot(model: IModel, row: IRowPiece, slot: ISlotPiece): void {
  removeAt(row.body, row.body.indexOf(slot), false);
  if (slots(row).length > 0) {
    return;
  }
  const at = model.top.indexOf(row);
  if (!row.isRow) {
    removeAt(model.top, at, true);
    return;
  }
  const kept = [
    ...row.head.slice(0, -1).filter((_line, i) => !row.headIsText[i]),
    ...row.body.flatMap((piece) => piece.lines),
  ];
  model.top.splice(at, 1, gap(kept));
  if (kept.length === 0) {
    removeAt(model.top, at, true);
  }
}

function newRow(piece: ISlotPiece, isRow: boolean): IRowPiece {
  return isRow
    ? {
        type: "row",
        isRow: true,
        head: ["row {"],
        headIsText: [false],
        body: [{ ...piece, lines: reindent(piece.lines, ROW_INDENT) }],
        close: ["}"],
      }
    : { type: "row", isRow: false, head: [], headIsText: [], body: [{ ...piece, lines: reindent(piece.lines, "") }], close: [] };
}

function insertRowAt(model: IModel, at: number, row: IRowPiece): void {
  if (model.top.every((piece) => isGap(piece) && piece.lines.every(isBlank))) {
    model.top = [row];
  } else if (at >= model.top.length) {
    const last = model.top[model.top.length - 1];
    model.top.push(...(isGap(last) && endsBlank(last) ? [] : [gap([""])]), row);
  } else {
    model.top.splice(at, 0, row, gap([""]));
  }
}

function insertPiece(model: IModel, target: ILiftographLayoutTarget, piece: ISlotPiece): void {
  if (target.kind === "newRow") {
    const before = rows(model).find((row) => row.index === target.before);
    insertRowAt(model, before != null ? model.top.indexOf(before) : model.top.length, newRow(piece, target.isRow));
    return;
  }
  const row = rows(model).find((r) => r.index === target.row);
  if (row == null) {
    return;
  }
  wrap(row);
  const moved = { ...piece, lines: reindent(piece.lines, containerIndent(row)) };
  const existing = slots(row);
  const anchor = existing[target.index];
  if (anchor != null) {
    row.body.splice(row.body.indexOf(anchor), 0, moved);
  } else {
    row.body.splice(row.body.indexOf(existing[existing.length - 1]) + 1, 0, moved);
  }
}

function kindsAfter(row: ILiftographLayoutRow, removeId?: number, add?: string): string[] {
  return [...row.slots.filter((s) => s.id !== removeId).map((s) => s.kind), ...(add != null ? [add] : [])];
}

function fitCheck(kinds: string[]): IEither<true, string> {
  const error = LiftographLayout_fitError(kinds);
  return error == null ? { success: true, data: true } : { success: false, error };
}

function isNoopMove(layout: ILiftographLayout, slotId: number, target: ILiftographLayoutTarget): boolean {
  const row = LiftographLayout_rowOf(layout, slotId);
  if (row == null) {
    return true;
  }
  if (target.kind === "newRow") {
    return !row.isRow && (target.before === row.index || target.before === row.index + 1) && !target.isRow;
  }
  const position = row.slots.findIndex((s) => s.id === slotId);
  return target.row === row.index && (target.index === position || target.index === position + 1);
}

export function LiftographLayoutEdit_delete(layout: ILiftographLayout, slotId: number): string {
  const model = modelOf(layout);
  const found = findSlot(model, slotId);
  if (found == null) {
    return layout.text;
  }
  removeSlot(model, found.row, found.slot);
  return textOf(model);
}

export function LiftographLayoutEdit_duplicate(layout: ILiftographLayout, slotId: number): string {
  const row = LiftographLayout_rowOf(layout, slotId);
  const slot = LiftographLayout_slot(layout, slotId);
  if (row == null || slot == null) {
    return layout.text;
  }
  const model = modelOf(layout);
  const found = findSlot(model, slotId);
  if (found == null) {
    return layout.text;
  }
  const copy: ISlotPiece = { type: "slot", kind: found.slot.kind, lines: found.slot.lines };
  if (row.isRow && fitCheck(kindsAfter(row, undefined, slot.kind)).success) {
    found.row.body.splice(found.row.body.indexOf(found.slot) + 1, 0, copy);
  } else {
    const at = model.top.indexOf(found.row) + 1;
    model.top.splice(at, 0, gap([""]), newRow(copy, false));
  }
  return textOf(model);
}

export function LiftographLayoutEdit_move(
  layout: ILiftographLayout,
  slotId: number,
  target: ILiftographLayoutTarget
): IEither<string, string> {
  const source = LiftographLayout_rowOf(layout, slotId);
  const slot = LiftographLayout_slot(layout, slotId);
  if (source == null || slot == null || isNoopMove(layout, slotId, target)) {
    return { success: true, data: layout.text };
  }
  if (target.kind === "slot" && target.row !== source.index) {
    const destination = layout.rows[target.row];
    if (destination == null) {
      return { success: false, error: "That row no longer exists" };
    }
    const fit = fitCheck(kindsAfter(destination, undefined, slot.kind));
    if (!fit.success) {
      return fit;
    }
  }
  const model = modelOf(layout);
  const found = findSlot(model, slotId);
  if (found == null) {
    return { success: true, data: layout.text };
  }
  insertPiece(model, target, { ...found.slot, id: undefined });
  removeSlot(model, found.row, found.slot);
  return { success: true, data: textOf(model) };
}

export function LiftographLayoutEdit_swap(
  layout: ILiftographLayout,
  slotId: number,
  otherId: number
): IEither<string, string> {
  const rowA = LiftographLayout_rowOf(layout, slotId);
  const rowB = LiftographLayout_rowOf(layout, otherId);
  const a = LiftographLayout_slot(layout, slotId);
  const b = LiftographLayout_slot(layout, otherId);
  if (rowA == null || rowB == null || a == null || b == null || slotId === otherId) {
    return { success: true, data: layout.text };
  }
  if (rowA.index !== rowB.index) {
    const fitA = fitCheck(kindsAfter(rowA, slotId, b.kind));
    if (!fitA.success) {
      return fitA;
    }
    const fitB = fitCheck(kindsAfter(rowB, otherId, a.kind));
    if (!fitB.success) {
      return fitB;
    }
  }
  const model = modelOf(layout);
  const foundA = findSlot(model, slotId);
  const foundB = findSlot(model, otherId);
  if (foundA == null || foundB == null) {
    return { success: true, data: layout.text };
  }
  const indentA = containerIndent(foundA.row);
  const indentB = containerIndent(foundB.row);
  const atA = foundA.row.body.indexOf(foundA.slot);
  const atB = foundB.row.body.indexOf(foundB.slot);
  foundA.row.body[atA] = { ...foundB.slot, lines: reindent(foundB.slot.lines, indentA) };
  foundB.row.body[atB] = { ...foundA.slot, lines: reindent(foundA.slot.lines, indentB) };
  return { success: true, data: textOf(model) };
}

export function LiftographLayoutEdit_splitRow(layout: ILiftographLayout, rowIndex: number, count: number): string {
  const row = layout.rows[rowIndex];
  if (row == null || count < 1 || row.slots.length <= count) {
    return layout.text;
  }
  const model = modelOf(layout);
  const piece = rows(model).find((r) => r.index === rowIndex);
  if (piece == null) {
    return layout.text;
  }
  const extras = slots(piece).slice(count);
  extras.forEach((extra) => removeAt(piece.body, piece.body.indexOf(extra), false));
  const moved: IRowPiece =
    extras.length === 1
      ? newRow(extras[0], false)
      : { ...newRow(extras[0], true), body: extras.map((e) => ({ ...e, lines: reindent(e.lines, ROW_INDENT) })) };
  model.top.splice(model.top.indexOf(piece) + 1, 0, gap([""]), moved);
  return textOf(model);
}

export function LiftographLayoutEdit_insert(
  layout: ILiftographLayout,
  target: ILiftographLayoutTarget,
  snippet: string
): IEither<string, string> {
  const item = LiftographDocument_parse(snippet).items[0];
  const kind = item == null ? undefined : item.type === "widget" ? item.kind : item.type === "text" ? "text" : undefined;
  if (kind == null) {
    return { success: false, error: "Nothing to insert" };
  }
  if (target.kind === "slot") {
    const destination = layout.rows[target.row];
    if (destination == null) {
      return { success: false, error: "That row no longer exists" };
    }
    const fit = fitCheck(kindsAfter(destination, undefined, kind));
    if (!fit.success) {
      return fit;
    }
  }
  const model = modelOf(layout);
  insertPiece(model, target, { type: "slot", kind, lines: snippet.split("\n") });
  return { success: true, data: textOf(model) };
}
