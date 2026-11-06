import { LiftographLayout_fitError } from "../liftograph/liftographLayout";
import { ILiftographLayoutTarget } from "../liftograph/liftographLayoutEdit";
import type { IDashboardEditRow } from "./dashboardEdit";
import type { IDragPoint } from "./dragPress";

export type { IDragPoint } from "./dragPress";

export interface IDashboardDropCell {
  rowKey: string;
  cellIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type IDashboardDropEdge = "start" | "end";

export interface IDashboardDropSpot {
  rowKey: string;
  cellIndex?: number;
  edge?: IDashboardDropEdge;
}

export type IDashboardDrop =
  | { kind: "move"; target: ILiftographLayoutTarget; spot: IDashboardDropSpot }
  | { kind: "swap"; slotId: number; spot: IDashboardDropSpot }
  | { kind: "reject"; reason: string; fallback: ILiftographLayoutTarget; spot: IDashboardDropSpot }
  | { kind: "none" };

export const DashboardDrop_endKey = "end";

const EDGE_SHARE = 0.25;
const EDGE_MAX = 40;

function afterRow(row: IDashboardEditRow): number {
  return row.row != null ? row.row.index + 1 : row.before;
}

function kindsOf(row: IDashboardEditRow, replaceId: number, kind: string): string[] {
  return row.cells.flatMap((cell) =>
    cell.type === "slot" ? [cell.slot.id === replaceId ? kind : cell.slot.kind] : []
  );
}

function overCell(
  rows: IDashboardEditRow[],
  row: IDashboardEditRow,
  cellIndex: number,
  slotId: number
): IDashboardDrop {
  const spot = { rowKey: row.key, cellIndex };
  const source = rows.find((r) => r.cells.some((c) => c.type === "slot" && c.slot.id === slotId));
  const dragged = source?.cells.find((c) => c.type === "slot" && c.slot.id === slotId);
  const cell = row.cells[cellIndex];
  if (source == null || dragged?.type !== "slot" || cell == null) {
    return { kind: "none" };
  }
  const kind = dragged.slot.kind;
  const fallback: ILiftographLayoutTarget = { kind: "newRow", before: afterRow(row), isRow: false };
  if (cell.type === "slot") {
    if (cell.slot.id === slotId) {
      return { kind: "none" };
    }
    if (source.key !== row.key) {
      const reason =
        LiftographLayout_fitError(kindsOf(row, cell.slot.id, kind), row.count) ??
        LiftographLayout_fitError(kindsOf(source, slotId, cell.slot.kind), source.count);
      if (reason != null) {
        return { kind: "reject", reason, fallback, spot };
      }
    }
    return { kind: "swap", slotId: cell.slot.id, spot };
  }
  if (source.key === row.key || cell.kinds.indexOf(kind) !== -1) {
    return { kind: "move", target: cell.target, spot };
  }
  const reason =
    LiftographLayout_fitError([...kindsOf(row, -1, kind), kind], row.count) ?? `A ${kind} does not fit here`;
  return { kind: "reject", reason, fallback, spot };
}

function edgeOf(cell: IDashboardDropCell, x: number): IDashboardDropEdge | undefined {
  const size = Math.min(cell.width * EDGE_SHARE, EDGE_MAX);
  if (x < cell.x + size) {
    return "start";
  }
  return x > cell.x + cell.width - size ? "end" : undefined;
}

function overEdge(
  rows: IDashboardEditRow[],
  row: IDashboardEditRow,
  cellIndex: number,
  edge: IDashboardDropEdge,
  slotId: number
): IDashboardDrop {
  const source = rows.find((r) => r.cells.some((c) => c.type === "slot" && c.slot.id === slotId));
  const dragged = source?.cells.find((c) => c.type === "slot" && c.slot.id === slotId);
  if (row.row == null || source == null || dragged?.type !== "slot") {
    return { kind: "none" };
  }
  const spot = { rowKey: row.key, cellIndex, edge };
  const index = edge === "start" ? cellIndex : cellIndex + 1;
  const target: ILiftographLayoutTarget = { kind: "slot", row: row.row.index, index };
  if (source.key === row.key) {
    const position = row.cells.indexOf(dragged);
    return index === position || index === position + 1 ? { kind: "none" } : { kind: "move", target, spot };
  }
  const kinds = [...kindsOf(row, -1, dragged.slot.kind), dragged.slot.kind];
  const reason = LiftographLayout_fitError(kinds, Math.max(row.count, kinds.length));
  if (reason != null) {
    return { kind: "reject", reason, fallback: { kind: "newRow", before: afterRow(row), isRow: false }, spot };
  }
  return { kind: "move", target, spot };
}

export function DashboardDrop_cellOf(
  rows: IDashboardEditRow[],
  cells: IDashboardDropCell[],
  slotId: number
): IDashboardDropCell | undefined {
  for (const row of rows) {
    const cellIndex = row.cells.findIndex((cell) => cell.type === "slot" && cell.slot.id === slotId);
    if (cellIndex !== -1) {
      return cells.find((cell) => cell.rowKey === row.key && cell.cellIndex === cellIndex);
    }
  }
  return undefined;
}

export function DashboardDrop_grabFraction(point: IDragPoint, cell: IDashboardDropCell): IDragPoint {
  const fraction = (offset: number, size: number): number => (size > 0 ? Math.min(1, Math.max(0, offset / size)) : 0.5);
  return { x: fraction(point.x - cell.x, cell.width), y: fraction(point.y - cell.y, cell.height) };
}

export function DashboardDrop_at(
  rows: IDashboardEditRow[],
  cells: IDashboardDropCell[],
  slotId: number,
  point: IDragPoint
): IDashboardDrop {
  for (const row of rows) {
    const rowCells = cells.filter((cell) => cell.rowKey === row.key).sort((a, b) => a.cellIndex - b.cellIndex);
    const first = rowCells[0];
    if (first == null) {
      continue;
    }
    if (point.y < first.y) {
      return { kind: "move", target: { kind: "newRow", before: row.before, isRow: false }, spot: { rowKey: row.key } };
    }
    if (point.y < first.y + first.height) {
      const hit = rowCells.find((cell) => point.x < cell.x + cell.width) ?? rowCells[rowCells.length - 1];
      const edge = edgeOf(hit, point.x);
      if (edge != null && row.cells[hit.cellIndex]?.type === "slot") {
        return overEdge(rows, row, hit.cellIndex, edge, slotId);
      }
      return overCell(rows, row, hit.cellIndex, slotId);
    }
  }
  const last = rows[rows.length - 1];
  const before = last != null ? afterRow(last) : 0;
  return { kind: "move", target: { kind: "newRow", before, isRow: false }, spot: { rowKey: DashboardDrop_endKey } };
}
