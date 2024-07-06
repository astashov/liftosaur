import "mocha";
import { expect } from "chai";
import { PlannerProgram } from "../src/pages/planner/models/plannerProgram";
import { PlannerTestUtils } from "./utils/plannerTestUtils";
import { IPlannerProgram } from "../src/types";
import { Settings } from "../src/models/settings";
import { PlannerSyntaxError } from "../src/pages/planner/plannerExerciseEvaluator";
import { Weight } from "../src/models/weight";

describe("Planner", () => {
  it("updates weight and lp progress after completing", () => {
    const programText = `# Week 1
## Day 1
Squat, Barbell / 2x5 / 100lb / progress: lp(5lb)`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat, Barbell / 2x5 / 105lb / progress: lp(5lb, 1, 0, 10lb, 0, 0)


`);
  });

  it("compacts repeated exercises", () => {
    const programText = `# Week 1
## Day 1
Squat, Barbell[1-2] / 2x5

# Week 2
## Day 1

# Week 3
## Day 1
Squat, Barbell / 2x5
`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat, Barbell[1-3] / 2x5 / 86.53%


# Week 2
## Day 1



# Week 3
## Day 1



`);
  });

  it("does not compact repeated exercises if originally didn't use ranges", () => {
    const programText = `# Week 1
## Day 1
Squat, Barbell / 2x5

# Week 2
## Day 1
Squat, Barbell / 2x5

# Week 3
## Day 1
Squat, Barbell / 2x5
`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat, Barbell / 2x5 / 86.53%


# Week 2
## Day 1
Squat, Barbell / 2x5 / 86.53%


# Week 3
## Day 1
Squat, Barbell / 2x5 / 86.53%


`);
  });

  it("splits and compacts after mid-program progression", () => {
    const programText = `# Week 1
## Day 1
Squat, Barbell[1-5] / 2x5 / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Bench Press, Barbell[1-5] / 2x5

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
Squat, Barbell[1-2] / 2x5 / 86.53% / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Bench Press, Barbell[1-5] / 2x5 / 86.53%


# Week 2
## Day 1



# Week 3
## Day 1
Squat, Barbell / 2x5 / 126.8lb


# Week 4
## Day 1
Squat, Barbell[4-5] / 2x5 / 86.53%


# Week 5
## Day 1



`);
  });

  it("override weights", () => {
    const programText = `# Week 1
## Day 1
Squat, Barbell / 1x5 100lb, 1x3 200lb / 60s / progress: dp(5lb, 3, 8)
Bench Press, Barbell[1-5] / ...Squat, Barbell / 120lb / progress: lp(5lb)
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
Squat, Barbell / 1x6 100lb, 1x4 200lb / 60s / progress: dp(5lb, 3, 8)
Bench Press, Barbell / ...Squat, Barbell / 1x5, 1x3 / 125lb / progress: lp(5lb, 1, 0, 10lb, 0, 0)


`);
  });

  it("properly handles askweights", () => {
    const programText = `# Week 1
## Day 1
Squat, Barbell / 1x5 100lb+, 1x3 100lb / 60s / progress: lp(5lb)
Bench Press, Barbell / ...Squat, Barbell / progress: lp(5lb)
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
Squat, Barbell / 1x5 105lb+, 1x3 105lb / 60s / progress: lp(5lb, 1, 0, 10lb, 0, 0)
Bench Press, Barbell / ...Squat, Barbell / 1x5 105lb+, 1x3 105lb / progress: lp(5lb, 1, 0, 10lb, 0, 0)


`);
  });

  it("properly update weights", () => {
    const programText = `# Week 1
## Day 1
Squat, Barbell / 1x5 100lb, 1x3 200lb / 60s / progress: lp(5lb)
`;
    const newText = PlannerTestUtils.changeWeight(programText, (weightChanges) => {
      weightChanges[1].weight = Weight.build(250, "lb");
      return weightChanges;
    });
    expect(newText.trim()).to.equal(`# Week 1
## Day 1
Squat, Barbell / 1x5 100lb, 1x3 250lb / 60s / progress: lp(5lb, 1, 0, 10lb, 0, 0)`);
  });

  it("properly update global weights", () => {
    const programText = `# Week 1
## Day 1
Squat, Barbell / 1x5 100lb, 1x3 200lb / 80lb / 60s / progress: lp(80lb)
`;
    const newText = PlannerTestUtils.changeWeight(programText, (weightChanges) => {
      weightChanges[0].weight = Weight.build(100, "lb");
      return weightChanges;
    });
    expect(newText.trim()).to.equal(`# Week 1
## Day 1
Squat, Barbell / 1x5, 1x3 / 100lb / 60s / progress: lp(80lb, 1, 0, 10lb, 0, 0)`);
  });

  it("properly update default weights", () => {
    const programText = `# Week 1
## Day 1
Squat, Barbell / 1x5, 1x3 / 60s / progress: lp(5lb)
`;
    const newText = PlannerTestUtils.changeWeight(programText, (weightChanges) => {
      weightChanges[0].weight = Weight.build(100, "lb");
      weightChanges[1].weight = Weight.build(150, "lb");
      return weightChanges;
    });
    expect(newText.trim()).to.equal(`# Week 1
## Day 1
Squat, Barbell / 1x5 100lb, 1x3 150lb / 60s / progress: lp(5lb, 1, 0, 10lb, 0, 0)`);
  });

  it("use loops", () => {
    const programText = `# Week 1
## Day 1
Squat, Barbell / 3x8 100lb / progress: custom() {~
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
Squat, Barbell / 1x8 105lb, 1x8 100lb, 1x8 105lb / progress: custom() {~
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
tmp: Squat, Barbell[1-5] / 2x5 / used: none / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Squat, Barbell[1-5] / ...tmp: Squat, Barbell / progress: custom() { ...tmp: Squat, Barbell}
Bench Press, Barbell[1-5] / ...tmp: Squat, Barbell / progress: custom() { ...tmp: Squat, Barbell}

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
tmp: Squat, Barbell[1-5] / used: none / 2x5 / 86.53% / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Squat, Barbell[1-2] / ...tmp: Squat, Barbell / 86.53% / progress: custom() { ...tmp: Squat, Barbell}
Bench Press, Barbell[1-2] / ...tmp: Squat, Barbell / 86.53% / progress: custom() { ...tmp: Squat, Barbell}


# Week 2
## Day 1



# Week 3
## Day 1
Squat, Barbell / ...tmp: Squat, Barbell / 126.8lb
Bench Press, Barbell / ...tmp: Squat, Barbell / 126.8lb


# Week 4
## Day 1
Squat, Barbell[4-5] / ...tmp: Squat, Barbell / 86.53%
Bench Press, Barbell[4-5] / ...tmp: Squat, Barbell / 86.53%


# Week 5
## Day 1



`);
  });

  it("show an error for reuse/repeat mismatch", () => {
    const programText = `# Week 1
## Day 1
tmp: Squat, Barbell[1-2] / 2x5 / used: none / progress: custom() {~
  weights[3:*:*:*] += 10lb
~}
Squat, Barbell[1-5] / ...tmp: Squat, Barbell / progress: custom() { ...tmp: Squat, Barbell}
Bench Press, Barbell[1-5] / ...tmp: Squat, Barbell / progress: custom() { ...tmp: Squat, Barbell}

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
      error: new PlannerSyntaxError("Squat: No such exercise tmp: Squat, Barbellat week: 3 (4:13)", 0, 0, 0, 0),
    });
  });

  it("preserves order of exercises", () => {
    const programText = `# Week 1
## Day 1
tmp: Squat, Barbell[1-5] / 2x5 / used: none
Squat, Barbell[1-5, 3] / ...tmp: Squat, Barbell
Bench Press, Barbell[1-5,2] / ...tmp: Squat, Barbell

# Week 2
## Day 1
Bicep Curl, Dumbbell[2-5] / 5x5

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
tmp: Squat, Barbell[1-5] / used: none / 2x5 / 86.53%
Squat, Barbell[3,1-5] / ...tmp: Squat, Barbell / 86.53%
Bench Press, Barbell[2,1-5] / ...tmp: Squat, Barbell / 86.53%


# Week 2
## Day 1
Bicep Curl, Dumbbell[2-5] / 5x5 / 86.53%


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
Pec Deck, LeverageMachine / 1x1 100lb / progress: custom() { ...Squat, Barbell }
Squat, Smith Machine / 1x1 100lb / progress: custom() { ...Squat, Barbell }

## Day 2
Squat, Barbell / 1x1 100lb / progress: custom() {~ weights += 5lb ~}
`;
    const { program } = PlannerTestUtils.finish(programText, {
      completedReps: [[1], [1]],
    });
    const weight = program.exercises.find((e) => e.name === "Pec Deck")!.variations[0].sets[0].weightExpr;
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(weight).to.equal("105lb");
    expect(newText).to.equal(`# Week 1
## Day 1
Pec Deck, LeverageMachine / 1x1 / 105lb / progress: custom() { ...Squat, Barbell }
Squat, Smith Machine / 1x1 / 105lb / progress: custom() { ...Squat, Barbell }

## Day 2
Squat, Barbell / 1x1 / 100lb / progress: custom() {~ weights += 5lb ~}


`);
  });
});
