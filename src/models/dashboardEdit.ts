import {
  ILiftographLayout,
  ILiftographLayoutRow,
  ILiftographLayoutSlot,
  LiftographLayout_fits,
  LiftographLayout_maxRowItems,
  LiftographLayout_rowOf,
  LiftographLayout_slot,
} from "../liftograph/liftographLayout";
import {
  ILiftographLayoutTarget,
  LiftographLayoutEdit_delete,
  LiftographLayoutEdit_duplicate,
  LiftographLayoutEdit_insert,
  LiftographLayoutEdit_move,
  LiftographLayoutEdit_splitRow,
  LiftographLayoutEdit_swap,
} from "../liftograph/liftographLayoutEdit";
import {
  LiftographCompletions_calendarTemplate,
  LiftographCompletions_musclesTemplate,
} from "../liftograph/liftographCompletions";
import { IEither } from "../utils/types";
import type { ILiftographCompiled, ILiftographWidget } from "../liftograph/liftographCompile";
import type { IDashboardDrop } from "./dashboardDrop";

export type IDashboardReservation =
  | { kind: "row"; row: number; count: number }
  | { kind: "newRow"; before: number; count: number };

export interface IDashboardReservations {
  text: string;
  items: IDashboardReservation[];
}

export type IDashboardEditCell =
  | { type: "slot"; slot: ILiftographLayoutSlot }
  | { type: "empty"; target: ILiftographLayoutTarget; kinds: string[] };

export interface IDashboardEditRow {
  key: string;
  row?: ILiftographLayoutRow;
  before: number;
  cells: IDashboardEditCell[];
  count: number;
  counts: { count: number; isAllowed: boolean }[];
}

export type IDashboardEditAction =
  | { type: "delete"; slotId: number }
  | { type: "duplicate"; slotId: number }
  | { type: "edit"; slotId: number }
  | { type: "drop"; slotId: number; drop: IDashboardDrop }
  | { type: "setCount"; rowKey: string; count: number }
  | { type: "addRow"; before: number; count: number }
  | { type: "cancelRow"; before: number }
  | { type: "insert"; target: ILiftographLayoutTarget; kind: string };

export type IDashboardEditEffect = { type: "openEditor"; caret: number } | { type: "alert"; message: string };

export interface IDashboardEditResult {
  text: string;
  reservations: IDashboardReservations;
  effect?: IDashboardEditEffect;
}

export const DashboardEdit_kinds: readonly string[] = ["graph", "value", "muscles", "calendar", "text"];

const COUNTS = [1, 2, 3, 4];

export function DashboardEdit_template(kind: string): string {
  switch (kind) {
    case "graph":
      return "graph / range: 3m {\n  name: Volume / source: workout / y: volume\n}";
    case "value":
      return "value / name: Volume / source: workout / compare: 4w";
    case "muscles":
      return LiftographCompletions_musclesTemplate;
    case "calendar":
      return LiftographCompletions_calendarTemplate;
    default:
      return "// Text";
  }
}

export function DashboardEdit_widgets(layout: ILiftographCompiled["layout"]): Map<number, ILiftographWidget> {
  return new Map(
    layout.flatMap((row) => row.items.map((widget): [number, ILiftographWidget] => [widget.span.from, widget]))
  );
}

export function DashboardEdit_reservations(text: string): IDashboardReservations {
  return { text, items: [] };
}

function validItems(layout: ILiftographLayout, reservations: IDashboardReservations): IDashboardReservation[] {
  return reservations.text === layout.text ? reservations.items : [];
}

function kindsFitting(existing: string[], count: number): string[] {
  return DashboardEdit_kinds.filter((kind) => LiftographLayout_fits([...existing, kind], count));
}

function rowKey(row: ILiftographLayoutRow): string {
  return `r${row.index}`;
}

function newRowKey(before: number): string {
  return `n${before}`;
}

