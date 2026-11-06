import "mocha";
import { expect } from "chai";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { LiftographLayout_build } from "../src/liftograph/liftographLayout";
import {
  DashboardEdit_apply,
  DashboardEdit_reservations,
  DashboardEdit_rows,
  IDashboardEditRow,
} from "../src/models/dashboardEdit";
import {
  DashboardDrop_at,
  DashboardDrop_cellOf,
  DashboardDrop_grabFraction,
  IDashboardDrop,
  IDashboardDropCell,
} from "../src/models/dashboardDrop";

function cellsOf(rows: IDashboardEditRow[], width: number): IDashboardDropCell[] {
  const gap = 8;
  return rows.flatMap((row, rowIndex) => {
    const cellWidth = (width - gap * (row.cells.length - 1)) / row.cells.length;
    const y = 20 + rowIndex * 92;
    return row.cells.map((_cell, cellIndex) => ({
      rowKey: row.key,
      cellIndex,
      x: cellIndex * (cellWidth + gap),
      y,
      width: cellWidth,
      height: 64,
    }));
  });
}

function rowsOf(text: string, reserve?: { rowKey: string; count: number }): IDashboardEditRow[] {
  const layout = LiftographLayout_build(LiftographDocument_parse(text));
  const reservations = reserve
    ? DashboardEdit_apply(layout, DashboardEdit_reservations(text), { type: "setCount", ...reserve }).reservations
    : DashboardEdit_reservations(text);
  return DashboardEdit_rows(layout, reservations);
}

function dropAt(rows: IDashboardEditRow[], slotId: number, x: number, y: number): IDashboardDrop {
  return DashboardDrop_at(rows, cellsOf(rows, 208), slotId, { x, y });
}

const text = "calendar\n\nrow {\n  value / source: workout\n  value / source: workout\n}";

describe("DashboardDrop_cellOf", () => {
  it("finds the measured cell of a slot", () => {
    const rows = rowsOf(text);
    expect(DashboardDrop_cellOf(rows, cellsOf(rows, 208), 2)).to.eql({
      rowKey: "r1",
      cellIndex: 1,
      x: 108,
      y: 112,
      width: 100,
      height: 64,
    });
    expect(DashboardDrop_cellOf(rows, cellsOf(rows, 208), 99)).to.equal(undefined);
  });
});

describe("DashboardDrop_grabFraction", () => {
  it("places the grab point inside the cell as a fraction, clamped to its edges", () => {
    const cell = { rowKey: "r0", cellIndex: 0, x: 100, y: 50, width: 200, height: 100 };
    expect(DashboardDrop_grabFraction({ x: 150, y: 100 }, cell)).to.eql({ x: 0.25, y: 0.5 });
    expect(DashboardDrop_grabFraction({ x: 400, y: 0 }, cell)).to.eql({ x: 1, y: 0 });
    expect(DashboardDrop_grabFraction({ x: 0, y: 0 }, { ...cell, width: 0, height: 0 })).to.eql({ x: 0.5, y: 0.5 });
  });
});

