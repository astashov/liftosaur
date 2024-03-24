import "mocha";
import { expect } from "chai";
import { PlannerProgram } from "../src/pages/planner/models/plannerProgram";
import { PlannerTestUtils } from "./utils/plannerTestUtils";
import { IPlannerProgram } from "../src/types";
import { Settings } from "../src/models/settings";
import { PlannerSyntaxError } from "../src/pages/planner/plannerExerciseEvaluator";

describe("Planner", () => {
  it("updates weight and lp progress after completing", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x5 / 100lb / progress: lp(5lb)`;
    const { program } = PlannerTestUtils.finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram.generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 2x5 / 105lb / progress: lp(5lb, 1, 0, 10lb, 0, 0)


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
Squat[1-2] / ...tmp: Squat / progress: custom() { ...tmp: Squat }
Bench Press[1-2] / ...tmp: Squat / progress: custom() { ...tmp: Squat }


# Week 2
## Day 1



# Week 3
## Day 1
Squat / 2x5 / 126.8lb
Bench Press / 2x5 / 126.8lb


# Week 4
## Day 1
Squat[4-5] / ...tmp: Squat
Bench Press[4-5] / ...tmp: Squat


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
      error: new PlannerSyntaxError("No such exercise tmp: Squat at week: 3 (4:13)", 0, 0, 0, 0),
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
Squat[3,1-5] / ...tmp: Squat
Bench Press[2,1-5] / ...tmp: Squat


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
});
