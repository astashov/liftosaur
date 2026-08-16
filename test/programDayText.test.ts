import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import {
  ProgramDayText_apply,
  ProgramDayText_identityChange,
  IProgramDayTextApplied,
} from "../src/models/programDayText";
import { Settings_build } from "../src/models/settings";
import type { IPlannerProgram, ISettings } from "../src/types";

const settings: ISettings = Settings_build();

function plannerOf(text: string): IPlannerProgram {
  const { program } = PlannerTestUtils_get(text);
  if (program.planner == null) {
    throw new Error("expected a planner program");
  }
  return program.planner;
}

function apply(
  planner: IPlannerProgram,
  week: number,
  dayInWeek: number,
  day: number,
  newText: string,
  scope: "one" | "all" = "all"
): ReturnType<typeof ProgramDayText_apply> {
  return ProgramDayText_apply(planner, { week, dayInWeek, day }, newText, settings, scope);
}

function dayText(planner: IPlannerProgram, week: number, dayInWeek: number): string {
  return planner.weeks[week - 1].days[dayInWeek - 1].exerciseText;
}

function expectApplied(result: ReturnType<typeof ProgramDayText_apply>): IProgramDayTextApplied {
  if ("error" in result) {
    throw new Error(`expected the edit to apply, got: ${result.error.message}`);
  }
  return result;
}

function expectError(result: ReturnType<typeof ProgramDayText_apply>): string {
  if (!("error" in result)) {
    throw new Error("expected the edit to be refused");
  }
  return result.error.message;
}

const twoDays = `# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Bench Press / ...Squat
`;

