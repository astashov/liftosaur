import "mocha";
import { expect } from "chai";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { ILiftographLayout, LiftographLayout_build } from "../src/liftograph/liftographLayout";
import { LiftographCompile_document } from "../src/liftograph/liftographCompile";
import {
  DashboardEdit_apply,
  DashboardEdit_kinds,
  DashboardEdit_kindsFor,
  DashboardEdit_widgets,
  DashboardEdit_reservations,
  DashboardEdit_rows,
  DashboardEdit_template,
  IDashboardEditAction,
  IDashboardEditResult,
  IDashboardReservations,
} from "../src/models/dashboardEdit";
import { fxSettings } from "./liftographFixtures";

function layout(text: string): ILiftographLayout {
  return LiftographLayout_build(LiftographDocument_parse(text));
}

function apply(
  text: string,
  action: IDashboardEditAction,
  reservations?: IDashboardReservations
): IDashboardEditResult {
  return DashboardEdit_apply(layout(text), reservations ?? DashboardEdit_reservations(text), action);
}

const two = "row {\n  value / source: workout\n  value / source: workout\n}";

describe("DashboardEdit_template", () => {
  it("compiles every kind without a diagnostic", () => {
    DashboardEdit_kinds.forEach((kind) => {
      const compiled = LiftographCompile_document(LiftographDocument_parse(DashboardEdit_template(kind)), fxSettings());
      expect(
        compiled.diagnostics.map((d) => d.message),
        kind
      ).to.eql([]);
    });
  });
});

describe("DashboardEdit_rows", () => {
  it("shows reserved slots and only the kinds that fit them", () => {
    const raised = apply(two, { type: "setCount", rowKey: "r0", count: 3 });
    expect(raised.text).to.equal(two);
    const rows = DashboardEdit_rows(layout(two), raised.reservations);
    expect(rows[0].cells.map((c) => c.type)).to.eql(["slot", "slot", "empty"]);
    const empty = rows[0].cells[2];
    expect(empty.type === "empty" ? empty.kinds : []).to.eql(["value", "text"]);
    expect(rows[0].counts.map((c) => c.isAllowed)).to.eql([true, true, true, true]);
  });

  it("strikes counts the existing widgets cannot take", () => {
    const rows = DashboardEdit_rows(layout("calendar"), DashboardEdit_reservations("calendar"));
    expect(rows[0].counts.map((c) => c.isAllowed)).to.eql([true, true, false, false]);
  });

  it("drops reservations made against older text", () => {
    const raised = apply(two, { type: "setCount", rowKey: "r0", count: 3 });
    const other = two + "\n\ncalendar";
    expect(DashboardEdit_rows(layout(other), raised.reservations)[0].cells.length).to.equal(2);
  });
});

