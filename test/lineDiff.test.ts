import "mocha";
import { expect } from "chai";
import {
  LineDiff_diff,
  LineDiff_inline,
  LineDiff_maxEdits,
  LineDiff_rows,
  LineDiff_withInline,
} from "../src/utils/lineDiff";

function apply(ops: ReturnType<typeof LineDiff_diff>, side: "before" | "after"): string[] {
  return ops
    .filter((op) => op.kind === "same" || op.kind === (side === "before" ? "remove" : "add"))
    .map((op) => op.text);
}

describe("LineDiff", () => {
  it("marks a changed line as one removal and one addition", () => {
    const ops = LineDiff_diff("a\nSquat / 3x5 / 100lb\nc\n", "a\nSquat / 5x5 / 90lb\nc\n");
    expect(ops).to.eql([
      { kind: "same", text: "a" },
      { kind: "remove", text: "Squat / 3x5 / 100lb" },
      { kind: "add", text: "Squat / 5x5 / 90lb" },
      { kind: "same", text: "c" },
    ]);
  });

  it("rebuilds both texts from the ops, for inserts, deletes and empty sides", () => {
    const cases: [string, string][] = [
      ["a\nb\nc", "a\nx\nb\ny\nc\nz"],
      ["a\nb\nc\nd", "b\nd"],
      ["", "a\nb"],
      ["a\nb", ""],
      ["same\ntext", "same\ntext"],
    ];
    for (const [before, after] of cases) {
      const ops = LineDiff_diff(before, after);
      expect(apply(ops, "before").join("\n")).to.equal(before);
      expect(apply(ops, "after").join("\n")).to.equal(after);
    }
  });

  it("shows a full rewrite past the edit cap as one removed and one added block", () => {
    const count = LineDiff_maxEdits;
    const before = ["header", ...Array.from({ length: count }, (_, i) => `old ${i}`), "footer"].join("\n");
    const after = ["header", ...Array.from({ length: count }, (_, i) => `new ${i}`), "footer"].join("\n");
    const startedAt = process.hrtime.bigint();
    const ops = LineDiff_diff(before, after);
    expect(Number(process.hrtime.bigint() - startedAt) / 1e6).to.be.below(500);
    expect(ops.map((op) => op.kind)).to.eql([
      "same",
      ...Array(count).fill("remove"),
      ...Array(count).fill("add"),
      "same",
    ]);
    expect(apply(ops, "before").join("\n")).to.equal(before);
    expect(apply(ops, "after").join("\n")).to.equal(after);
  });

  it("marks the changed words inside a changed line", () => {
    const ops = LineDiff_withInline(LineDiff_diff("a\nSquat / 3x5 / 100lb\nc", "a\nSquat / 5x5 / 100lb\nc"));
    expect(ops[1].spans).to.eql([
      { text: "Squat / ", isChanged: false },
      { text: "3x5", isChanged: true },
      { text: " / 100lb", isChanged: false },
    ]);
    expect(ops[2].spans).to.eql([
      { text: "Squat / ", isChanged: false },
      { text: "5x5", isChanged: true },
      { text: " / 100lb", isChanged: false },
    ]);
    expect(ops[0].spans).to.equal(undefined);
  });

  it("pairs removed and added lines by position, and leaves extra lines whole", () => {
    const ops = LineDiff_withInline(LineDiff_diff("Squat / 3x5\nBench / 3x5", "Squat / 5x5\nBench / 5x5\nRow / 3x8"));
    expect(ops.map((op) => [op.kind, op.spans != null])).to.eql([
      ["remove", true],
      ["remove", true],
      ["add", true],
      ["add", true],
      ["add", false],
    ]);
  });

  it("keeps a rewritten line whole when the two lines share less than half their text", () => {
    const ops = LineDiff_withInline(LineDiff_diff("Squat / 3x5 / 100lb", "Deadlift / 1x5 / 225lb"));
    expect(ops.every((op) => op.spans == null)).to.equal(true);
    expect(LineDiff_inline("", "")).to.equal(undefined);
  });

  it("stays fast on a large program whose long lines were all rewritten", () => {
    const words = (seed: string): string =>
      Array.from({ length: 60 }, (_, i) => `${seed}${(i * 7919) % 1000}`).join(" ");
    const before = Array.from({ length: 500 }, (_, i) => `// ${words(`a${i}x`)}`).join("\n");
    const after = Array.from({ length: 500 }, (_, i) => `// ${words(`b${i}y`)}`).join("\n");
    const startedAt = process.hrtime.bigint();
    const ops = LineDiff_withInline(LineDiff_diff(before, after));
    expect(Number(process.hrtime.bigint() - startedAt) / 1e6).to.be.below(500);
    expect(apply(ops, "before").join("\n")).to.equal(before);
    expect(apply(ops, "after").join("\n")).to.equal(after);
    expect(ops.every((op) => op.spans == null)).to.equal(true);
  });

  it("finds the shortest edit", () => {
    const ops = LineDiff_diff("a\nb\nc\nd\ne", "a\nc\nd\ne\nf");
    expect(ops.filter((op) => op.kind !== "same")).to.eql([
      { kind: "remove", text: "b" },
      { kind: "add", text: "f" },
    ]);
  });

  it("collapses unchanged runs outside the context", () => {
    const before = ["1", "2", "3", "4", "5", "6", "7", "8"].join("\n");
    const after = ["1", "2", "3", "4", "X", "6", "7", "8"].join("\n");
    const rows = LineDiff_rows(LineDiff_diff(before, after), 1);
    expect(rows).to.eql([
      { kind: "skip", count: 3 },
      { kind: "same", text: "4" },
      { kind: "remove", text: "5" },
      { kind: "add", text: "X" },
      { kind: "same", text: "6" },
      { kind: "skip", count: 2 },
    ]);
  });
});