describe("ProgramDayText_apply", () => {
  describe("plain edits", () => {
    it("replaces the day's text", () => {
      const planner = plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      const result = expectApplied(apply(planner, 1, 1, 1, "Squat / 5x5 100lb"));
      expect(dayText(result.planner, 1, 1)).to.eql("Squat / 5x5 100lb");
      expect(result.renames).to.eql([]);
    });

    it("leaves other days alone", () => {
      const planner = plannerOf(twoDays);
      const result = expectApplied(apply(planner, 1, 1, 1, "Squat / 5x5 100lb"));
      expect(dayText(result.planner, 1, 2)).to.include("...Squat");
    });

    it("reports an error in the edited day's own text", () => {
      const planner = plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      expect(expectError(apply(planner, 1, 1, 1, "Squat / 3x5 100lb / progress: nosuchfn(5lb)"))).to.include(
        "nosuchfn"
      );
    });

    it("refuses a day that isn't in the program", () => {
      const planner = plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      expect(expectError(apply(planner, 1, 7, 7, "Squat / 5x5 100lb"))).to.include("Couldn't find this day");
    });
  });

  describe("renaming an exercise another day reuses", () => {
    it("rewrites the reuse to follow the new name", () => {
      const planner = plannerOf(twoDays);
      const result = expectApplied(apply(planner, 1, 1, 1, "Front Squat / 3x5 100lb"));
      expect(dayText(result.planner, 1, 2)).to.include("...Front Squat");
    });

    it("reports the rename so logged sets can follow it", () => {
      const planner = plannerOf(twoDays);
      const result = expectApplied(apply(planner, 1, 1, 1, "Front Squat / 3x5 100lb"));
      expect(result.renames.length).to.eql(1);
      expect(result.renames[0].oldKey).to.eql("squat_barbell");
      expect(result.renames[0].newKey).to.eql("frontsquat_barbell");
    });

    it("does not rewrite a reuse the user broke inside the edited day itself", () => {
      const planner = plannerOf(`# Week 1
## Day 1
Squat / 3x5 100lb
Bench Press / ...Squat
`);
      // The user can see this text — silently rewriting what they typed would be worse than
      // telling them.
      expect(expectError(apply(planner, 1, 1, 1, "Front Squat / 3x5 100lb\nBench Press / ...Squat"))).to.be.a("string");
    });
  });

  describe("edits that break a day they don't touch", () => {
    it("refuses when the edit breaks another day beyond repair", () => {
      const planner = plannerOf(twoDays);
      // Turning the reuse target into a reuse itself is not something renaming can fix.
      expect(expectError(apply(planner, 1, 1, 1, "Squat / ...Bench Press"))).to.be.a("string");
    });

    it("refuses when the reused exercise is deleted outright", () => {
      const planner = plannerOf(twoDays);
      expect(expectError(apply(planner, 1, 1, 1, "Deadlift / 3x5 100lb\nOverhead Press / 3x5 50lb"))).to.be.a("string");
    });

    it("allows an edit when another day was already broken before it", () => {
      const planner = plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n\n## Day 2\nBench Press / 3x5 50lb\n`);
      // Break day 2 behind the model's back, the way a bad sync or import would.
      const broken: IPlannerProgram = {
        ...planner,
        weeks: planner.weeks.map((w) => ({
          ...w,
          days: w.days.map((d, i) => (i === 1 ? { ...d, exerciseText: "Bench Press / ...Nonexistent" } : d)),
        })),
      };
      const result = expectApplied(apply(broken, 1, 1, 1, "Squat / 5x5 100lb"));
      expect(dayText(result.planner, 1, 1)).to.eql("Squat / 5x5 100lb");
    });
  });

  describe("changing which exercise a line is", () => {
    const twoWeeks = `# Week 1
## Day 1
Squat / 3x5 100lb

# Week 2
## Day 1
Squat / 5x5 110lb
`;

    it("leaves another week's own declaration alone when scoped to this day", () => {
      const planner = plannerOf(twoWeeks);
      const result = expectApplied(apply(planner, 1, 1, 1, "Front Squat / 3x5 100lb", "one"));
      expect(dayText(result.planner, 1, 1)).to.include("Front Squat");
      // Replacing regenerates the untouched days from the evaluated program, so their text is
      // normalized ("5x5 110lb" comes back as "5x5 / 110lb") — the exercise itself is the point.
      expect(dayText(result.planner, 2, 1)).to.include("Squat / 5x5");
      expect(dayText(result.planner, 2, 1)).to.not.include("Front Squat");
    });

    it("changes every declaration when scoped to the whole program", () => {
      const planner = plannerOf(twoWeeks);
      const result = expectApplied(apply(planner, 1, 1, 1, "Front Squat / 3x5 100lb", "all"));
      expect(dayText(result.planner, 1, 1)).to.include("Front Squat");
      expect(dayText(result.planner, 2, 1)).to.include("Front Squat");
    });

    it("reports how many days declare the exercise, so the caller knows whether to ask", () => {
      expect(
        ProgramDayText_identityChange(
          plannerOf(twoWeeks),
          { week: 1, dayInWeek: 1, day: 1 },
          "Front Squat / 3x5 100lb",
          settings
        )?.declarations
      ).to.eql(2);
      expect(
        ProgramDayText_identityChange(
          plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`),
          { week: 1, dayInWeek: 1, day: 1 },
          "Front Squat / 3x5 100lb",
          settings
        )?.declarations
      ).to.eql(1);
    });

    it("reports nothing to ask about when the edit changes no identity", () => {
      expect(
        ProgramDayText_identityChange(
          plannerOf(twoWeeks),
          { week: 1, dayInWeek: 1, day: 1 },
          "Squat / 8x8 100lb",
          settings
        )
      ).to.eql(undefined);
    });

    it("labels a name that collides with another exercise apart instead of merging into it", () => {
      const planner = plannerOf(`# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Bench Press / 3x8 50lb / progress: lp(5lb)
`);
      const result = expectApplied(apply(planner, 1, 1, 1, "Bench Press / 3x5 100lb"));
      // Day 2's Bench Press owns progress: lp(5lb). Merging identities would silently hand that
      // progression to the edited line.
      expect(result.renames.length).to.eql(1);
      expect(result.renames[0].label).to.be.a("string");
      expect(result.renames[0].newKey).to.not.eql("benchpress_barbell");
      expect(dayText(result.planner, 1, 2)).to.include("progress: lp(5lb)");
    });

    it("reports the key the change actually landed on, not the one that was typed", () => {
      const planner = plannerOf(twoWeeks);
      const result = expectApplied(apply(planner, 1, 1, 1, "Front Squat / 3x5 100lb", "all"));
      expect(result.renames[0].oldKey).to.eql("squat_barbell");
      expect(result.renames[0].newKey).to.eql("frontsquat_barbell");
    });
  });

  describe("ladders", () => {
    const ladder = `# Week 1
## Day 1
Squat, Bodyweight | ! Pistol Squat / 3x8
`;

    it("keeps every rung when one of them is changed", () => {
      const planner = plannerOf(ladder);
      const result = expectApplied(apply(planner, 1, 1, 1, "Squat, Bodyweight | ! Shrimp Squat / 3x8"));
      // Replacing at the program level would collapse this onto the single current variation,
      // deleting a rung the user can see in their own text.
      expect(dayText(result.planner, 1, 1)).to.eql("Squat, Bodyweight | ! Shrimp Squat / 3x8");
    });

    it("still reports the identity change so logged sets follow it", () => {
      const planner = plannerOf(ladder);
      const result = expectApplied(apply(planner, 1, 1, 1, "Squat, Bodyweight | ! Shrimp Squat / 3x8"));
      expect(result.renames.length).to.eql(1);
      expect(result.renames[0].oldKey).to.eql("squat_bodyweight_pistolsquat_bodyweight");
      expect(result.renames[0].newKey).to.eql("squat_bodyweight_shrimpsquat_bodyweight");
    });

    it("keeps every rung when one is added", () => {
      const planner = plannerOf(ladder);
      const result = expectApplied(apply(planner, 1, 1, 1, "Squat, Bodyweight | ! Pistol Squat | Shrimp Squat / 3x8"));
      expect(dayText(result.planner, 1, 1)).to.eql("Squat, Bodyweight | ! Pistol Squat | Shrimp Squat / 3x8");
    });

    it("leaves a plain edit to a ladder alone", () => {
      const planner = plannerOf(ladder);
      const result = expectApplied(apply(planner, 1, 1, 1, "Squat, Bodyweight | ! Pistol Squat / 5x5"));
      expect(dayText(result.planner, 1, 1)).to.eql("Squat, Bodyweight | ! Pistol Squat / 5x5");
      expect(result.renames).to.eql([]);
    });

    it("treats moving the current marker as no identity change at all", () => {
      const planner = plannerOf(ladder);
      const result = expectApplied(apply(planner, 1, 1, 1, "Squat, Bodyweight | Pistol Squat / 3x8"));
      expect(dayText(result.planner, 1, 1)).to.eql("Squat, Bodyweight | Pistol Squat / 3x8");
      expect(result.renames).to.eql([]);
    });
  });

  describe("edits too ambiguous to follow", () => {
    it("applies but reports no rename when two exercises change at once", () => {
      const planner = plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\nBench Press / 3x5 50lb\n`);
      const result = expectApplied(apply(planner, 1, 1, 1, "Front Squat / 3x5 100lb\nOverhead Press / 3x5 50lb"));
      expect(result.renames).to.eql([]);
    });

    it("reports no rename for a plain addition", () => {
      const planner = plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      const result = expectApplied(apply(planner, 1, 1, 1, "Squat / 3x5 100lb\nBench Press / 3x5 50lb"));
      expect(result.renames).to.eql([]);
    });

    it("reports no rename for a plain removal", () => {
      const planner = plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\nBench Press / 3x5 50lb\n`);
      const result = expectApplied(apply(planner, 1, 1, 1, "Squat / 3x5 100lb"));
      expect(result.renames).to.eql([]);
    });

    it("reports no rename when exercises are only reordered", () => {
      const planner = plannerOf(`# Week 1\n## Day 1\nSquat / 3x5 100lb\nBench Press / 3x5 50lb\n`);
      const result = expectApplied(apply(planner, 1, 1, 1, "Bench Press / 3x5 50lb\nSquat / 3x5 100lb"));
      expect(result.renames).to.eql([]);
    });
  });
});
