import "mocha";
import { expect } from "chai";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { ILiftographLayout, LiftographLayout_build } from "../src/liftograph/liftographLayout";
import {
  LiftographLayoutEdit_delete,
  LiftographLayoutEdit_duplicate,
  LiftographLayoutEdit_insert,
  LiftographLayoutEdit_move,
  LiftographLayoutEdit_splitRow,
  LiftographLayoutEdit_swap,
} from "../src/liftograph/liftographLayoutEdit";
import { IEither } from "../src/utils/types";

function layout(text: string): ILiftographLayout {
  return LiftographLayout_build(LiftographDocument_parse(text));
}

function ok(result: IEither<string, string>): string {
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

function kinds(text: string): string[][] {
  return layout(text).rows.map((row) => row.slots.map((slot) => slot.kind));
}

const row = ["row {", "  value / source: workout", "  // cap", "  calendar", "}"].join("\n");

describe("LiftographLayoutEdit_delete", () => {
  it("removes the slot with its caption and keeps the row lines when one slot is left", () => {
    expect(LiftographLayoutEdit_delete(layout(row), 1)).to.equal("row {\n  value / source: workout\n}");
  });

  it("drops the row lines and the row caption when the last slot goes, and keeps /// lines", () => {
    const text = "calendar\n\n/// keep\n// ## Title\nrow {\n  calendar\n}\n\nvalue / source: workout";
    expect(LiftographLayoutEdit_delete(layout(text), 1)).to.equal("calendar\n\n/// keep\n\nvalue / source: workout");
  });

  it("removes a top-level item without leaving a double blank line", () => {
    const text = "calendar\n\nvalue / source: workout\n\ncalendar / range: 1m";
    expect(LiftographLayoutEdit_delete(layout(text), 1)).to.equal("calendar\n\ncalendar / range: 1m");
    expect(LiftographLayoutEdit_delete(layout(text), 0)).to.equal("value / source: workout\n\ncalendar / range: 1m");
  });

  it("leaves text it does not touch byte for byte", () => {
    const text = "calendar\r\n  \r\n///  odd  \r\nvalue / source: workout   \r\n\r\ncalendar";
    expect(LiftographLayoutEdit_delete(layout(text), 2)).to.equal(
      "calendar\r\n  \r\n///  odd  \r\nvalue / source: workout   "
    );
  });
});

describe("LiftographLayoutEdit_duplicate", () => {
  it("copies into the same row when it fits, otherwise into a new row below", () => {
    const values = "row {\n  value / source: workout\n  value / source: workout\n}";
    expect(kinds(LiftographLayoutEdit_duplicate(layout(values), 0))).to.eql([["value", "value", "value"]]);
    expect(kinds(LiftographLayoutEdit_duplicate(layout(row), 0))).to.eql([["value", "calendar"], ["value"]]);
    expect(kinds(LiftographLayoutEdit_duplicate(layout(row), 1))).to.eql([["value", "calendar"], ["calendar"]]);
    expect(LiftographLayoutEdit_duplicate(layout("calendar"), 0)).to.equal("calendar\n\ncalendar");
  });

  it("copies the caption with the widget", () => {
    expect(LiftographLayoutEdit_duplicate(layout("// Streak\ncalendar"), 0)).to.equal(
      "// Streak\ncalendar\n\n// Streak\ncalendar"
    );
    expect(LiftographLayoutEdit_duplicate(layout(row), 1)).to.equal(`${row}\n\n// cap\ncalendar`);
  });
});

describe("LiftographLayoutEdit_move", () => {
  it("reorders inside a row", () => {
    expect(ok(LiftographLayoutEdit_move(layout(row), 0, { kind: "slot", row: 0, index: 2 }))).to.equal(
      "row {\n  // cap\n  calendar\n  value / source: workout\n}"
    );
  });

  it("wraps a top-level item into a row and indents what moves in", () => {
    const text = "calendar\n\nvalue / source: workout";
    expect(ok(LiftographLayoutEdit_move(layout(text), 1, { kind: "slot", row: 0, index: 0 }))).to.equal(
      "row {\n  value / source: workout\n  calendar\n}"
    );
  });

  it("moves out of a row into a new row and dedents", () => {
    expect(ok(LiftographLayoutEdit_move(layout(row), 1, { kind: "newRow", before: 1, isRow: false }))).to.equal(
      "row {\n  value / source: workout\n}\n\n// cap\ncalendar"
    );
  });

  it("refuses a move that makes a row too narrow", () => {
    const text = "row {\n  calendar\n  calendar\n}\n\nvalue / source: workout";
    const result = LiftographLayoutEdit_move(layout(text), 2, { kind: "slot", row: 0, index: 1 });
    expect(result).to.eql({ success: false, error: "A calendar needs at least 1/2 of the row" });
  });

  it("puts a blank line after moved text so it never becomes a caption", () => {
    const text = "// note\n\ncalendar";
    const moved = ok(LiftographLayoutEdit_move(layout(text), 0, { kind: "slot", row: 1, index: 0 }));
    expect(moved).to.equal("row {\n  // note\n\n  calendar\n}");
    expect(kinds(moved)).to.eql([["text", "calendar"]]);
  });

  it("carries the caption when a widget moves out of a row or into one", () => {
    expect(ok(LiftographLayoutEdit_move(layout(row), 1, { kind: "newRow", before: 0, isRow: false }))).to.equal(
      "// cap\ncalendar\n\nrow {\n  value / source: workout\n}"
    );
    const top = "// Streak\ncalendar\n\nrow {\n  value / source: workout\n}";
    expect(ok(LiftographLayoutEdit_move(layout(top), 0, { kind: "slot", row: 1, index: 1 }))).to.equal(
      "row {\n  value / source: workout\n  // Streak\n  calendar\n}"
    );
  });

  it("does nothing when the slot stays where it is", () => {
    expect(ok(LiftographLayoutEdit_move(layout(row), 0, { kind: "slot", row: 0, index: 1 }))).to.equal(row);
    expect(ok(LiftographLayoutEdit_move(layout("calendar"), 0, { kind: "newRow", before: 1, isRow: false }))).to.equal(
      "calendar"
    );
  });
});

describe("LiftographLayoutEdit_swap", () => {
  it("swaps across rows and reindents both sides", () => {
    const text = "calendar\n\n" + row;
    expect(ok(LiftographLayoutEdit_swap(layout(text), 0, 1))).to.equal(
      "value / source: workout\n\nrow {\n  calendar\n  // cap\n  calendar\n}"
    );
  });

  it("refuses a swap that breaks a row", () => {
    const text = "row {\n  value / source: workout\n  value / source: workout\n  value / source: workout\n}\ncalendar";
    expect(LiftographLayoutEdit_swap(layout(text), 0, 3).success).to.equal(false);
  });
});

describe("LiftographLayoutEdit_splitRow", () => {
  it("moves the extra slots into a new row below", () => {
    const text = "row {\n  value / source: workout\n  value / source: workout\n  calendar\n  calendar\n}".replace(
      /calendar/g,
      "value / source: workout"
    );
    expect(kinds(LiftographLayoutEdit_splitRow(layout(text), 0, 2))).to.eql([
      ["value", "value"],
      ["value", "value"],
    ]);
    expect(LiftographLayoutEdit_splitRow(layout(row), 0, 1)).to.equal(
      "row {\n  value / source: workout\n}\n\n// cap\ncalendar"
    );
  });
});

describe("LiftographLayoutEdit_insert", () => {
  it("adds a snippet into a row slot or as a new row", () => {
    expect(
      ok(
        LiftographLayoutEdit_insert(
          layout("calendar"),
          { kind: "newRow", before: 1, isRow: false },
          "value / source: workout"
        )
      )
    ).to.equal("calendar\n\nvalue / source: workout");
    expect(
      ok(LiftographLayoutEdit_insert(layout("calendar"), { kind: "newRow", before: 0, isRow: true }, "calendar"))
    ).to.equal("row {\n  calendar\n}\n\ncalendar");
    expect(
      ok(LiftographLayoutEdit_insert(layout(""), { kind: "newRow", before: 0, isRow: false }, "calendar"))
    ).to.equal("calendar");
    expect(LiftographLayoutEdit_insert(layout(row), { kind: "slot", row: 0, index: 2 }, "calendar").success).to.equal(
      false
    );
    const values = "row {\n  value / source: workout\n  // cap\n  value / source: workout\n}";
    expect(ok(LiftographLayoutEdit_insert(layout(values), { kind: "slot", row: 0, index: 1 }, "// hi"))).to.equal(
      "row {\n  value / source: workout\n  // hi\n\n  // cap\n  value / source: workout\n}"
    );
  });
});