describe("DashboardEdit_apply", () => {
  it("keeps a new row's reservation while it fills up", () => {
    const added = apply("calendar", { type: "addRow", before: 1, count: 3 });
    const rows = DashboardEdit_rows(layout("calendar"), added.reservations);
    expect(rows.map((r) => r.key)).to.eql(["r0", "n1"]);
    const inserted = apply(
      "calendar",
      { type: "insert", target: { kind: "newRow", before: 1, isRow: true }, kind: "value" },
      added.reservations
    );
    expect(inserted.text).to.equal(`calendar\n\nrow {\n  ${DashboardEdit_template("value")}\n}`);
    const next = DashboardEdit_rows(layout(inserted.text), inserted.reservations);
    expect(next[1].cells.map((c) => c.type)).to.eql(["slot", "empty", "empty"]);
  });

  it("keeps a row's other empty slots when a drop fills one of them", () => {
    const text = "value / source: workout\n\nvalue / source: workout";
    const raised = apply(text, { type: "setCount", rowKey: "r1", count: 4 });
    const drop = {
      kind: "move" as const,
      target: { kind: "slot" as const, row: 1, index: 1 },
      spot: { rowKey: "r1", cellIndex: 1 },
    };
    const dropped = apply(text, { type: "drop", slotId: 0, drop }, raised.reservations);
    const rows = DashboardEdit_rows(layout(dropped.text), dropped.reservations);
    expect(rows.map((r) => r.cells.map((c) => c.type))).to.eql([["slot", "slot", "empty", "empty"]]);
  });

  it("refuses a kind that does not fit a reserved row", () => {
    const added = apply("calendar", { type: "addRow", before: 1, count: 3 });
    const result = apply(
      "calendar",
      { type: "insert", target: { kind: "newRow", before: 1, isRow: true }, kind: "graph" },
      added.reservations
    );
    expect(result.text).to.equal("calendar");
    expect(result.effect?.type).to.equal("alert");
  });

  it("splits a row when the count goes down", () => {
    expect(apply(two, { type: "setCount", rowKey: "r0", count: 1 }).text).to.equal(
      "row {\n  value / source: workout\n}\n\nvalue / source: workout"
    );
  });

  it("opens the editor at the widget and lists the kinds a target takes", () => {
    expect(apply("\ncalendar", { type: "edit", slotId: 0 }).effect).to.eql({ type: "openEditor", caret: 1 });
    const rows = DashboardEdit_rows(layout(two), DashboardEdit_reservations(two));
    expect(DashboardEdit_kindsFor(rows, { kind: "slot", row: 0, index: 2 })).to.eql(["value", "text"]);
    expect(DashboardEdit_kindsFor(rows, { kind: "newRow", before: 1, isRow: false })).to.eql([...DashboardEdit_kinds]);
  });

  it("finds the compiled widget of a slot by where its item starts", () => {
    const text = "calendar\n\nrow {\n  value / source: workout\n}";
    const compiled = LiftographCompile_document(LiftographDocument_parse(text), fxSettings());
    const widgets = DashboardEdit_widgets(compiled.layout);
    expect(layout(text).rows.map((r) => widgets.get(r.slots[0].itemFrom)?.kind)).to.eql(["calendar", "value"]);
  });

  it("applies the fallback of a rejected drop and alerts on an illegal move", () => {
    const text = "calendar\n\n" + two;
    const fallback = apply(text, {
      type: "drop",
      slotId: 0,
      drop: {
        kind: "reject",
        reason: "x",
        fallback: { kind: "newRow", before: 2, isRow: false },
        spot: { rowKey: "r1" },
      },
    });
    expect(fallback.text).to.equal(two + "\n\ncalendar");
    const illegal = apply(text, {
      type: "drop",
      slotId: 0,
      drop: { kind: "move", target: { kind: "slot", row: 1, index: 0 }, spot: { rowKey: "r1" } },
    });
    expect(illegal).to.eql({
      text,
      reservations: DashboardEdit_reservations(text),
      effect: { type: "alert", message: "A calendar needs at least 1/2 of the row" },
    });
  });
});

describe("DashboardEdit_apply with the widget sheet", () => {
  const sheet = { hasWidgetSheet: true };
  function applySheet(text: string, action: IDashboardEditAction): IDashboardEditResult {
    return DashboardEdit_apply(layout(text), DashboardEdit_reservations(text), action, sheet);
  }

  it("edit opens the sheet on a readable widget", () => {
    const effect = applySheet("// cap\ncalendar / range: 1y", { type: "edit", slotId: 0 }).effect;
    expect(effect?.type).to.equal("openWidget");
    if (effect?.type === "openWidget") {
      expect(effect.snippet).to.equal("// cap\ncalendar / range: 1y");
    }
  });

  it("edit opens the text editor on a text item or a broken widget", () => {
    expect(applySheet("// Hello", { type: "edit", slotId: 0 }).effect?.type).to.equal("openEditor");
    expect(
      applySheet("value / source: workout / y: volume {~ point(1) ~}", { type: "edit", slotId: 0 }).effect?.type
    ).to.equal("openEditor");
  });

  it("editText opens the sheet on its Text tab, or the text editor for a broken widget", () => {
    const effect = applySheet("calendar", { type: "editText", slotId: 0 }).effect;
    expect(effect?.type === "openWidget" ? effect.mode : effect?.type).to.equal("text");
    expect(applySheet("// Hello", { type: "editText", slotId: 0 }).effect).to.eql({ type: "openEditor", caret: 0 });
  });

  it("insert of a widget kind opens the sheet and leaves the text", () => {
    const result = applySheet("calendar", {
      type: "insert",
      target: { kind: "newRow", before: 1, isRow: false },
      kind: "value",
    });
    expect(result.text).to.equal("calendar");
    expect(result.effect?.type).to.equal("openWidget");
  });

  it("insert of text still writes at once", () => {
    const result = applySheet("calendar", {
      type: "insert",
      target: { kind: "newRow", before: 1, isRow: false },
      kind: "text",
    });
    expect(result.text).to.contain("// Text");
  });
});
