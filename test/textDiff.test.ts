import "mocha";
import { expect } from "chai";
import { TextDiff_minimalEdit } from "../src/utils/textDiff";

function applied(current: string, next: string): string {
  const edit = TextDiff_minimalEdit(current, next);
  if (edit == null) {
    return current;
  }
  return current.slice(0, edit.start) + edit.text + current.slice(edit.end);
}

describe("TextDiff_minimalEdit", () => {
  it("returns nothing for equal strings", () => {
    expect(TextDiff_minimalEdit("Squat / 5x5", "Squat / 5x5")).to.equal(undefined);
  });

  it("inserts into an empty string", () => {
    expect(TextDiff_minimalEdit("", "Squat")).to.deep.equal({ start: 0, end: 0, text: "Squat" });
  });

  it("deletes to an empty string", () => {
    expect(TextDiff_minimalEdit("Squat", "")).to.deep.equal({ start: 0, end: 5, text: "" });
  });

  it("changes only the middle", () => {
    expect(TextDiff_minimalEdit("Squat / 5x5 / 100lb", "Squat / 3x8 / 100lb")).to.deep.equal({
      start: 8,
      end: 11,
      text: "3x8",
    });
  });

  it("changes at the start", () => {
    expect(TextDiff_minimalEdit("T1: Squat / 5x5", "T2: Squat / 5x5")).to.deep.equal({ start: 1, end: 2, text: "2" });
  });

  it("changes at the end", () => {
    expect(TextDiff_minimalEdit("Squat / 5x5", "Squat / 5x8")).to.deep.equal({ start: 10, end: 11, text: "8" });
  });

  it("keeps the repeated suffix out of the edit when the text shortens", () => {
    expect(applied("Squat / ...t1 / 5x3 / ! 6x2 / 10x1", "Squat / ...t1")).to.equal("Squat / ...t1");
    expect(TextDiff_minimalEdit("Squat / ...t1 / 5x3 / ! 6x2 / 10x1", "Squat / ...t1")).to.deep.equal({
      start: 13,
      end: 34,
      text: "",
    });
  });

  it("reproduces the target for a change that both removes and adds", () => {
    const cases: Array<[string, string]> = [
      ["aaa", "aXa"],
      ["abcabc", "abcXabc"],
      ["xxxx", "xx"],
      ["Squat / 160lb", "Squat / 5x3 / ! 6x2 / 10x1"],
    ];
    for (const [current, next] of cases) {
      expect(applied(current, next)).to.equal(next);
    }
  });
});