describe("DashboardDrop_at", () => {
  it("reads measured cells in any order", () => {
    const rows = rowsOf(text);
    const cells = cellsOf(rows, 208).reverse();
    expect(DashboardDrop_at(rows, cells, 1, { x: 150, y: 130 })).to.eql({
      kind: "swap",
      slotId: 2,
      spot: { rowKey: "r1", cellIndex: 1 },
    });
  });

  it("does nothing over the dragged tile itself", () => {
    expect(dropAt(rowsOf(text), 0, 50, 40)).to.eql({ kind: "none" });
  });

  it("swaps with a widget of a full row when both rows still fit", () => {
    expect(dropAt(rowsOf(text), 1, 150, 130)).to.eql({ kind: "swap", slotId: 2, spot: { rowKey: "r1", cellIndex: 1 } });
    expect(dropAt(rowsOf(text), 1, 50, 40)).to.eql({ kind: "swap", slotId: 0, spot: { rowKey: "r0", cellIndex: 0 } });
  });

  it("rejects a swap that makes a row too narrow and offers a new row below", () => {
    const three =
      "calendar\n\nrow {\n  value / source: workout\n  value / source: workout\n  value / source: workout\n}";
    expect(dropAt(rowsOf(three), 0, 32, 130)).to.eql({
      kind: "reject",
      reason: "A calendar needs at least 1/2 of the row",
      fallback: { kind: "newRow", before: 2, isRow: false },
      spot: { rowKey: "r1", cellIndex: 0 },
    });
  });

  it("moves into an empty slot and into a new row from a row header or the end", () => {
    const rows = rowsOf("calendar\n\ncalendar", { rowKey: "r1", count: 2 });
    expect(dropAt(rows, 0, 150, 130)).to.eql({
      kind: "move",
      target: { kind: "slot", row: 1, index: 1 },
      spot: { rowKey: "r1", cellIndex: 1 },
    });
    expect(dropAt(rows, 1, 50, 95)).to.eql({
      kind: "move",
      target: { kind: "newRow", before: 1, isRow: false },
      spot: { rowKey: "r1" },
    });
    expect(dropAt(rows, 0, 50, 400)).to.eql({
      kind: "move",
      target: { kind: "newRow", before: 2, isRow: false },
      spot: { rowKey: "end" },
    });
  });

  const values = "value / source: workout\n\nrow {\n  value / source: workout\n  value / source: workout\n}";

  it("inserts at the edge of a cell when the row has room for one more", () => {
    expect(dropAt(rowsOf(values), 0, 200, 130)).to.eql({
      kind: "move",
      target: { kind: "slot", row: 1, index: 2 },
      spot: { rowKey: "r1", cellIndex: 1, edge: "end" },
    });
    expect(dropAt(rowsOf(values), 0, 110, 130)).to.eql({
      kind: "move",
      target: { kind: "slot", row: 1, index: 1 },
      spot: { rowKey: "r1", cellIndex: 1, edge: "start" },
    });
  });

  it("rejects an edge insert that breaks the width rule and offers a new row below", () => {
    expect(dropAt(rowsOf(text), 0, 200, 130)).to.eql({
      kind: "reject",
      reason: "A calendar needs at least 1/2 of the row",
      fallback: { kind: "newRow", before: 2, isRow: false },
      spot: { rowKey: "r1", cellIndex: 1, edge: "end" },
    });
    const four = `row {\n${"  value / source: workout\n".repeat(4)}}\n\nvalue / source: workout`;
    const rows = rowsOf(four);
    expect(dropAt(rows, 4, 200, 40)).to.include({ kind: "reject", reason: "A row holds at most 4 items" });
  });

  it("reorders inside a row from an edge and ignores the edges next to the dragged widget", () => {
    expect(dropAt(rowsOf(values), 1, 200, 130)).to.eql({
      kind: "move",
      target: { kind: "slot", row: 1, index: 2 },
      spot: { rowKey: "r1", cellIndex: 1, edge: "end" },
    });
    expect(dropAt(rowsOf(values), 1, 110, 130)).to.eql({ kind: "none" });
  });

  it("turns a single widget into a row when another widget lands on its edge", () => {
    const layout = LiftographLayout_build(LiftographDocument_parse(values));
    const reservations = DashboardEdit_reservations(values);
    const rows = DashboardEdit_rows(layout, reservations);
    const drop = DashboardDrop_at(rows, cellsOf(rows, 208), 2, { x: 200, y: 40 });
    const result = DashboardEdit_apply(layout, reservations, { type: "drop", slotId: 2, drop });
    expect(result.text).to.equal(
      "row {\n  value / source: workout\n  value / source: workout\n}\n\nrow {\n  value / source: workout\n}"
    );
  });
});
