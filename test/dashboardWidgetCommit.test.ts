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
  it("edits the caption together with the widget", () => {
    const text = "// Volume\n// per workout\nvalue / source: workout\ncalendar";
    const a = anchor(text, 0);
    expect(DashboardWidgetCommit_snippet(a)).to.equal("// Volume\n// per workout\nvalue / source: workout");
    expect(DashboardWidgetCommit_apply(text, a, "// Load\nvalue / source: workout / y: volume")).to.deep.equal({
      kind: "write",
      text: "// Load\nvalue / source: workout / y: volume\ncalendar",
    });
    expect(DashboardWidgetCommit_apply(text, a, "value / source: workout")).to.deep.equal({
      kind: "write",
      text: "value / source: workout\ncalendar",
    });
  });

  it("includes an indented caption inside a row, but not the row's own caption", () => {
    const text = "// Row title\nrow {\n  // Streak\n  calendar\n  value / source: workout\n}";
    expect(DashboardWidgetCommit_snippet(anchor(text, 0))).to.equal("  // Streak\n  calendar");
    expect(DashboardWidgetCommit_snippet(anchor(text, 1))).to.equal("  value / source: workout");
  });

  it("starts at the widget when the text above it is a separate block", () => {
    const text = "// Notes\n\ncalendar";
    expect(DashboardWidgetCommit_snippet(anchor(text, 1))).to.equal("calendar");
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
    const a = anchor("calendar", 0);
    expect(DashboardWidgetCommit_apply("calendar\ncalendar", a, "calendar / range: 1y").kind).to.equal("alert");
  });

  it("inserts a new widget", () => {
    const a = DashboardWidgetCommit_insertAnchor(layout("calendar"), { kind: "newRow", before: 1, isRow: false });
    const result = DashboardWidgetCommit_apply("calendar", a, "value / source: workout / y: volume");
    expect(result.kind).to.equal("write");
    expect(result.kind === "write" ? result.text : "").to.contain("value / source: workout / y: volume");
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
    expect(DashboardWidgetCommit_resolve("calendar", DashboardWidgetCommit_result(a, false, "calendar"))).to.eql({
      kind: "noop",
    });
  });

  it("an untouched insert still inserts the template", () => {
    const a = DashboardWidgetCommit_insertAnchor(layout("calendar"), { kind: "newRow", before: 1, isRow: false });
    const resolved = DashboardWidgetCommit_resolve(
      "calendar",
      DashboardWidgetCommit_result(a, false, "calendar / range: 1y")
    );
    expect(resolved.kind === "write" ? resolved.text : "").to.contain("calendar / range: 1y");
  });

  it("a touched replace writes the new text", () => {
    const text = "// cap\ncalendar";
    const resolved = DashboardWidgetCommit_resolve(
      text,
      DashboardWidgetCommit_result(anchor(text, 0), true, "// cap\ncalendar / range: 1y")
    );
    expect(resolved).to.eql({ kind: "write", text: "// cap\ncalendar / range: 1y" });
  });

  it("a stale text turns into an alert", () => {
    const resolved = DashboardWidgetCommit_resolve(
      "value / source: workout",
      DashboardWidgetCommit_result(anchor("calendar", 0), true, "calendar / range: 1y")
    );
    expect(resolved.kind).to.equal("alert");
  });
});