function layoutRow(row: ILiftographLayoutRow, reserved: number | undefined): IDashboardEditRow {
  const existing = row.slots.map((slot) => slot.kind);
  const count = Math.max(row.slots.length, reserved ?? 0);
  const empties: IDashboardEditCell[] = Array.from({ length: count - row.slots.length }, () => ({
    type: "empty",
    target: { kind: "slot", row: row.index, index: row.slots.length },
    kinds: kindsFitting(existing, count),
  }));
  return {
    key: rowKey(row),
    row,
    before: row.index,
    cells: [...row.slots.map((slot): IDashboardEditCell => ({ type: "slot", slot })), ...empties],
    count,
    counts: COUNTS.map((c) => ({ count: c, isAllowed: c <= row.slots.length || LiftographLayout_fits(existing, c) })),
  };
}

function reservedRow(before: number, count: number): IDashboardEditRow {
  return {
    key: newRowKey(before),
    before,
    cells: Array.from({ length: count }, () => ({
      type: "empty",
      target: { kind: "newRow", before, isRow: count > 1 },
      kinds: kindsFitting([], count),
    })),
    count,
    counts: COUNTS.map((c) => ({ count: c, isAllowed: true })),
  };
}

export function DashboardEdit_rows(
  layout: ILiftographLayout,
  reservations: IDashboardReservations
): IDashboardEditRow[] {
  const items = validItems(layout, reservations);
  const result: IDashboardEditRow[] = [];
  const pushReserved = (before: number): void => {
    items.forEach((item) => {
      if (item.kind === "newRow" && item.before === before) {
        result.push(reservedRow(before, item.count));
      }
    });
  };
  layout.rows.forEach((row) => {
    pushReserved(row.index);
    const reserved = items.find((item) => item.kind === "row" && item.row === row.index);
    result.push(layoutRow(row, reserved?.count));
  });
  pushReserved(layout.rows.length);
  return result;
}

function sameTarget(a: ILiftographLayoutTarget, b: ILiftographLayoutTarget): boolean {
  if (a.kind === "slot" && b.kind === "slot") {
    return a.row === b.row && a.index === b.index;
  }
  return a.kind === "newRow" && b.kind === "newRow" && a.before === b.before && a.isRow === b.isRow;
}

export function DashboardEdit_kindsFor(rows: IDashboardEditRow[], target: ILiftographLayoutTarget): string[] {
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.type === "empty" && sameTarget(cell.target, target)) {
        return cell.kinds;
      }
    }
  }
  if (target.kind === "newRow") {
    return kindsFitting([], 1);
  }
  const row = rows.find((r) => r.row?.index === target.row);
  return row?.row != null
    ? kindsFitting(
        row.row.slots.map((s) => s.kind),
        row.row.slots.length + 1
      )
    : [];
}

function unchanged(
  layout: ILiftographLayout,
  reservations: IDashboardReservations,
  effect?: IDashboardEditEffect
): IDashboardEditResult {
  return { text: layout.text, reservations, effect };
}

function written(text: string, items: IDashboardReservation[] = []): IDashboardEditResult {
  return { text, reservations: { text, items } };
}

function fromEither(
  layout: ILiftographLayout,
  reservations: IDashboardReservations,
  result: IEither<string, string>
): IDashboardEditResult {
  if (!result.success) {
    return unchanged(layout, reservations, { type: "alert", message: result.error });
  }
  return result.data === layout.text ? unchanged(layout, reservations) : written(result.data);
}

function keptReservation(
  layout: ILiftographLayout,
  reservations: IDashboardReservations,
  target: ILiftographLayoutTarget,
  source?: ILiftographLayoutRow
): IDashboardReservation[] {
  const items = validItems(layout, reservations);
  const reserved =
    target.kind === "newRow"
      ? items.find((item) => item.kind === "newRow" && item.before === target.before)
      : items.find((item) => item.kind === "row" && item.row === target.row);
  if (reserved == null) {
    return [];
  }
  const rowIndex = target.kind === "newRow" ? target.before : target.row;
  const isSameRow = target.kind === "slot" && source?.index === target.row;
  const filled = target.kind === "newRow" ? 1 : (layout.rows[target.row]?.slots.length ?? 0) + (isSameRow ? 0 : 1);
  const shift = source != null && source.slots.length === 1 && source.index < rowIndex ? 1 : 0;
  return reserved.count > filled ? [{ kind: "row", row: rowIndex - shift, count: reserved.count }] : [];
}

