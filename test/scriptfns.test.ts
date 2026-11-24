import "mocha";
import { expect } from "chai";
import {
  PlannerProgram_generateFullText,
  PlannerProgram_evaluateText,
  PlannerProgram_evaluate,
} from "../src/pages/planner/models/plannerProgram";
import { PlannerTestUtils_finish, PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { IHistoryRecord, IPlannerProgram } from "../src/types";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_nextHistoryRecord,
  Program_nextHistoryRecordFromEvaluated,
  Program_runExerciseFinishDayScript,
  Program_runFinishDayScript,
} from "../src/models/program";
import { Stats_getEmpty } from "../src/models/stats";
import { PlannerProgramExercise_getState } from "../src/pages/planner/models/plannerProgramExercise";
import { ParserTestUtils_run } from "../src/utils/parserTestUtils";

describe("Script functions: sum, min, max", () => {
  describe("sum", () => {
    it("sums an array", () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(total: 0) {~
  state.total = sum(completedReps)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 4, 3]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("total: 12");
    });

    it("sums individual numbers", () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(total: 0) {~
  state.total = sum(1, 2, 3)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5, 5]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("total: 6");
    });

    it("sums multiple arrays", () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(total: 0) {~
  state.total = sum(reps, completedReps)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 4, 3]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("total: 27");
    });

    it("sums mixed scalars and arrays", () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(total: 0) {~
  state.total = sum(10, completedReps)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 4, 3]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("total: 22");
    });

    it("sums weight arrays", () => {
      const programText = `# Week 1
## Day 1
Squat / 1x5 100lb, 1x5 200lb / progress: custom(total: 0lb) {~
  state.total = sum(weights)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("total: 300lb");
    });
  });

  describe("min", () => {
    it("finds min of an array", () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(val: 0) {~
  state.val = min(completedReps)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 3, 4]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("val: 3");
    });

    it("finds min of individual numbers", () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(val: 0) {~
  state.val = min(7, 2, 5)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5, 5]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("val: 2");
    });

    it("finds min across multiple arrays", () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(val: 0) {~
  state.val = min(reps, completedReps)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 2, 4]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("val: 2");
    });

    it("finds min of mixed scalars and arrays", () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(val: 0) {~
  state.val = min(10, completedReps)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 7, 6]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("val: 5");
    });

    it("finds min of weight arrays", () => {
      const programText = `# Week 1
## Day 1
Squat / 1x5 200lb, 1x5 100lb / progress: custom(val: 0lb) {~
  state.val = min(weights)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("val: 100lb");
    });
  });

  describe("max", () => {
    it("finds max of an array", () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(val: 0) {~
  state.val = max(completedReps)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[3, 5, 4]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("val: 5");
    });

    it("finds max of individual numbers", () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(val: 0) {~
  state.val = max(2, 7, 5)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5, 5]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("val: 7");
    });

    it("finds max across multiple arrays", () => {
      const programText = `# Week 1
## Day 1
Squat / 1x3, 1x8 / 100lb / progress: custom(val: 0) {~
  state.val = max(reps, completedReps)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[3, 5]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("val: 8");
    });

    it("finds max of mixed scalars and arrays", () => {
      const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(val: 0) {~
  state.val = max(1, completedReps)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[3, 7, 5]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("val: 7");
    });

    it("finds max of weight arrays", () => {
      const programText = `# Week 1
## Day 1
Squat / 1x5 100lb, 1x5 200lb / progress: custom(val: 0lb) {~
  state.val = max(weights)
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.contain("val: 200lb");
    });
  });

  describe("array arguments to scalar functions", () => {
    it("shows a syntax error when passing an array to a function that doesn't accept arrays", () => {
      const programText = `# Week 1
## Day 1
Squat / 2x8+ / 100lb / progress: custom(reps: 24) {~
  if (sum(completedReps) >= state.reps) {
    weights = increment(weights)
  }
~}`;
      const planner: IPlannerProgram = {
        vtype: "planner",
        name: "MyProgram",
        weeks: PlannerProgram_evaluateText(programText),
      };
      const result = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks[0][0];
      expect(result.success).to.equal(false);
      if (!result.success) {
        expect(result.error.message).to.contain(
          "Function 'increment' doesn't accept arrays, and 'weights' is an array"
        );
      }
    });
  });
});

