import "mocha";
import { expect } from "chai";
import {
  ProgramGridTransforms_setRepeatRange,
  ProgramGridTransforms_deleteDayRow,
  ProgramGridTransforms_duplicateDayRow,
  ProgramGridTransforms_moveDayRow,
  ProgramGridTransforms_reorderExercisesInDay,
  ProgramGridTransforms_moveExerciseToDay,
  ProgramGridTransforms_moveWeek,
  ProgramGridTransforms_deleteWeek,
  ProgramGridTransforms_duplicateWeek,
  ProgramGridTransforms_deleteExercises,
  ProgramGridTransforms_addDay,
  ProgramGridTransforms_addWeek,
  ProgramGridTransforms_uniqueWeekName,
} from "../src/pages/planner/models/programGridTransforms";
import { PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { ProgramGrid_build } from "../src/pages/planner/models/programGrid";
import { Program_evaluate, Program_create } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { IPlannerProgram, IProgram } from "../src/types";

// setRepeatRange returns an IEither like every other transform; these tests assert on the happy
// path, so unwrap here and fail loudly if a case ever starts refusing.
function repeatRange(
  planner: IPlannerProgram,
  runStart: { week: number; dayInWeek: number },
  fullName: string,
  toWeek: number
): IPlannerProgram {
  const result = ProgramGridTransforms_setRepeatRange(planner, runStart, fullName, toWeek, Settings_build());
  if (!result.success) {
    throw new Error(`setRepeatRange refused: ${result.error}`);
  }
  return result.data;
}

function plannerOf(text: string): IPlannerProgram {
  return { vtype: "planner", name: "P", weeks: PlannerProgram_evaluateText(text) };
}

function dayTexts(planner: IPlannerProgram): string[] {
  return planner.weeks.map((w) => (w.days[0]?.exerciseText ?? "").trim());
}

function spans(planner: IPlannerProgram, name: string): string[] {
  const program: IProgram = { ...Program_create("P"), planner };
  const grid = ProgramGrid_build(Program_evaluate(program, Settings_build()), Settings_build());
  return grid.placements.filter((p) => p.fullName === name).map((p) => `[${p.colStart}-${p.colEnd}]`);
}

const FOUR_WEEKS = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb
Bench Press / 5x5 50lb

# Week 2
## Day 1
Bench Press / 5x5 50lb

# Week 3
## Day 1
Bench Press / 5x5 50lb

# Week 4
## Day 1
Bench Press / 5x5 50lb
`;

describe("ProgramGridTransforms", () => {
  it("extends a repeat by rewriting its range, touching no other line", () => {
    const next = repeatRange(plannerOf(FOUR_WEEKS), { week: 1, dayInWeek: 1 }, "Squat", 4);
    expect(dayTexts(next)[0]).to.equal("Squat[1-4] / 3x5 100lb\nBench Press / 5x5 50lb");
    // The weeks it now covers hold no text of their own — the evaluator synthesizes them.
    expect(dayTexts(next).slice(1)).to.deep.equal([
      "Bench Press / 5x5 50lb",
      "Bench Press / 5x5 50lb",
      "Bench Press / 5x5 50lb",
    ]);
    expect(spans(next, "Squat")).to.deep.equal(["[0-3]"]);
  });

  it("shrinks a repeat", () => {
    const next = repeatRange(plannerOf(FOUR_WEEKS), { week: 1, dayInWeek: 1 }, "Squat", 3);
    expect(dayTexts(next)[0]).to.equal("Squat[1-3] / 3x5 100lb\nBench Press / 5x5 50lb");
    expect(spans(next, "Squat")).to.deep.equal(["[0-2]"]);
  });

  it("drops the repeat entirely when shrunk to its own week", () => {
    const next = repeatRange(plannerOf(FOUR_WEEKS), { week: 1, dayInWeek: 1 }, "Squat", 1);
    expect(dayTexts(next)[0]).to.equal("Squat / 3x5 100lb\nBench Press / 5x5 50lb");
    expect(spans(next, "Squat")).to.deep.equal(["[0-0]"]);
  });

  it("adds a repeat to an exercise that had none", () => {
    const next = repeatRange(plannerOf(FOUR_WEEKS), { week: 1, dayInWeek: 1 }, "Bench Press", 2);
    expect(dayTexts(next)[0]).to.equal("Squat[1-2] / 3x5 100lb\nBench Press[1-2] / 5x5 50lb");
  });

  it("never deletes another exercise while shrinking - the bug in changeCurrentInstance's sibling", () => {
    const sparse = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb
Bench Press / 5x5 50lb

# Week 2
## Day 1
Bench Press / 5x5 50lb

# Week 3
## Day 1
Bench Press / 5x5 50lb
`;
    const next = repeatRange(plannerOf(sparse), { week: 1, dayInWeek: 1 }, "Squat", 1);
    expect(spans(next, "Bench Press")).to.deep.equal(["[0-2]"]);
  });

  it("finds the line when the repeat back-fills, so the run's first week holds no text", () => {
    // `Squat[1-3]` is written in week 2 but shows from week 1, so the grid's strip starts at week 1
    // — where there is nothing to rewrite. Trusting that coordinate silently did nothing.
    const backfilled = `# Week 1
## Day 1
Bench Press / 5x5 50lb

# Week 2
## Day 1
Squat[1-3] / 3x5 100lb
Bench Press / 5x5 55lb

# Week 3
## Day 1
Bench Press / 5x5 60lb
`;
    const next = repeatRange(plannerOf(backfilled), { week: 1, dayInWeek: 1 }, "Squat", 2);
    expect(next.weeks[1].days[0].exerciseText.trim().split("\n")[0]).to.equal("Squat[1-2] / 3x5 100lb");
    expect(spans(next, "Squat")).to.deep.equal(["[0-1]"]);
  });

  it("shrinking past the week the line is written in moves the line, not the exercise", () => {
    // `Squat[1-3]` is authored in week 2 but shows from week 1. Dragging its right edge back to
    // week 1 must leave Squat in week 1 — rewriting the token in place would strand the line in
    // week 2, i.e. move the exercise a week to the right instead of shortening its run.
    const backfilled = `# Week 1
## Day 1
Bench Press / 5x5 50lb

# Week 2
## Day 1
Squat[1-3] / 3x5 100lb

# Week 3
## Day 1
`;
    const next = repeatRange(plannerOf(backfilled), { week: 1, dayInWeek: 1 }, "Squat", 1);
    expect(spans(next, "Squat")).to.deep.equal(["[0-0]"]);
    expect(next.weeks[0].days[0].exerciseText).to.contain("Squat / 3x5 100lb");
    expect(next.weeks[1].days[0].exerciseText.trim()).to.equal("");
  });

  it("leaves the line alone when the shortened range still covers the week it is written in", () => {
    const backfilled = `# Week 1
## Day 1
Bench Press / 5x5 50lb

# Week 2
## Day 1
Squat[1-3] / 3x5 100lb

# Week 3
## Day 1
`;
    const next = repeatRange(plannerOf(backfilled), { week: 1, dayInWeek: 1 }, "Squat", 2);
    expect(spans(next, "Squat")).to.deep.equal(["[0-1]"]);
    expect(next.weeks[1].days[0].exerciseText.trim()).to.equal("Squat[1-2] / 3x5 100lb");
  });

  it("keeps a forced order when the range changes", () => {
    const ordered = `# Week 1
## Day 1
Squat[3,1-2] / 3x5 100lb

# Week 2
## Day 1

# Week 3
## Day 1
`;
    const next = repeatRange(plannerOf(ordered), { week: 1, dayInWeek: 1 }, "Squat", 3);
    expect(dayTexts(next)[0]).to.equal("Squat[3,1-3] / 3x5 100lb");
  });

  it("extending across a week that defines the exercise itself leaves that week as an override", () => {
    const overridden = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb

# Week 2
## Day 1

# Week 3
## Day 1
Squat / 5x3 200lb

# Week 4
## Day 1
`;
    const next = repeatRange(plannerOf(overridden), { week: 1, dayInWeek: 1 }, "Squat", 4);
    expect(dayTexts(next)[0]).to.equal("Squat[1-4] / 3x5 100lb");
    expect(dayTexts(next)[2]).to.equal("Squat / 5x3 200lb");
    expect(spans(next, "Squat")).to.deep.equal(["[0-1]", "[2-2]", "[3-3]"]);
  });

  describe("deleteDayRow", () => {
    const THREE_DAYS = `# Week 1
## Day 1
main / used: none / 3x5 100lb

## Day 2
Squat[1-2] / 3x5 100lb

## Day 3
Bench Press / ...main[1]
Deadlift / 1x5 200lb

# Week 2
## Day 1
main / used: none / 3x5 110lb

## Day 2

## Day 3
Bench Press / ...main[1]
Deadlift / 1x5 210lb
`;

    it("removes the day from every week, not just one", () => {
      const result = ProgramGridTransforms_deleteDayRow(plannerOf(THREE_DAYS), 1, Settings_build());
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks.map((w) => w.days.length)).to.deep.equal([2, 2]);
      expect(result.data.weeks[0].days.map((d) => d.name)).to.deep.equal(["Day 1", "Day 3"]);
      expect(spans(result.data, "Squat")).to.deep.equal([]);
      // Everything that survived still resolves — the reuse of day 1 is untouched. Both weeks say
      // the same thing, so it reads as one run.
      expect(spans(result.data, "Bench Press")).to.deep.equal(["[0-1]"]);
    });

    it("refuses when another day reuses the one being deleted", () => {
      const result = ProgramGridTransforms_deleteDayRow(plannerOf(THREE_DAYS), 0, Settings_build());
      expect(result.success).to.equal(false);
      if (result.success) {
        return;
      }
      // Day 1 is what the others reuse, so it refuses instead of orphaning them.
      expect(result.error).to.contain("reuses this day");
    });

    it("renumbers a description reuse hiding in a comment", () => {
      // `// ...Squat[1:2]` reuses another exercise's description. It is a comment, so it is invisible
      // to the parse tree — and a stale one silently shows the wrong description rather than erroring.
      const text = `# Week 1
## Day 1
// First description
Squat / 1x1

## Day 2
// Second description
Squat / 1x1

## Day 3
// ...Squat[1:2]
Bench Press / 1x1
`;
      const deleted = ProgramGridTransforms_deleteDayRow(plannerOf(text), 0, Settings_build());
      expect(deleted.success).to.equal(true);
      if (!deleted.success) {
        return;
      }
      // Day 2 became day 1, so the reuse has to follow it.
      expect(deleted.data.weeks[0].days[1].exerciseText).to.contain("// ...Squat[1:1]");

      const moved = ProgramGridTransforms_moveDayRow(plannerOf(text), 2, 0, Settings_build());
      expect(moved.success).to.equal(true);
      if (!moved.success) {
        return;
      }
      expect(moved.data.weeks[0].days[0].exerciseText).to.contain("// ...Squat[1:3]");
    });

    it("shifts a qualifier down when an earlier day is removed", () => {
      const text = `# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
main / used: none / 3x5 100lb

## Day 3
Bench Press / ...main[2]

# Week 2
## Day 1
Squat / 3x5 100lb

## Day 2
main / used: none / 3x5 110lb

## Day 3
Bench Press / ...main[2]
`;
      const result = ProgramGridTransforms_deleteDayRow(plannerOf(text), 0, Settings_build());
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks[0].days[1].exerciseText.trim()).to.equal("Bench Press / ...main[1]");
      expect(spans(result.data, "Bench Press")).to.deep.equal(["[0-1]"]);
    });
  });

  describe("duplicateDayRow", () => {
    it("appends a copy to every week without moving any existing slot", () => {
      const text = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb

## Day 2
Bench Press / 5x5 50lb

# Week 2
## Day 1

## Day 2
Bench Press / 5x5 50lb
`;
      const result = ProgramGridTransforms_duplicateDayRow(plannerOf(text), 1, Settings_build());
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks.map((w) => w.days.length)).to.deep.equal([3, 3]);
      expect(result.data.weeks[0].days[2].exerciseText.trim()).to.equal("Bench Press / 5x5 50lb");
      // The repeat on day 1 is untouched, which is the point of appending.
      expect(spans(result.data, "Squat")).to.deep.equal(["[0-1]"]);
    });
  });

  describe("moveDayRow", () => {
    const THREE_DAYS = `# Week 1
## Day A
Squat / 3x5 100lb

## Day B
main / used: none / 3x5 100lb

## Day C
Bench Press / ...main[2]

# Week 2
## Day A
Squat / 3x5 105lb

## Day B
main / used: none / 3x5 110lb

## Day C
Bench Press / ...main[2]
`;

    it("permutes every week identically and rewrites the qualifiers", () => {
      // Day C moves to the front, so what was day 2 is now day 3.
      const result = ProgramGridTransforms_moveDayRow(plannerOf(THREE_DAYS), 2, 0, Settings_build());
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      for (const week of result.data.weeks) {
        expect(week.days.map((d) => d.name)).to.deep.equal(["Day C", "Day A", "Day B"]);
      }
      expect(result.data.weeks[0].days[0].exerciseText.trim()).to.equal("Bench Press / ...main[3]");
      expect(spans(result.data, "Bench Press")).to.deep.equal(["[0-1]"]);
    });

    it("is a no-op when nothing moves", () => {
      const planner = plannerOf(THREE_DAYS);
      const result = ProgramGridTransforms_moveDayRow(planner, 1, 1, Settings_build());
      expect(result.success).to.equal(true);
      if (result.success) {
        expect(result.data).to.equal(planner);
      }
    });
  });

  describe("reorderExercisesInDay", () => {
    it("reorders in every week and carries each exercise's comments with it", () => {
      const text = `# Week 1
## Day 1
// squat notes
Squat[1-2] / 3x5 100lb
Bench Press / 5x5 50lb
Deadlift / 1x5 200lb

# Week 2
## Day 1
Bench Press / 5x5 55lb
Deadlift / 1x5 210lb
`;
      const result = ProgramGridTransforms_reorderExercisesInDay(
        plannerOf(text),
        0,
        ["Deadlift", "Squat", "Bench Press"],
        Settings_build()
      );
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks[0].days[0].exerciseText.trim().split("\n")).to.deep.equal([
        "Deadlift / 1x5 200lb",
        "// squat notes",
        "Squat[1-2] / 3x5 100lb",
        "Bench Press / 5x5 50lb",
      ]);
      // Week 2 only holds two of them, and follows the same order.
      expect(result.data.weeks[1].days[0].exerciseText.trim().split("\n")).to.deep.equal([
        "Deadlift / 1x5 210lb",
        "Bench Press / 5x5 55lb",
      ]);
      expect(spans(result.data, "Squat")).to.deep.equal(["[0-1]"]);
    });
  });

  describe("moveExerciseToDay", () => {
    const TWO_DAYS = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb
Bench Press / 5x5 50lb

## Day 2
Deadlift / 1x5 200lb

# Week 2
## Day 1
Bench Press / 5x5 55lb

## Day 2
Deadlift / 1x5 210lb
`;

    function linesOf(planner: IPlannerProgram, weekIndex: number, dayIndex: number): string[] {
      return planner.weeks[weekIndex].days[dayIndex].exerciseText.trim().split("\n");
    }

    it("moves an exercise into another day in every week that authors it", () => {
      const result = ProgramGridTransforms_moveExerciseToDay(
        plannerOf(TWO_DAYS),
        0,
        "Bench Press",
        1,
        undefined,
        Settings_build()
      );
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(linesOf(result.data, 0, 0)).to.deep.equal(["Squat[1-2] / 3x5 100lb"]);
      expect(linesOf(result.data, 0, 1)).to.deep.equal(["Deadlift / 1x5 200lb", "Bench Press / 5x5 50lb"]);
      // Week 2 authors its own copy, and that one moves too, leaving the day empty.
      expect(linesOf(result.data, 1, 0)).to.deep.equal([""]);
      expect(linesOf(result.data, 1, 1)).to.deep.equal(["Deadlift / 1x5 210lb", "Bench Press / 5x5 55lb"]);
    });

    it("inserts before the exercise it was dropped above", () => {
      const result = ProgramGridTransforms_moveExerciseToDay(
        plannerOf(TWO_DAYS),
        0,
        "Bench Press",
        1,
        "Deadlift",
        Settings_build()
      );
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(linesOf(result.data, 0, 1)).to.deep.equal(["Bench Press / 5x5 50lb", "Deadlift / 1x5 200lb"]);
    });

    it("carries the repeat with the line, so the run lands on the new day", () => {
      const result = ProgramGridTransforms_moveExerciseToDay(
        plannerOf(TWO_DAYS),
        0,
        "Squat",
        1,
        undefined,
        Settings_build()
      );
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(linesOf(result.data, 0, 1)).to.deep.equal(["Deadlift / 1x5 200lb", "Squat[1-2] / 3x5 100lb"]);
      // Week 2 holds no text for a repeated exercise, so nothing there had to move.
      expect(linesOf(result.data, 1, 1)).to.deep.equal(["Deadlift / 1x5 210lb"]);
      expect(spans(result.data, "Squat")).to.deep.equal(["[0-1]"]);
    });

    it("refuses when the destination day already has that exercise", () => {
      const text = `# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Squat / 3x5 200lb
`;
      const result = ProgramGridTransforms_moveExerciseToDay(
        plannerOf(text),
        0,
        "Squat",
        1,
        undefined,
        Settings_build()
      );
      expect(result.success).to.equal(false);
    });

    it("refuses when a week that only inherits the exercise has no destination day", () => {
      // Squat is authored in week 2 and backfills into week 1, which has no Day 2. Checking
      // authored text alone missed week 1 and the move deleted its only copy, silently.
      const text = `# Week 1
## Day 1
Bench Press / 5x5 50lb

# Week 2
## Day 1
Squat[1-2] / 3x5 100lb

## Day 2
Deadlift / 1x5 200lb
`;
      const before = spans(plannerOf(text), "Squat");
      expect(before).to.deep.equal(["[0-1]"]);
      const result = ProgramGridTransforms_moveExerciseToDay(
        plannerOf(text),
        0,
        "Squat",
        1,
        undefined,
        Settings_build()
      );
      expect(result.success).to.equal(false);
      if (result.success) {
        return;
      }
      expect(result.error).to.contain("Week 1");
    });

    it("refuses when a week that authors the exercise has no destination day", () => {
      const text = `# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press / 5x5 50lb

## Day 2
Deadlift / 1x5 200lb

# Week 2
## Day 1
Bench Press / 5x5 55lb
`;
      const result = ProgramGridTransforms_moveExerciseToDay(
        plannerOf(text),
        0,
        "Bench Press",
        1,
        undefined,
        Settings_build()
      );
      expect(result.success).to.equal(false);
      if (result.success) {
        return;
      }
      expect(result.error).to.contain("Bench Press");
    });

    it("refuses when something reuses the exercise by its old day", () => {
      const text = `# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Deadlift / 1x5 200lb

## Day 3
Bench Press / 5x5 50lb

# Week 2
## Day 1
Squat / ...Squat[1:1]

## Day 2
Deadlift / 1x5 210lb

## Day 3
Bench Press / 5x5 55lb
`;
      const result = ProgramGridTransforms_moveExerciseToDay(
        plannerOf(text),
        0,
        "Squat",
        2,
        undefined,
        Settings_build()
      );
      expect(result.success).to.equal(false);
    });
  });

  describe("week operations", () => {
    // Squat is authored once and repeats over weeks 1-2 only, so any permutation that pulls those
    // two apart has nowhere to put it.
    const THREE_WEEKS = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb
Bench Press / 5x5 50lb

## Day 2
Deadlift / 1x5 200lb

# Week 2
## Day 1
Bench Press / 5x5 55lb

## Day 2
Deadlift / ...Deadlift[1:2]

# Week 3
## Day 1
Bench Press / 5x5 60lb

## Day 2
Deadlift / 1x5 220lb
`;

    function weekSpans(planner: IPlannerProgram, name: string): string[] {
      return spans(planner, name);
    }

    it("rewrites the repeat range when a week moves under it", () => {
      // [W1, W2, W3] -> [W3, W1, W2]: Squat still belongs to old weeks 1 and 2, now sitting 2nd
      // and 3rd, so its range has to become 2-3.
      const result = ProgramGridTransforms_moveWeek(plannerOf(THREE_WEEKS), 2, 0, Settings_build());
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks[1].days[0].exerciseText.trim().split("\n")[0]).to.equal("Squat[2-3] / 3x5 100lb");
      expect(weekSpans(result.data, "Squat")).to.deep.equal(["[1-2]"]);
    });

    it("renumbers a week qualifier that pointed at the moved week", () => {
      const result = ProgramGridTransforms_moveWeek(plannerOf(THREE_WEEKS), 2, 0, Settings_build());
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      // `...Deadlift[1:2]` lived in week 2 and pointed at week 1, which is now week 2.
      expect(result.data.weeks[2].days[1].exerciseText.trim()).to.equal("Deadlift / ...Deadlift[2:2]");
    });

    it("refuses a move that would scatter a repeat across non-adjacent weeks", () => {
      // [W1, W2, W3] -> [W1, W3, W2] leaves Squat in weeks 1 and 3, which no repeat can say.
      const result = ProgramGridTransforms_moveWeek(plannerOf(THREE_WEEKS), 1, 2, Settings_build());
      expect(result.success).to.equal(false);
      if (result.success) {
        return;
      }
      expect(result.error).to.contain("Squat");
    });

    it("renumbers a description reuse comment's week number", () => {
      const text = `# Week 1
## Day 1
// Base description
Squat / 1x1

# Week 2
## Day 1
// ...Squat[1:1]
Bench Press / 1x1
`;
      const weekMoved = ProgramGridTransforms_moveWeek(plannerOf(text), 1, 0, Settings_build());
      expect(weekMoved.success).to.equal(true);
      if (!weekMoved.success) {
        return;
      }
      expect(weekMoved.data.weeks[0].days[0].exerciseText).to.contain("// ...Squat[2:1]");
    });

    it("keeps every week's name with the week that moved, out of order or not", () => {
      const text = THREE_WEEKS.replace("# Week 3", "# Deload");
      const result = ProgramGridTransforms_moveWeek(plannerOf(text), 2, 0, Settings_build());
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks.map((w) => w.name)).to.deep.equal(["Deload", "Week 1", "Week 2"]);
    });

    it("moves a definition out of a deleted week so the rest of its run survives", () => {
      const text = `# Week 1
## Day 1
Squat[1-3] / 3x5 100lb

# Week 2
## Day 1
Bench Press / 5x5 50lb

# Week 3
## Day 1
Bench Press / 5x5 60lb
`;
      const result = ProgramGridTransforms_deleteWeek(plannerOf(text), 0, Settings_build());
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks).to.have.length(2);
      // Squat was defined only in week 1 and repeated through week 3; it keeps the two weeks left.
      expect(result.data.weeks[0].days[0].exerciseText).to.contain("Squat[1-2] / 3x5 100lb");
      expect(weekSpans(result.data, "Squat")).to.deep.equal(["[0-1]"]);
    });

    it("refuses to delete a week that another week reuses by number", () => {
      const result = ProgramGridTransforms_deleteWeek(plannerOf(THREE_WEEKS), 0, Settings_build());
      expect(result.success).to.equal(false);
    });

    it("refuses to delete the only week", () => {
      const result = ProgramGridTransforms_deleteWeek(
        plannerOf("# Week 1\n## Day 1\nSquat / 3x5 100lb\n"),
        0,
        Settings_build()
      );
      expect(result.success).to.equal(false);
    });

    it("duplicates a week as a standalone copy, without its repeat", () => {
      const text = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb

# Week 2
## Day 1
Bench Press / 5x5 50lb
`;
      const result = ProgramGridTransforms_duplicateWeek(plannerOf(text), 0, Settings_build());
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks).to.have.length(3);
      expect(result.data.weeks[2].name).to.equal("Week 3");
      expect(result.data.weeks[2].days[0].exerciseText.trim()).to.equal("Squat / 3x5 100lb");
    });

    it("names the copy something no other week is called", () => {
      // Nothing resolves a week by name, but tab bars key React elements off it, so two weeks
      // called "Week 2" lose one of them.
      const text = `# Week 1
## Day 1
Squat / 3x5 100lb

# Week 3
## Day 1
Bench Press / 5x5 50lb
`;
      const result = ProgramGridTransforms_duplicateWeek(plannerOf(text), 0, Settings_build());
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks.map((w) => w.name)).to.deep.equal(["Week 1", "Week 3", "Week 4"]);
    });

    it("refuses to duplicate a week whose content comes from a repeat elsewhere", () => {
      const text = `# Week 1
## Day 1
Squat[1-2] / 3x5 100lb

# Week 2
## Day 1
Bench Press / 5x5 50lb
`;
      // Week 2 shows Squat, but holds no text for it.
      const result = ProgramGridTransforms_duplicateWeek(plannerOf(text), 1, Settings_build());
      expect(result.success).to.equal(false);
      if (result.success) {
        return;
      }
      expect(result.error).to.contain("Squat");
    });
  });

  it("says so when the exercise isn't on that day, rather than quietly doing nothing", () => {
    const result = ProgramGridTransforms_setRepeatRange(
      plannerOf(FOUR_WEEKS),
      { week: 1, dayInWeek: 1 },
      "Deadlift",
      3,
      Settings_build()
    );
    expect(result.success).to.equal(false);
    if (result.success) {
      return;
    }
    expect(result.error).to.contain("Deadlift");
  });

  describe("deleteExercises", () => {
    it("removes only the targeted exercise, leaving its neighbours and other weeks alone", () => {
      const planner = plannerOf(`# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press / 5x5 50lb

# Week 2
## Day 1
Squat / 3x5 100lb
Bench Press / 5x5 50lb
`);
      const result = ProgramGridTransforms_deleteExercises(
        planner,
        [{ week: 1, dayInWeek: 1, fullName: "Squat" }],
        Settings_build()
      );
      expect(result.success, !result.success ? result.error : "").to.equal(true);
      if (!result.success) {
        return;
      }
      // The surviving text comes back canonically printed, not as it was typed.
      expect(dayTexts(result.data)[0]).to.equal("Bench Press / 5x5 / 50lb");
      expect(dayTexts(result.data)[1]).to.contain("Squat");
    });

    it("deletes several targets in one pass", () => {
      const planner = plannerOf(`# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press / 5x5 50lb
Deadlift / 1x5 200lb
`);
      const result = ProgramGridTransforms_deleteExercises(
        planner,
        [
          { week: 1, dayInWeek: 1, fullName: "Squat" },
          { week: 1, dayInWeek: 1, fullName: "Deadlift" },
        ],
        Settings_build()
      );
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(dayTexts(result.data)[0]).to.equal("Bench Press / 5x5 / 50lb");
    });

    // The whole point of routing deletes through a transform: an edit that would break the program
    // is refused with a sentence rather than applied.
    it("refuses rather than orphaning a reuse of the deleted exercise", () => {
      const planner = plannerOf(`# Week 1
## Day 1
Squat / 3x5 100lb
Front Squat / ...Squat
`);
      const result = ProgramGridTransforms_deleteExercises(
        planner,
        [{ week: 1, dayInWeek: 1, fullName: "Squat" }],
        Settings_build()
      );
      expect(result.success).to.equal(false);
      if (result.success) {
        return;
      }
      expect(result.error.length).to.be.greaterThan(0);
    });

    it("is a no-op when the target isn't there", () => {
      const planner = plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      const result = ProgramGridTransforms_deleteExercises(
        planner,
        [{ week: 1, dayInWeek: 1, fullName: "Overhead Press" }],
        Settings_build()
      );
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(dayTexts(result.data)[0]).to.equal("Squat / 3x5 / 100lb");
    });
  });

  describe("adding", () => {
    it("appends a day to the named week only, leaving every other week's day count alone", () => {
      const planner = plannerOf(`# Week 1
## Day 1
Squat / 3x5 100lb

# Week 2
## Day 1
Squat / 3x5 100lb
`);
      const result = ProgramGridTransforms_addDay(planner, 0, Settings_build());
      expect(result.success, !result.success ? result.error : "").to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks[0].days.length).to.equal(2);
      expect(result.data.weeks[1].days.length).to.equal(1);
    });

    it("appends a week, so no existing week index moves", () => {
      const planner = plannerOf(`# Week 1
## Day 1
Squat[1-2] / 3x5 100lb
`);
      const before = planner.weeks.map((w) => w.name);
      const result = ProgramGridTransforms_addWeek(planner, Settings_build());
      expect(result.success, !result.success ? result.error : "").to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks.length).to.equal(before.length + 1);
      expect(result.data.weeks.slice(0, before.length).map((w) => w.name)).to.eql(before);
    });
  });

  describe("uniqueWeekName", () => {
    it("keeps the preferred name when it is free", () => {
      const planner = plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      expect(ProgramGridTransforms_uniqueWeekName(planner, "Deload")).to.equal("Deload");
    });

    // Nothing in the language resolves a week by name, but duplicates break tab bars that key
    // React elements off them.
    it("walks to the next free name when the preferred one is taken", () => {
      const planner = plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      const taken = planner.weeks[0].name;
      expect(ProgramGridTransforms_uniqueWeekName(planner, taken)).to.not.equal(taken);
    });
  });

  // Six bugs found by an adversarial review of this module, each reproduced before it was fixed.
  describe("regressions", () => {
    function weekTexts(planner: IPlannerProgram, dayIndex: number = 0): string[] {
      return planner.weeks.map((w) => (w.days[dayIndex]?.exerciseText ?? "").trim());
    }

    it("relocates a definition past a week that overrides it, instead of dropping it", () => {
      const planner = plannerOf(`# W1\n## D1\nSquat[1-3] / 1x1\n\n# W2\n## D1\nSquat / 2x2\n\n# W3\n## D1\n`);
      const result = ProgramGridTransforms_deleteWeek(planner, 0, Settings_build());
      expect(result.success, !result.success ? result.error : "").to.equal(true);
      if (!result.success) {
        return;
      }
      // The override stays where it is; the base definition lands in the first week that inherits.
      expect(weekTexts(result.data)[0]).to.equal("Squat / 2x2");
      expect(spans(result.data, "Squat")).to.eql(["[0-0]", "[1-1]"]);
    });

    it("keeps a single-week range when the line is written in another week", () => {
      // Squat[1-2] authored in W4 prescribes weeks 1, 2 and 4. Deleting W1 leaves weeks 1 and 3 —
      // dropping the range would strand it in its own week alone.
      const planner = plannerOf(`# W1\n## D1\n\n# W2\n## D1\n\n# W3\n## D1\n\n# W4\n## D1\nSquat[1-2] / 1x1\n`);
      const result = ProgramGridTransforms_deleteWeek(planner, 0, Settings_build());
      expect(result.success, !result.success ? result.error : "").to.equal(true);
      if (!result.success) {
        return;
      }
      expect(weekTexts(result.data)[2]).to.equal("Squat[1-1] / 1x1");
      expect(spans(result.data, "Squat")).to.eql(["[0-0]", "[2-2]"]);
    });

    it("drops a single-week range when it lands on the week that holds the line", () => {
      const planner = plannerOf(`# W1\n## D1\nSquat[1-2] / 1x1\n\n# W2\n## D1\n\n# W3\n## D1\nBench Press / 1x1\n`);
      const result = ProgramGridTransforms_deleteWeek(planner, 1, Settings_build());
      expect(result.success).to.equal(true);
      if (!result.success) {
        return;
      }
      expect(weekTexts(result.data)[0]).to.equal("Squat / 1x1");
    });

    it("leaves references alone in a week that the day move did not reorder", () => {
      // W2 has no third row, so its two days keep their positions — renumbering them with the
      // permutation applied to W1 would repoint the reuse at a different template.
      const planner = plannerOf(
        `# W1\n## A\nSquat / 1x1\n\n## B\nDeadlift / 1x1\n\n## C\nOverhead Press / 1x1\n` +
          `\n# W2\n## A\nmain / used: none / 1x1\n\n## B\nmain / used: none / 2x2\nBench Press / ...main[1]\n`
      );
      const result = ProgramGridTransforms_moveDayRow(planner, 2, 0, Settings_build());
      expect(result.success, !result.success ? result.error : "").to.equal(true);
      if (!result.success) {
        return;
      }
      expect(result.data.weeks[1].days.map((d) => d.name)).to.eql(["A", "B"]);
      expect((result.data.weeks[1].days[1].exerciseText ?? "").trim()).to.contain("...main[1]");
    });

    it("refuses a move that duplicates an exercise even when the same error exists elsewhere", () => {
      // D3 already has a duplicate-Squat error, so comparing error messages as a set made the new
      // duplicate in D2 look like nothing had changed.
      const planner = plannerOf(`# W1\n## D1\nSquat / 1x1\n\n## D2\nSquat / 2x2\n\n## D3\nSquat / 3x3\nSquat / 4x4\n`);
      const result = ProgramGridTransforms_moveExerciseToDay(planner, 0, "Squat", 1, undefined, Settings_build());
      expect(result.success).to.equal(false);
    });

    it("does not renumber a week reference that is prose rather than a reuse directive", () => {
      const planner = plannerOf(
        `# W1\n## D1\n// To compare, type ...Squat[1:1] literally.\nBench Press / 1x1\n\n# W2\n## D1\nBench Press / 2x2\n`
      );
      const result = ProgramGridTransforms_moveWeek(planner, 1, 0, Settings_build());
      expect(result.success, !result.success ? result.error : "").to.equal(true);
      if (!result.success) {
        return;
      }
      expect(weekTexts(result.data)[1]).to.contain("...Squat[1:1] literally");
    });

    it("moves every week's line when the active variation differs between them", () => {
      const planner = plannerOf(
        `# W1\n## D1\n!Squat | Front Squat / 1x1\n\n## D2\nDeadlift / 1x1\n` +
          `\n# W2\n## D1\nSquat | !Front Squat / 2x2\n\n## D2\nDeadlift / 2x2\n`
      );
      const result = ProgramGridTransforms_moveExerciseToDay(
        planner,
        0,
        "Squat | !Front Squat",
        1,
        undefined,
        Settings_build()
      );
      expect(result.success, !result.success ? result.error : "").to.equal(true);
      if (!result.success) {
        return;
      }
      // Both weeks moved, and each kept its own spelling of which variation is active.
      expect(weekTexts(result.data, 0)).to.eql(["", ""]);
      expect(weekTexts(result.data, 1)[0]).to.contain("!Squat | Front Squat");
      expect(weekTexts(result.data, 1)[1]).to.contain("Squat | !Front Squat");
    });
  });
});
