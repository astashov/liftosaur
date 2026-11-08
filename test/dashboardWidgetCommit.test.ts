import "mocha";
import { expect } from "chai";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { ILiftographLayout, LiftographLayout_build } from "../src/liftograph/liftographLayout";
import {
  DashboardWidgetCommit_anchor,
  DashboardWidgetCommit_apply,
  DashboardWidgetCommit_insertAnchor,
  DashboardWidgetCommit_resolve,
  DashboardWidgetCommit_result,
  DashboardWidgetCommit_snippet,
  IDashboardWidgetAnchor,
} from "../src/models/dashboardWidgetCommit";

function layout(text: string): ILiftographLayout {
  return LiftographLayout_build(LiftographDocument_parse(text));
}

function anchor(text: string, slotId: number): IDashboardWidgetAnchor {
  const result = DashboardWidgetCommit_anchor(layout(text), slotId);
  if (result == null) {
    throw new Error("no anchor");
  }
  return result;
}

describe("DashboardWidgetCommit", () => {
  it("replaces the widget and keeps its caption", () => {
    const text = "// Volume\nvalue / source: workout\ncalendar";
    const a = anchor(text, 0);
    expect(DashboardWidgetCommit_snippet(a)).to.equal("value / source: workout");
    expect(DashboardWidgetCommit_apply(text, a, "value / name: V / source: workout / y: volume")).to.deep.equal({
      kind: "ok",
      text: "// Volume\nvalue / name: V / source: workout / y: volume\ncalendar",
      caret: 10,
    });
  });

  it("keeps the indent of a widget inside a row", () => {
    const text = "row {\n  calendar / range: 3m\n  calendar\n}";
    const a = anchor(text, 1);
    expect(a.format).to.deep.equal({ eol: "\n", indent: "  " });
    expect(DashboardWidgetCommit_snippet(a)).to.equal("  calendar");
  });

  it("keeps the CRLF line ending", () => {
    expect(anchor("calendar\r\ncalendar", 1).format.eol).to.equal("\r\n");
  });

  it("refuses to write over text that changed", () => {
    const text = "calendar";
    const a = anchor(text, 0);
    expect(DashboardWidgetCommit_apply("calendar\ncalendar", a, "calendar / range: 1y").kind).to.equal("alert");
  });

  it("inserts a new widget and puts the caret on it", () => {
    const text = "calendar";
    const a = DashboardWidgetCommit_insertAnchor(layout(text), { kind: "newRow", before: 1, isRow: false });
    const result = DashboardWidgetCommit_apply(text, a, "value / source: workout / y: volume");
    expect(result.kind).to.equal("ok");
    if (result.kind === "ok") {
      expect(result.text).to.contain("calendar");
      expect(result.text.slice(result.caret)).to.match(/^value \/ source/);
    }
  });

  it("alerts when the insert does not fit the row", () => {
    const text = "row {\n  calendar\n  calendar\n}";
    const a = DashboardWidgetCommit_insertAnchor(layout(text), { kind: "slot", row: 0, index: 2 });
    expect(DashboardWidgetCommit_apply(text, a, "calendar").kind).to.equal("alert");
  });
});

describe("DashboardWidgetCommit_result and _resolve", () => {
  it("an untouched replace writes nothing", () => {
    const a = anchor("calendar", 0);
    expect(DashboardWidgetCommit_result(a, false, "calendar").snippet).to.equal(undefined);
    expect(DashboardWidgetCommit_resolve("calendar", DashboardWidgetCommit_result(a, false, "calendar"))).to.eql({});
  });

  it("an untouched insert still inserts the template", () => {
    const a = DashboardWidgetCommit_insertAnchor(layout("calendar"), { kind: "newRow", before: 1, isRow: false });
    const resolved = DashboardWidgetCommit_resolve(
      "calendar",
      DashboardWidgetCommit_result(a, false, "calendar / range: 1y")
    );
    expect(resolved.text).to.contain("calendar / range: 1y");
  });

  it("Edit as text writes and opens text mode on the widget", () => {
    const text = "// cap\ncalendar";
    const a = anchor(text, 0);
    const resolved = DashboardWidgetCommit_resolve(
      text,
      DashboardWidgetCommit_result(a, true, "calendar / range: 1y", "text")
    );
    expect(resolved).to.eql({ text: "// cap\ncalendar / range: 1y", textModeCaret: 7 });
  });

  it("Edit as text on an untouched widget only opens text mode", () => {
    const text = "// cap\ncalendar";
    const a = anchor(text, 0);
    expect(DashboardWidgetCommit_resolve(text, DashboardWidgetCommit_result(a, false, "calendar", "text"))).to.eql({
      textModeCaret: 7,
    });
  });

  it("a stale text turns into an alert", () => {
    const a = anchor("calendar", 0);
    const resolved = DashboardWidgetCommit_resolve(
      "value / source: workout",
      DashboardWidgetCommit_result(a, true, "calendar / range: 1y")
    );
    expect(resolved.alert).to.be.a("string");
  });
});