describe("Script functions: random", () => {
  const settings = Settings_build();

  function startWorkout(programText: string): { record: IHistoryRecord; evaluated: IEvaluatedProgram } {
    const { program } = PlannerTestUtils_get(programText);
    const record = Program_nextHistoryRecord(program, settings, Stats_getEmpty());
    return { record, evaluated: Program_evaluate(program, settings) };
  }

  it("returns a whole number within the bounds in a progress script", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(a: 0, b: 0, c: 0) {~
  state.a = random(1, 6)
  state.b = random(1, 6)
  state.c = random(1, 6)
~}`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5, 5]] });
    const state = Program_evaluate(program, settings).weeks[0].days[0].exercises[0].progress?.state ?? {};
    for (const key of ["a", "b", "c"]) {
      expect(state[key]).to.be.within(1, 6);
      expect(Number.isInteger(state[key])).to.equal(true);
    }
  });

  it("rejects bounds that are not whole numbers", () => {
    expect(() => ParserTestUtils_run("random(1.5, 3)", {})).to.throw(/should be a whole number/);
  });

  it("shuffles the deck once at workout start, keeping every card", () => {
    const deck = [8, 10, 2, 9, 7, 10, 7, 2, 10, 10, 4, 11];
    const programText = `# Week 1
## Day 1
Push Up / ${deck.map((r) => `1x${r}`).join(", ")} / update: custom() {~
  if (setIndex == 0) {
    for (var.i in reps) {
      var.j = random(var.i, numberOfSets)
      var.card = reps[var.i]
      reps[var.i] = reps[var.j]
      reps[var.j] = var.card
    }
  }
~}`;
    const { record } = startWorkout(programText);
    const reps = record.entries[0].sets.map((s) => s.reps ?? 0);
    expect([...reps].sort((a, b) => a - b)).to.eql([...deck].sort((a, b) => a - b));
    expect(reps).to.not.eql(deck);
  });

  it("gives an exercise with no sets new numbers in each workout", () => {
    const programText = `# Week 1
## Day 1
Squat / 0x5 / 100lb / update: custom() {~
  if (setIndex == 0) {
    numberOfSets = random(1, 50)
  }
~}`;
    const { program } = PlannerTestUtils_get(programText);
    const evaluated = Program_evaluate(program, settings);
    const setCounts = [1764000000000, 1764000100000, 1764000200000].map((startTime) => {
      const record = Program_nextHistoryRecordFromEvaluated(
        evaluated,
        settings,
        Stats_getEmpty(),
        undefined,
        startTime
      );
      return record.entries[0].sets.length;
    });
    expect(new Set(setCounts).size).to.equal(3);
    for (const count of setCounts) {
      expect(count).to.be.within(1, 50);
    }
  });

  it("gives the finish preview the same numbers as the real finish", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom(a: 0, b: 0) {~
  state.a = random(1, 1000000)
  state.b = random(1, 1000000)
~}`;
    const { record, evaluated } = startWorkout(programText);
    const entry = record.entries[0];
    const programExercise = evaluated.weeks[0].days[0].exercises[0];
    const stats = Stats_getEmpty();
    const preview = Program_runExerciseFinishDayScript(
      entry,
      programExercise.dayData,
      settings,
      PlannerProgramExercise_getState(programExercise),
      evaluated.states,
      programExercise,
      stats,
      record.startTime
    );
    const finish = Program_runFinishDayScript(
      programExercise,
      evaluated,
      programExercise.dayData,
      entry,
      settings,
      stats,
      record.startTime
    );
    if (!preview.success || !finish.success) {
      throw new Error("script failed");
    }
    expect(preview.data.state.a).to.equal(finish.data.state.a);
    expect(preview.data.state.b).to.equal(finish.data.state.b);
    expect(finish.data.state.a).to.not.equal(finish.data.state.b);
  });
});
