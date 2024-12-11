import "mocha";
import { expect } from "chai";
import { PlannerProgram } from "../src/pages/planner/models/plannerProgram";
import { PlannerTestUtils } from "./utils/plannerTestUtils";
import { IPlannerProgram, IUnit } from "../src/types";
import { Settings } from "../src/models/settings";
import { PlannerSyntaxError } from "../src/pages/planner/plannerExerciseEvaluator";
import { Weight } from "../src/models/weight";
import { Program } from "../src/models/program";

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
Squat / 0x1 0lb / progress: custom() {~
  numberOfSets -= 6
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
Squat[1-3] / 2x5 / 86.53%


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
Squat / 2x5 / 86.53%


# Week 2
## Day 1
Squat / 2x5 / 86.53%


# Week 3
## Day 1
Squat / 2x5 / 86.53%


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
Squat[1-2] / 2x5 / 86.53% / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Bench Press[1-5] / 2x5 / 86.53%


# Week 2
## Day 1



# Week 3
## Day 1
Squat / 2x5 / 126.8lb


# Week 4
## Day 1
Squat[4-5] / 2x5 / 86.53%


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
Bench Press / ...Squat / 1x5 105lb+, 1x3 105lb / progress: lp(5lb)


`);
  });

  it("replace exercise", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 100lb, 1x3 200lb / 60s / progress: lp(5lb)

## Day 2
Bench Press / 3x8 / progress: dp(5lb, 8, 12)
`;
    const newText = PlannerTestUtils.changeExercise(programText, "Squat", {
      id: "overheadPress",
      equipment: "barbell",
    }).trim();
    expect(newText).to.equal(`# Week 1
## Day 1
Overhead Press / 1x5 100lb, 1x3 200lb / 60s / progress: lp(5lb)

## Day 2
Bench Press / 3x8 / progress: dp(5lb, 8, 12)`);
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
Squat / 1x5, 1x3 / 100lb / 60s / progress: lp(80lb)`);
  });

  it("properly update default weights", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5, 1x3 / 60s / progress: lp(5lb)
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
tmp: Squat[1-5] / used: none / 2x5 / 86.53% / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Squat[1-2] / ...tmp: Squat / 86.53% / progress: custom() { ...tmp: Squat }
Bench Press[1-2] / ...tmp: Squat / 86.53% / progress: custom() { ...tmp: Squat }


# Week 2
## Day 1



# Week 3
## Day 1
Squat / ...tmp: Squat / 126.8lb
Bench Press / ...tmp: Squat / 126.8lb


# Week 4
## Day 1
Squat[4-5] / ...tmp: Squat / 86.53%
Bench Press[4-5] / ...tmp: Squat / 86.53%


# Week 5
## Day 1



`);
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
    let { program } = PlannerTestUtils.finish(programText, {
      completedReps: [
        [5, 5],
        [5, 5],
      ],
    });
    program = Program.fullProgram(program, Settings.build());
    const exerciseNamesWeek3 = program.weeks[2].days
      .map((d1) =>
        program.days
          .find((d2) => d1.id === d2.id)!
          .exercises.map((e1) => program.exercises.find((e2) => e1.id === e2.id))
      )
      .flat(3)
      .map((e) => e!.name);
    expect(exerciseNamesWeek3).to.eql(["Bicep Curl", "Bench Press", "Squat"]);
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
tmp: Squat[1-5] / used: none / 2x5 / 86.53%
Squat[3,1-5] / ...tmp: Squat / 86.53%
Bench Press[2,1-5] / ...tmp: Squat / 86.53%


# Week 2
## Day 1
Bicep Curl[2-5] / 5x5 / 86.53%


# Week 3
## Day 1



# Week 4
## Day 1



# Week 5
## Day 1



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
    let { program } = PlannerTestUtils.finish(programText, {
      completedReps: [[1], [1]],
    });
    program = Program.fullProgram(program, Settings.build());
    const weight = program.exercises.find((e) => e.name === "Pec Deck")!.variations[0].sets[0].weightExpr;
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(weight).to.equal("105lb");
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
});
