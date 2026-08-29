import "mocha";
import { expect } from "chai";
import { PlannerDocument_blockSpans, PlannerDocument_descriptions } from "../src/pages/planner/models/plannerDocument";
import { parser as plannerExerciseParser } from "../src/pages/planner/plannerExerciseParser";

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

  // The one place where "what travels" and "what the workout shows" could have disagreed. They
  // don't, by choice: the evaluator gives the exercise both runs, so the `///` between them is
  // inside the block. Keeping it pinned would need a second attachment rule for a configuration
  // that a save normalizes away (planner.test.ts, "properly compacts multiple empty lines
  // in-between descriptions", hoists the `///` above the descriptions).
  it("carries a `///` that sits between two runs the exercise owns", () => {
    const found = blocks(`// a\n/// place note\n// b\nSquat / 3x5 100lb\n`);
    expect(found[0].body).to.equal("// a\n/// place note\n// b\nSquat / 3x5 100lb");
  });

  // An empty `//` is what stops a description being inherited from an earlier week; leaving it
  // behind when its exercise moves would quietly switch the inheritance back on.
  it("carries a `//` marker that the workout shows nothing for", () => {
    const found = blocks(`//\n\n// note\nSquat / 3x5 100lb\n`);
    expect(found[0].body).to.equal("//\n\n// note\nSquat / 3x5 100lb");
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

  // `to` and `line` are what let a caller holding an evaluated exercise find and rewrite its
  // span without searching the day for its text.
  it("ends the block at the exercise's text, not past the line break the grammar swallows", () => {
    const text = `// a cue\nSquat / 3x5 100lb\nBench Press / 5x5 50lb\n`;
    const [squat, bench] = PlannerDocument_blockSpans(text);
    expect(text.slice(squat.from, squat.to)).to.equal("// a cue\nSquat / 3x5 100lb");
    // The last exercise of a day has no line break to exclude.
    expect(text.slice(bench.from, bench.to)).to.equal("Bench Press / 5x5 50lb");
    expect(PlannerDocument_blockSpans(`Squat / 3x5`)[0].to).to.equal(11);
  });

  it("reports the 1-based line the exercise starts on, the way an evaluated exercise names it", () => {
    const text = `Squat / 3x5\n\n// a cue\n\n// another\nBench Press / 5x5\n\nDeadlift / 1x5 / progress: custom() {~\n  weights += 5lb\n~}\nOverhead Press / 3x5\n`;
    expect(PlannerDocument_blockSpans(text).map((s) => [s.fullName, s.line])).to.eql([
      ["Squat", 1],
      ["Bench Press", 6],
      ["Deadlift", 8],
      ["Overhead Press", 11],
    ]);
  });

  it("reuses a tree the caller already has instead of parsing again", () => {
    const text = `// a cue\nSquat / 3x5 100lb\n`;
    const tree = plannerExerciseParser.parse(text);
    expect(PlannerDocument_blockSpans(text, tree)).to.eql(PlannerDocument_blockSpans(text));
  });
});

// The evaluator is the authority here, so each of these asserts against what
// plannerExerciseEvaluator would attach and mark — not against what reads nicely.
describe("PlannerDocument_descriptions", () => {
  function runs(text: string): string[][] {
    return PlannerDocument_descriptions(text).map((group) =>
      group.map((d) => `${d.isCurrent ? "*" : ""}${text.slice(d.from, d.to)}`)
    );
  }

  it("groups consecutive `//` lines into one description, split by blank lines", () => {
    expect(runs(`// one\n// still one\n\n// two\nSquat / 3x8`)).to.eql([["*// one\n// still one", "// two"]]);
  });

  it("gives each exercise only the runs above it", () => {
    expect(runs(`// for squat\nSquat / 3x8\n\n// for bench\nBench Press / 5x5`)).to.eql([
      ["*// for squat"],
      ["*// for bench"],
    ]);
  });

  // A `///` ends a run without detaching it, which is where this parts ways with blockSpans.
  it("keeps runs separated by a `///` attached to the exercise below", () => {
    expect(runs(`// a\n/// place note\n// b\nSquat / 3x8`)).to.eql([["*// a", "// b"]]);
  });

  it("drops trailing runs that no exercise follows", () => {
    expect(runs(`Squat / 3x8\n\n// orphan`)).to.eql([]);
  });

  it("marks the run carrying `!`, and falls back to the first when none does", () => {
    expect(runs(`// a\n\n// ! b\nSquat / 3x8`)).to.eql([["// a", "*// ! b"]]);
    expect(runs(`// a\n\n// b\nSquat / 3x8`)).to.eql([["*// a", "// b"]]);
  });

  it("accepts a tab between `//` and the marker, as `/^\\s*!/` does", () => {
    expect(runs(`// a\n\n//\t! b\nSquat / 3x8`)).to.eql([["// a", "*//\t! b"]]);
  });

  // The evaluator strips the marker before deciding a run says nothing, so a run that is only a
  // marker is dropped — and takes the currency with it rather than passing it on.
  it("drops a run that says nothing once its marker is stripped", () => {
    expect(runs(`// !\n\n// note\nSquat / 3x8`)).to.eql([["*// note"]]);
    expect(runs(`//\n\n// note\nSquat / 3x8`)).to.eql([["*// note"]]);
  });

  it("keeps a lone empty run, which is the marker that stops a description being inherited", () => {
    expect(runs(`//\nSquat / 3x8`)).to.eql([["*//"]]);
  });

  it("locates the marker past the `//` and its whitespace, and spans the space after it", () => {
    const text = `// a\n\n//  ! b\nSquat / 3x8`;
    const second = PlannerDocument_descriptions(text)[0][1];
    expect(text.slice(second.marker!.from, second.marker!.to)).to.eql("! ");
    expect(second.markerAt).to.eql(second.marker!.from);
  });

  describe("removal extent", () => {
    function remove(text: string, index: number): string {
      const d = PlannerDocument_descriptions(text)[0][index];
      return text.slice(0, d.removeFrom) + text.slice(d.removeTo);
    }

    it("takes the whole line, including the indentation the run was written with", () => {
      expect(remove(`  // note\nSquat / 3x8`, 0)).to.eql("Squat / 3x8");
    });

    it("leaves the indentation of the line below alone", () => {
      expect(remove(`// note\n  Squat / 3x8`, 0)).to.eql("  Squat / 3x8");
    });

    it("takes the blank line separating it from the run next to it", () => {
      expect(remove(`// a\n\n// b\nSquat / 3x8`, 0)).to.eql("// b\nSquat / 3x8");
      expect(remove(`// a\n\n// b\nSquat / 3x8`, 1)).to.eql("// a\nSquat / 3x8");
    });

    it("leaves the blank line that spaces the day out", () => {
      expect(remove(`Bench Press / 3x8\n\n// note\nSquat / 3x8`, 0)).to.eql("Bench Press / 3x8\n\nSquat / 3x8");
    });
  });
});