function applyDrop(
  layout: ILiftographLayout,
  reservations: IDashboardReservations,
  slotId: number,
  drop: IDashboardDrop
): IDashboardEditResult {
  switch (drop.kind) {
    case "move": {
      const moved = LiftographLayoutEdit_move(layout, slotId, drop.target);
      const result = fromEither(layout, reservations, moved);
      if (!moved.success || result.text === layout.text) {
        return result;
      }
      const source = LiftographLayout_rowOf(layout, slotId);
      return written(result.text, keptReservation(layout, reservations, drop.target, source));
    }
    case "swap":
      return fromEither(layout, reservations, LiftographLayoutEdit_swap(layout, slotId, drop.slotId));
    case "reject":
      return fromEither(layout, reservations, LiftographLayoutEdit_move(layout, slotId, drop.fallback));
    case "none":
      return unchanged(layout, reservations);
  }
}

function setCount(
  layout: ILiftographLayout,
  reservations: IDashboardReservations,
  key: string,
  count: number
): IDashboardEditResult {
  const items = validItems(layout, reservations);
  const row = DashboardEdit_rows(layout, reservations).find((r) => r.key === key);
  const allowed = row?.counts.find((c) => c.count === count)?.isAllowed ?? false;
  if (row == null || !allowed || count < 1 || count > LiftographLayout_maxRowItems) {
    return unchanged(layout, reservations);
  }
  if (row.row == null) {
    const next = items.map((item) =>
      item.kind === "newRow" && item.before === row.before ? { ...item, count } : item
    );
    return { text: layout.text, reservations: { text: layout.text, items: next } };
  }
  const index = row.row.index;
  if (count < row.row.slots.length) {
    return written(LiftographLayoutEdit_splitRow(layout, index, count));
  }
  const others = items.filter((item) => !(item.kind === "row" && item.row === index));
  const next = count > row.row.slots.length ? [...others, { kind: "row" as const, row: index, count }] : others;
  return { text: layout.text, reservations: { text: layout.text, items: next } };
}

function insert(
  layout: ILiftographLayout,
  reservations: IDashboardReservations,
  target: ILiftographLayoutTarget,
  kind: string
): IDashboardEditResult {
  const rows = DashboardEdit_rows(layout, reservations);
  if (DashboardEdit_kindsFor(rows, target).indexOf(kind) === -1) {
    return unchanged(layout, reservations, { type: "alert", message: `A ${kind} does not fit here` });
  }
  const result = LiftographLayoutEdit_insert(layout, target, DashboardEdit_template(kind));
  if (!result.success) {
    return unchanged(layout, reservations, { type: "alert", message: result.error });
  }
  return written(result.data, keptReservation(layout, reservations, target));
}

export function DashboardEdit_apply(
  layout: ILiftographLayout,
  reservations: IDashboardReservations,
  action: IDashboardEditAction
): IDashboardEditResult {
  switch (action.type) {
    case "delete":
      return written(LiftographLayoutEdit_delete(layout, action.slotId));
    case "duplicate":
      return written(LiftographLayoutEdit_duplicate(layout, action.slotId));
    case "edit": {
      const slot = LiftographLayout_slot(layout, action.slotId);
      return unchanged(layout, reservations, slot != null ? { type: "openEditor", caret: slot.caret } : undefined);
    }
    case "drop":
      return applyDrop(layout, reservations, action.slotId, action.drop);
    case "setCount":
      return setCount(layout, reservations, action.rowKey, action.count);
    case "addRow": {
      const items = validItems(layout, reservations).filter(
        (i) => !(i.kind === "newRow" && i.before === action.before)
      );
      const added: IDashboardReservation = { kind: "newRow", before: action.before, count: action.count };
      return { text: layout.text, reservations: { text: layout.text, items: [...items, added] } };
    }
    case "cancelRow": {
      const items = validItems(layout, reservations).filter(
        (i) => !(i.kind === "newRow" && i.before === action.before)
      );
      return { text: layout.text, reservations: { text: layout.text, items } };
    }
    case "insert":
      return insert(layout, reservations, action.target, action.kind);
  }
}
