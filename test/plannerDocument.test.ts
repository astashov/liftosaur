import "mocha";
import { expect } from "chai";
import { PlannerDocument_blockSpans } from "../src/pages/planner/models/plannerDocument";

// What travels with an exercise when it is moved, asked once for the whole app. The grid and the
// text editor answered this differently for months — the grid took `///` comments and spacing blank
// lines along, the editor left them — so the same drag gave different results depending on which
// surface you did it from.
describe("PlannerDocument_blockSpans", () => {
  function blocks(text: string): { fullName: string; body: string }[] {
    return PlannerDocument_blockSpans(text).map((span) => ({
      fullName: span.fullName,
      body: text.slice(span.from, span.exerciseTo).trim(),
    }));
  }

  it("finds each exercise and names it by its variations", () => {
    const found = blocks(`Squat / 3x5 100lb\nBench Press / 5x5 50lb\n`);
    expect(found.map((b) => b.fullName)).to.eql(["Squat", "Bench Press"]);
  });

  it("takes the `//` description above an exercise with it", () => {
    // The evaluator attaches these to whatever exercise follows them, so they are part of it.
    const found = blocks(`// a cue\nSquat / 3x5 100lb\n`);
    expect(found[0].body).to.equal("// a cue\nSquat / 3x5 100lb");
  });

  it("takes several description lines, and a blank line separating a group from its exercise", () => {
    const found = blocks(`// first\n// second\n\nSquat / 3x5 100lb\n`);
    expect(found[0].body).to.equal("// first\n// second\n\nSquat / 3x5 100lb");
  });

  it("leaves a `///` comment behind — it belongs to the place, not to the exercise", () => {
    const found = blocks(`/// a note about this day\nSquat / 3x5 100lb\n`);
    expect(found[0].body).to.equal("Squat / 3x5 100lb");
  });

  it("stops at a `///` even when descriptions sit between it and the exercise", () => {
    const found = blocks(`/// a note\n// a cue\nSquat / 3x5 100lb\n`);
    expect(found[0].body).to.equal("// a cue\nSquat / 3x5 100lb");
  });

  it("leaves blank lines that merely space a day out", () => {
    const found = blocks(`Squat / 3x5 100lb\n\n\nBench Press / 5x5 50lb\n`);
    expect(found[1].body).to.equal("Bench Press / 5x5 50lb");
  });

  it("keeps a multi-line progress block inside the exercise it belongs to", () => {
    const text = `Squat / 3x5 100lb / progress: custom() {~\n  weights += 5lb\n~}\nBench Press / 5x5 50lb\n`;
    const found = blocks(text);
    expect(found[0].body).to.contain("weights += 5lb");
    expect(found[1].fullName).to.equal("Bench Press");
  });

  it("returns nothing for a day with no exercises", () => {
    expect(PlannerDocument_blockSpans(`/// just a note\n\n`)).to.eql([]);
  });
});
