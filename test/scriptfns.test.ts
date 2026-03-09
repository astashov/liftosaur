import "mocha";
import { expect } from "chai";
import { PlannerProgram_generateFullText } from "../src/pages/planner/models/plannerProgram";
import { PlannerTestUtils_finish } from "./utils/plannerTestUtils";

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
});
