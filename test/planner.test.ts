import "mocha";
import { expect } from "chai";
import { PlannerProgram } from "../src/pages/planner/models/plannerProgram";
import { PlannerTestUtils } from "./utils/plannerTestUtils";
import { IPlannerProgram, IUnit } from "../src/types";
import { Settings } from "../src/models/settings";
import { PlannerExerciseEvaluator, PlannerSyntaxError } from "../src/pages/planner/plannerExerciseEvaluator";
import { Weight } from "../src/models/weight";

describe("Planner", () => {
  it("updates weight after completing", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x5 / 100lb / progress: lp(5lb)`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 2x5 / 105lb / progress: lp(5lb)


`);
  });

  it("switches toe program from lb to kg", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 100lb / 2x8 150kg / progress: custom(increase: 5lb) {~
  if (completedReps >= reps) {
    weights += 5lb
    state.increase += 10lb
  }
~}

## Day 2
Squat / 3x5 / 4x8 / 100lb
`;
    const settings = { ...Settings.build(), units: "kg" as IUnit };
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5]] }, settings);
    const kgProgram = PlannerProgram.switchToUnit(program.planner!, settings);
    const newText = PlannerProgram.generateFullText(kgProgram.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x5 47.5kg / 2x8 152.5kg / progress: custom(increase: 7.5kg) {~
  if (completedReps >= reps) {
    weights += 2.5kg
    state.increase += 5kg
  }
~}

## Day 2
Squat / 3x5 / 4x8 / 47.5kg


`);
  });

  it("increases num of sets", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 / 2x8 / 100lb / progress: custom() {~
  numberOfSets += 1
~}

## Day 2
Squat / 3x5 / 4x8 / 100lb
`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 2x5 / 3x8 / 100lb / progress: custom() {~
  numberOfSets += 1
~}

## Day 2
Squat / 4x5 / 5x8 / 100lb


`);
  });

  it("decreases num of sets on specific set variation", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 / 2x8 / 100lb / progress: custom() {~
  numberOfSets[2:*:2] -= 2
~}

# Week 2
## Day 1
Squat / 3x5 / 4x8 / 100lb
`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x5 / 2x8 / 100lb / progress: custom() {~
  numberOfSets[2:*:2] -= 2
~}


# Week 2
## Day 1
Squat / 3x5 / 2x8 / 100lb


`);
  });

  it("deletes all the sets", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom() {~
  numberOfSets -= 6
~}`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 0x5 / 100lb / progress: custom() {~
  numberOfSets -= 6
~}


`);
  });

  it("properly fills program, completed and current number of sets", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x8 / progress: custom(pns: 0, ns: 0, cns: 0) {~
  state.pns = programNumberOfSets
  state.ns = numberOfSets
  state.cns = completedNumberOfSets
~} / update: custom() {~
  if (setIndex == 0) {
    numberOfSets = 5
  }
~}`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[8, 8]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 3x8 / update: custom() {~
  if (setIndex == 0) {
    numberOfSets = 5
  }
~} / progress: custom(pns: 3, ns: 5, cns: 2) {~
  state.pns = programNumberOfSets
  state.ns = numberOfSets
  state.cns = completedNumberOfSets
~}


`);
  });

  it("configures all the new sets", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x5 / 100lb / progress: custom() {~
  numberOfSets = 5
  weights[4] = 110lb
  weights[5] = 110lb
  reps[4] = 8
  reps[5] = 8
~}`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 3x5 100lb, 2x8 110lb / progress: custom() {~
  numberOfSets = 5
  weights[4] = 110lb
  weights[5] = 110lb
  reps[4] = 8
  reps[5] = 8
~}


`);
  });

  it("updates lp after completing", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x5 / 100lb / progress: lp(5lb, 2, 0)`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 2x5 / 100lb / progress: lp(5lb, 2, 1)


`);
  });

  it("updates lp and weight after failing", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x5 / 100lb / progress: lp(5lb, 1, 0, 10lb, 2, 1)`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 3]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 2x5 / 90lb / progress: lp(5lb, 1, 0, 10lb, 2, 0)


`);
  });

  it("properly compacts multiple empty lines in-between descriptions", () => {
    const programText = `# Week 1
## Day 1
// Hey

/// Sup


// Hey hey
Squat / 2x5 100lb`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
/// Sup
// Hey

// Hey hey
Squat / 2x5 / 100lb


`);
  });

  it("compacts repeated exercises", () => {
    const programText = `# Week 1
## Day 1
Squat[1-2] / 2x5

# Week 2
## Day 1

# Week 3
## Day 1
Squat / 2x5
`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat[1-3] / 2x5


# Week 2
## Day 1



# Week 3
## Day 1



`);
  });

  it("does not compact repeated exercises if originally didn't use ranges", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x5

# Week 2
## Day 1
Squat / 2x5

# Week 3
## Day 1
Squat / 2x5
`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 2x5


# Week 2
## Day 1
Squat / 2x5


# Week 3
## Day 1
Squat / 2x5


`);
  });

  it("splits and compacts after mid-program progression", () => {
    const programText = `# Week 1
## Day 1
Squat[1-5] / 2x5 / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Bench Press[1-5] / 2x5

# Week 2
## Day 1

# Week 3
## Day 1

# Week 4
## Day 1

# Week 5
## Day 1
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [
        [5, 5],
        [5, 5],
      ],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat[1-2] / 2x5 / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Bench Press[1-5] / 2x5


# Week 2
## Day 1



# Week 3
## Day 1
Squat / 2x5 / 10lb


# Week 4
## Day 1
Squat[4-5] / 2x5


# Week 5
## Day 1



`);
  });

  it("override weights", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 100lb, 1x3 200lb / 60s / progress: dp(5lb, 3, 8)
Bench Press[1-5] / ...Squat / 120lb / progress: lp(5lb)
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [
        [5, 3],
        [5, 3],
      ],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x6 100lb, 1x4 200lb / 60s / progress: dp(5lb, 3, 8)
Bench Press / ...Squat / 1x5, 1x3 / 125lb / progress: lp(5lb)


`);
  });

  it("should work with negative weights", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x5 / -40lb / progress: lp(5lb)
Bench Press / 2x3-5 -20lb / progress: lp(-5lb)
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [
        [5, 5],
        [5, 5],
      ],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 2x5 / -35lb / progress: lp(5lb)
Bench Press / 2x3-5 / -25lb / progress: lp(-5lb)


`);
  });

  it("updates group states", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x5 100lb / progress: custom() {~
  state[4].foo = 5
~}
Bench Press / id: tags(4) / 2x5 100lb / progress: custom(foo: 2) {~
  reps += state.foo
~}
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [
        [5, 5],
        [5, 5],
      ],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 2x5 / 100lb / progress: custom() {~
  state[4].foo = 5
~}
Bench Press / 2x10 / 100lb / id: tags(4) / progress: custom(foo: 5) {~
  reps += state.foo
~}


`);
  });

  it("properly handles askweights", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 100lb+, 1x3 100lb / 60s / progress: lp(5lb)
Bench Press / ...Squat / progress: lp(5lb)
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [
        [5, 3],
        [5, 3],
      ],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x5 105lb+, 1x3 105lb / 60s / progress: lp(5lb)
Bench Press / ...Squat


`);
  });

  it("replace exercise", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 100lb, 1x3 200lb / 60s / progress: lp(5lb)

## Day 2
Bench Press / 3x8 150lb / progress: dp(5lb, 8, 12)
`;
    const newText = PlannerTestUtils.changeExercise(programText, "Squat", {
      id: "overheadPress",
      equipment: "barbell",
    }).trim();
    expect(newText).to.equal(`# Week 1
## Day 1
Overhead Press / 1x5 100lb, 1x3 200lb / 60s / progress: lp(5lb)

## Day 2
Bench Press / 3x8 / 150lb / progress: dp(5lb, 8, 12)`);
  });

  it("replace exercise to the one that already exists in the program", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 100lb, 1x3 200lb / 60s / progress: lp(5lb)

## Day 2
Bench Press / 3x8 / progress: dp(5lb, 8, 12)
`;
    const newText = PlannerTestUtils.changeExercise(programText, "Squat", {
      id: "benchPress",
      equipment: "barbell",
    }).trim();
    expect(newText).to.contain(`Bench Press / 1x5 100lb, 1x3 200lb / 60s / progress: lp(5lb)

## Day 2
Bench Press / 3x8 / progress: dp(5lb, 8, 12)`);
    expect(newText.split("\n")[2]).to.match(/^[a-z]{3}: Bench Press/);
  });

  it("properly update weights", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 100lb, 1x3 200lb / 60s / progress: lp(5lb)
`;
    const newText = PlannerTestUtils.changeWeight(programText, (weightChanges) => {
      weightChanges[1].weight = Weight.build(250, "lb");
      return weightChanges;
    });
    expect(newText.trim()).to.equal(`# Week 1
## Day 1
Squat / 1x5 100lb, 1x3 250lb / 60s / progress: lp(5lb)`);
  });

  it("properly update global weights", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 100lb, 1x3 200lb / 80lb / 60s / progress: lp(80lb)
`;
    const newText = PlannerTestUtils.changeWeight(programText, (weightChanges) => {
      weightChanges[0].weight = Weight.build(100, "lb");
      return weightChanges;
    });
    expect(newText.trim()).to.equal(`# Week 1
## Day 1
Squat / 1x5, 1x3 / 100lb 60s / progress: lp(80lb)`);
  });

  it("properly update default weights", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 50lb, 1x3 80lb / 60s / progress: lp(5lb)
`;
    const newText = PlannerTestUtils.changeWeight(programText, (weightChanges) => {
      weightChanges[0].weight = Weight.build(100, "lb");
      weightChanges[1].weight = Weight.build(150, "lb");
      return weightChanges;
    });
    expect(newText.trim()).to.equal(`# Week 1
## Day 1
Squat / 1x5 100lb, 1x3 150lb / 60s / progress: lp(5lb)`);
  });

  it("use loops", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x8 100lb / progress: custom() {~
  for (var.i in completedReps) {
    if (completedReps[var.i] >= reps[var.i]) {
      weights[var.i] = weights[var.i] + 5lb
    }
  }
~}
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [[8, 6, 8]],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x8 105lb, 1x8 100lb, 1x8 105lb / progress: custom() {~
  for (var.i in completedReps) {
    if (completedReps[var.i] >= reps[var.i]) {
      weights[var.i] = weights[var.i] + 5lb
    }
  }
~}


`);
  });

  it("keeps overridden dp progress", () => {
    const programText = `# Week 1
## Day 1
Squat / used: none / 1x1 / 100% 100s / warmup: none
Bench Press / ...Squat / 3x10 / 30lb / progress: dp(3lb, 8, 12)`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[10, 10, 10]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / used: none / 1x1 / 100% 100s / warmup: none
Bench Press / ...Squat / 3x11 / 30lb / progress: dp(3lb, 8, 12)


`);
  });

  it("keeps customized warmups", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x4-6 / 80% @8+ 180s / warmup: 2x10 50%, 1x4 70%`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[6, 6, 6]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 3x4-6 / 80% @8+ 180s / warmup: 2x10 50%, 1x4 70%


`);
  });

  it("keeps overridden update", () => {
    const programText = `# Week 1
## Day 1
Squat / used: none / 1x1 / 100% 100s / warmup: none
Bench Press / ...Squat / 3x10 / 30lb / update: custom() {~ weights += 5lb ~}`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[10, 10, 10]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / used: none / 1x1 / 100% 100s / warmup: none
Bench Press / ...Squat / 3x10 / 30lb / update: custom() {~ weights += 5lb ~}


`);
  });

  it("keeps @0 RPE", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5, 1x5+ @0+ / 100lb`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[2]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x5, 1x5+ @0+ / 100lb


`);
  });

  it("keeps reused progress from another exercise with set reuse", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x1 100lb / used: none / progress: custom() {~
  weights += 5lb
~}
Bench Press / used: none / 1x2 100lb
Chest Fly / ...Bench Press / 120lb / progress: custom(foo: 1) { ...Squat }`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[2]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / used: none / 1x1 / 100lb / progress: custom() {~
  weights += 5lb
~}
Bench Press / used: none / 1x2 / 100lb
Chest Fly / ...Bench Press / 125lb / progress: custom(foo: 1) { ...Squat }


`);
  });

  it("keeps reused update from another exercise with set reuse", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x1 100lb / used: none / update: custom() {~
  weights += 5lb
~}
Bench Press / used: none / 1x2 100lb
Chest Fly / ...Bench Press / 120lb / update: custom() { ...Squat }`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[2]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / used: none / 1x1 / 100lb / update: custom() {~
  weights += 5lb
~}
Bench Press / used: none / 1x2 / 100lb
Chest Fly / ...Bench Press / 120lb / update: custom() { ...Squat }


`);
  });

  it("use templates", () => {
    const programText = `# Week 1
## Day 1
tmp: Squat[1-5] / 2x5 / used: none / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Squat[1-5] / ...tmp: Squat / progress: custom() { ...tmp: Squat }
Bench Press[1-5] / ...tmp: Squat / progress: custom() { ...tmp: Squat }

# Week 2
## Day 1

# Week 3
## Day 1

# Week 4
## Day 1

# Week 5
## Day 1
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [
        [5, 5],
        [5, 5],
      ],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
tmp: Squat[1-5] / used: none / 2x5 / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Squat[1-2] / ...tmp: Squat
Bench Press[1-2] / ...tmp: Squat


# Week 2
## Day 1



# Week 3
## Day 1
Squat / ...tmp: Squat / 10lb
Bench Press / ...tmp: Squat / 10lb


# Week 4
## Day 1
Squat[4-5] / ...tmp: Squat
Bench Press[4-5] / ...tmp: Squat


# Week 5
## Day 1



`);
  });

  it("doesn't show an error if original exercise progress reuses another exercise but overrides progress", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x1 100lb / progress: custom(increment: 10lb) { ...Bench Press }
Bench Press / ...Squat / progress: custom() {~ ~}
`;
    const planner: IPlannerProgram = { name: "MyProgram", weeks: PlannerProgram.evaluateText(programText) };
    const evaluatedWeeks = PlannerProgram.evaluate(planner, Settings.build()).evaluatedWeeks;
    expect(evaluatedWeeks[0][0].success).to.be.true;
  });

  it("doesn't show an error if original exercise update reuses another exercise but overrides update", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x1 100lb / update: custom() { ...Bench Press }
Bench Press / ...Squat / update: custom() {~ ~}
`;
    const planner: IPlannerProgram = { name: "MyProgram", weeks: PlannerProgram.evaluateText(programText) };
    const evaluatedWeeks = PlannerProgram.evaluate(planner, Settings.build()).evaluatedWeeks;
    expect(evaluatedWeeks[0][0].success).to.be.true;
  });

  it("show an error for reuse/repeat mismatch", () => {
    const programText = `# Week 1
## Day 1
tmp: Squat[1-2] / 2x5 / used: none / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Squat[1-5] / ...tmp: Squat / progress: custom() { ...tmp: Squat }
Bench Press[1-5] / ...tmp: Squat / progress: custom() { ...tmp: Squat }

# Week 2
## Day 1

# Week 3
## Day 1

# Week 4
## Day 1

# Week 5
## Day 1
`;
    const planner: IPlannerProgram = { name: "MyProgram", weeks: PlannerProgram.evaluateText(programText) };
    const evaluatedWeeks = PlannerProgram.evaluate(planner, Settings.build()).evaluatedWeeks;
    expect(evaluatedWeeks[2][0]).to.deep.equal({
      success: false,
      error: new PlannerSyntaxError("Squat: No such exercise tmp: Squat at week: 3 (4:13)", 0, 0, 0, 0),
    });
  });

  it("preserves order of exercises", () => {
    const programText = `# Week 1
## Day 1
tmp: Squat[1-5] / 2x5 / used: none
Squat[1-5, 3] / ...tmp: Squat 
Bench Press[1-5,2] / ...tmp: Squat

# Week 2
## Day 1
Bicep Curl[2-5] / 5x5

# Week 3
## Day 1

# Week 4
## Day 1

# Week 5
## Day 1
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [
        [5, 5],
        [5, 5],
      ],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
tmp: Squat[1-5] / used: none / 2x5
Squat[3,1-5] / ...tmp: Squat
Bench Press[2,1-5] / ...tmp: Squat


# Week 2
## Day 1
Bicep Curl[2-5] / 5x5


# Week 3
## Day 1



# Week 4
## Day 1



# Week 5
## Day 1



`);
  });

  it("dereuses the custom progress when diverges", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x2 100lb / progress: custom(increase: 5lb) {~
  if (completedReps >= reps) {
    weights += 5lb
  } else {
    state.increase = 2.5lb
  }
~}
Bench Press / ...Squat
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [[2], [1]],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x2 / 105lb / progress: custom(increase: 5lb) {~
  if (completedReps >= reps) {
    weights += 5lb
  } else {
    state.increase = 2.5lb
  }
~}
Bench Press / ...Squat / 100lb / progress: custom(increase: 2.5lb) { ...Squat }


`);
  });

  it("uses the inherited state for update blocks", () => {
    const programText = `# Week 1
## Day 1
Leg Press / 2x2 100lb / progress: custom(foo: 1) {~
  state.foo += 1
~}
Squat / 2x2 200lb / update: custom() {~
  state.foo += 1
~} / progress: custom() { ...Leg Press }
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [
        [2, 2],
        [2, 2],
      ],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Leg Press / 2x2 / 100lb / progress: custom(foo: 2) {~
  state.foo += 1
~}
Squat / 2x2 / 200lb / update: custom() {~
  state.foo += 1
~} / progress: custom(foo: 3) { ...Leg Press }


`);
  });

  it("doesn't combine different user prompted vars", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x1 / 100% / progress: custom(foo: 0) {~

~}
Bench Press / ...Squat / progress: custom(foo+: 0) { ...Squat }
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [[1], [1]],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x1 / 100% / progress: custom(foo: 0) {~

~}
Bench Press / ...Squat / progress: custom(foo+: 0) { ...Squat }


`);
  });

  it("doesn't dereuse if the custom progress still matches", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x2 100lb / progress: custom(increase: 5lb) {~
  if (completedReps >= reps) {
    weights += 5lb
  } else {
    state.increase = 2.5lb
  }
~}
Bench Press / ...Squat
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [[2], [2]],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x2 / 105lb / progress: custom(increase: 5lb) {~
  if (completedReps >= reps) {
    weights += 5lb
  } else {
    state.increase = 2.5lb
  }
~}
Bench Press / ...Squat


`);
  });

  it("combine reuse if the custom progress starts to match", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x2 100lb / progress: custom(increase: 5lb) {~
  if (completedReps >= reps) {
    weights += 5lb
  } else {
    state.increase = 2.5lb
  }
~}
Bench Press / ...Squat / progress: custom(increase: 2.5lb) { ...Squat }
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [[1], [2]],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x2 / 100lb / progress: custom(increase: 2.5lb) {~
  if (completedReps >= reps) {
    weights += 5lb
  } else {
    state.increase = 2.5lb
  }
~}
Bench Press / ...Squat / 105lb


`);
  });

  it("dereuse lp in case of mismatch", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x2 100lb / progress: lp(5lb, 2, 0, 10lb, 2, 0)
Bench Press / ...Squat
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [[1], [2]],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x2 / 100lb / progress: lp(5lb, 2, 0, 10lb, 2, 1)
Bench Press / ...Squat / progress: lp(5lb, 2, 1, 10lb, 2, 0)


`);
  });

  it("combine lp in case it matches again", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x2 100lb / progress: lp(5lb)
Bench Press[1-3] / ...Squat

# Week 2
## Day 1
Squat / 1x3 100lb

# Week 3
## Day 1
Squat / 1x4 100lb


`;
    const { program } = PlannerTestUtils.finish(
      programText,
      {
        completedReps: [[3], [2]],
      },
      Settings.build(),
      2
    );
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x2 / 105lb / progress: lp(5lb)
Bench Press[1-3] / ...Squat / 100lb


# Week 2
## Day 1
Squat / 1x3 / 105lb


# Week 3
## Day 1
Squat / 1x4 / 105lb


`);
  });

  it("updates the state from update scripts", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x1 100lb / update: custom() {~
  state.foo = 3
  state.zzz = 5
~} / progress: custom(foo: 0, bar: 0, zzz: 0) {~
  state.bar = 4
  state.zzz = 6
~}
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [[1], [1]],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x1 / 100lb / update: custom() {~
  state.foo = 3
  state.zzz = 5
~} / progress: custom(foo: 3, bar: 4, zzz: 6) {~
  state.bar = 4
  state.zzz = 6
~}


`);
  });

  it("uses the right exercise for reuse", () => {
    const programText = `# Week 1
## Day 1
Pec Deck / 1x1 100lb / progress: custom() { ...Squat }
Squat, Smith Machine / 1x1 100lb / progress: custom() { ...Squat }

## Day 2
Squat / 1x1 100lb / progress: custom() {~ weights += 5lb ~}
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [[1], [1]],
    });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Pec Deck / 1x1 / 105lb / progress: custom() { ...Squat }
Squat, Smith Machine / 1x1 / 105lb / progress: custom() { ...Squat }

## Day 2
Squat / 1x1 / 100lb / progress: custom() {~ weights += 5lb ~}


`);
  });

  it("preserves the day descriptions after finishing the workout", () => {
    const programText = `# Week 1
// A: Day 1
## Day 1
Squat / 2x5 / 100lb

## Day 2
Bench Press / 2x5 / 100lb

// Week 2
# Week 2

## Day 1
Squat / 2x5 / 100lb

// B: Day 2
## Day 2
Bench Press / 2x5 / 100lb

# Week 3
//
## Day 1
Squat / 2x5 / 100lb

## Day 2
Bench Press / 2x5 / 100lb

# Week 4
## Day 1
Squat / 2x5 / 100lb

//
## Day 2
Bench Press / 2x5 / 100lb

`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
// A: Day 1
## Day 1
Squat / 2x5 / 100lb

## Day 2
Bench Press / 2x5 / 100lb


// Week 2
# Week 2
## Day 1
Squat / 2x5 / 100lb

// B: Day 2
## Day 2
Bench Press / 2x5 / 100lb


# Week 3
// 
## Day 1
Squat / 2x5 / 100lb

## Day 2
Bench Press / 2x5 / 100lb


# Week 4
## Day 1
Squat / 2x5 / 100lb

// 
## Day 2
Bench Press / 2x5 / 100lb


`);
  });

  it("preserves triple comments at the end of the day", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x5 / 100lb
/// Some stuff

// More stuff
## Day 2
Bench Press / 2x5 / 100lb

`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 2x5 / 100lb
/// Some stuff

// More stuff
## Day 2
Bench Press / 2x5 / 100lb


`);
  });

  it("properly sets up day data on repeated exercises", () => {
    const programText = `# Week 1
## Day 1
## Day 2
Squat[1-3] / 1x5 / 200lb / warmup: none / progress: custom(week: 1, dayInWeek: 1, day: 1) {~
  state.day = day
  state.dayInWeek = dayInWeek
  state.week = week
~}
# Week 2
## Day 1
## Day 2
# Week 3
## Day 1
## Day 2

`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5]] }, Settings.build(), 4);
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1


## Day 2
Squat[1-3] / 1x5 / 200lb / warmup: none / progress: custom(week: 2, dayInWeek: 2, day: 4) {~
  state.day = day
  state.dayInWeek = dayInWeek
  state.week = week
~}


# Week 2
## Day 1


## Day 2



# Week 3
## Day 1


## Day 2



`);
  });

  it("preserves end of exercise properly", () => {
    const programText = `/// Some stuff

// Week description

# Week 1
## Day 1
Squat / 2x5 / 100lb
/// Some stuff

/// More

// More stuff

/// Triple comment

## Day 2
/// Triple Comment

// Description


/// More stuff
Bench Press / 2x5 / 100lb

`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`// Week description
# Week 1
## Day 1
Squat / 2x5 / 100lb
/// Some stuff

/// More

// More stuff
## Day 2
/// Triple Comment

/// More stuff
// Description
Bench Press / 2x5 / 100lb


`);
  });

  it("migrates weights to completedWeights", () => {
    const script = `# Week 1
## Day 1
/// asdfasd
// A: Day 1
// *** Some stuff
Squat / 2x5 / 100lb / progress: custom() {~
  if (completedReps >= reps) {
    weights[1] = (1 + weights[3] + weights)
  }
~} / update: custom() {~
  // Some stuff
  if (setIndex == 1) {
    var.a = weights[1] + weights[3]
    weights = weights[1] * 0.5 + (weights[3] == 30lb ? weights[4] : weights[3])
  }
~}`;
    const newScript = PlannerExerciseEvaluator.changeWeightsToCompletedWeights(script);
    expect(newScript).to.equal(`# Week 1
## Day 1
/// asdfasd
// A: Day 1
// *** Some stuff
Squat / 2x5 / 100lb / progress: custom() {~
  if (completedReps >= reps) {
    weights[1] = (1 + completedWeights[3] + completedWeights)
  }
~} / update: custom() {~
  // Some stuff
  if (setIndex == 1) {
    var.a = completedWeights[1] + completedWeights[3]
    weights = completedWeights[1] * 0.5 + (completedWeights[3] == 30lb ? completedWeights[4] : completedWeights[3])
  }
~}`);
  });
});
