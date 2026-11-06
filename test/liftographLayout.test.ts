import "mocha";
import { expect } from "chai";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import {
  ILiftographLayout,
  LiftographLayout_build,
  LiftographLayout_fitError,
  LiftographLayout_fits,
} from "../src/liftograph/liftographLayout";

function layout(text: string): ILiftographLayout {
  return LiftographLayout_build(LiftographDocument_parse(text));
}

function slotTexts(l: ILiftographLayout): string[][] {
  return l.rows.map((row) => row.slots.map((slot) => l.text.slice(slot.span.from, slot.span.to)));
}

describe("LiftographLayout_build", () => {
  it("turns top-level items into one-slot rows and rows into slots", () => {
    const l = layout("value / source: workout\n\nrow {\n  graph {\n    name: A / source: workout / y: volume\n  }\n  calendar\n}");
    expect(l.rows.map((r) => [r.isRow, r.slots.map((s) => s.kind)])).to.eql([
      [false, ["value"]],
      [true, ["graph", "calendar"]],
    ]);
    expect(slotTexts(l)[1]).to.eql(["  graph {\n    name: A / source: workout / y: volume\n  }", "  calendar"]);
    expect(l.rows[1].openLine).to.equal(2);
    expect(l.rows[1].closeLine).to.equal(7);
  });

  it("keeps a caption and the /// lines directly above in the slot", () => {
    const l = layout("/// old one\n// **Squat**\ncalendar\n\n// note");
    expect(slotTexts(l)).to.eql([["/// old one\n// **Squat**\ncalendar"], ["// note"]]);
    expect(l.rows.map((r) => r.slots[0].kind)).to.eql(["calendar", "text"]);
  });

  it("points the caret at the widget kind and keeps the row caption in the row", () => {
    const text = "// ## Week\nrow {\n  // cap\n  value / source: workout\n}";
    const l = layout(text);
    expect(text.slice(l.rows[0].span.from, l.rows[0].span.from + 10)).to.equal("// ## Week");
    expect(text.slice(l.rows[0].slots[0].caret).startsWith("value")).to.equal(true);
    expect(slotTexts(l)).to.eql([["  // cap\n  value / source: workout"]]);
  });

  it("skips empty rows and reports an unclosed row without a close line", () => {
    expect(layout("row {\n}\ncalendar").rows.map((r) => r.slots[0].kind)).to.eql(["calendar"]);
    const unclosed = layout("row {\n  calendar\n  calendar");
    expect(unclosed.rows[0].closeLine).to.equal(undefined);
    expect(unclosed.rows[0].slots.length).to.equal(2);
  });
});

describe("LiftographLayout_fits", () => {
  it("checks every kind against the slot count", () => {
    expect(LiftographLayout_fits(["graph", "value"])).to.equal(true);
    expect(LiftographLayout_fits(["graph", "value", "value"])).to.equal(false);
    expect(LiftographLayout_fits(["value", "value", "value", "value"])).to.equal(true);
    expect(LiftographLayout_fits(["value"], 3)).to.equal(true);
    expect(LiftographLayout_fits(["graph"], 3)).to.equal(false);
    expect(LiftographLayout_fits(["text", "text", "text", "text", "text"])).to.equal(false);
    expect(LiftographLayout_fitError(["muscles", "value", "value"])).to.equal("A muscles needs at least 1/2 of the row");
  });
});
