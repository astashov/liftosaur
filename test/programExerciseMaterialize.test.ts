import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { Program_evaluate } from "../src/models/program";
import { ProgramToPlanner } from "../src/models/programToPlanner";

const settings = Settings_build();

function materialize(programText: string, name: string, week: number = 1, dayInWeek: number = 1): string {
  const { program } = PlannerTestUtils_get(programText);
  const evaluatedProgram = Program_evaluate(program, settings);
  const day = evaluatedProgram.weeks[week - 1].days[dayInWeek - 1];
  const exercise = day.exercises.find((e) => e.fullName === name);
  if (exercise == null) {
    throw new Error(`No exercise ${name} in week ${week}, day ${dayInWeek}`);
  }
  return new ProgramToPlanner(evaluatedProgram, settings).materializeExercise(exercise);
}

describe("ProgramToPlanner.materializeExercise", () => {
  it("prints an exercise that reuses nothing as it was written", () => {
    const text = `# Week 1
## Day 1
Squat / 3x8 100lb @8 60s / progress: lp(5lb)
`;
    expect(materialize(text, "Squat")).to.equal("Squat / 3x8 / 100lb @8 60s / progress: lp(5lb)");
  });

  it("resolves reused sets", () => {
    const text = `# Week 1
## Day 1
Squat / 3x8 100lb @8 60s
Bench Press / ...Squat
`;
    expect(materialize(text, "Bench Press")).to.equal("Bench Press / 3x8 / 100lb @8 60s");
  });

  it("folds an override into the reused sets", () => {
    const text = `# Week 1
## Day 1
Squat / 3x8 100lb @8 60s
Bench Press / ...Squat / 80lb
`;
    expect(materialize(text, "Bench Press")).to.equal("Bench Press / 3x8 / 80lb @8 60s");
  });

  it("resolves a reused progress into its script and every state variable", () => {
    const text = `# Week 1
## Day 1
Squat / 3x8 100lb / progress: custom(increment: 5lb, counter: 0) {~
  if (completedReps >= reps) {
    weights += state.increment
  }
~}
Bench Press / 3x8 80lb / progress: custom(increment: 10lb) { ...Squat }
`;
    const result = materialize(text, "Bench Press");
    expect(result).to.include("progress: custom(increment: 10lb, counter: 0)");
    expect(result).to.include("weights += state.increment");
    expect(result).to.not.include("...Squat");
  });

  it("resolves a reused update", () => {
    const text = `# Week 1
## Day 1
Squat / 3x8 100lb / update: custom() {~ weights = 50lb ~}
Bench Press / 3x8 80lb / update: custom() { ...Squat }
`;
    const result = materialize(text, "Bench Press");
    expect(result).to.include("update: custom() {~ weights = 50lb ~}");
    expect(result).to.not.include("...Squat");
  });

  it("prints properties declared on another week", () => {
    const text = `# Week 1
## Day 1
Squat / 3x8 100lb / warmup: 2x5 45lb / progress: lp(5lb)

# Week 2
## Day 1
Squat / 3x5 110lb
`;
    expect(materialize(text, "Squat", 2)).to.equal("Squat / 3x5 / 110lb / warmup: 2x5 45lb / progress: lp(5lb)");
  });

  it("keeps a per-day progress: none rather than resolving the exercise's progression", () => {
    const text = `# Week 1
## Day 1
Squat / 3x8 100lb / progress: lp(5lb)

# Week 2
## Day 1
Squat / 3x5 110lb / progress: none
`;
    expect(materialize(text, "Squat", 2)).to.equal("Squat / 3x5 / 110lb / progress: none");
  });

  it("resolves sets reused from another week", () => {
    const text = `# Week 1
## Day 1
Squat / 3x8 100lb @8

# Week 2
## Day 1
Squat / 5x3 120lb
Bench Press / ...Squat[1:1]
`;
    expect(materialize(text, "Bench Press", 2)).to.equal("Bench Press / 3x8 / 100lb @8");
  });

  it("resolves each week's own reuse target separately", () => {
    const text = `# Week 1
## Day 1
Squat / 3x8 100lb
Bench Press / ...Squat

# Week 2
## Day 1
Squat / 5x3 120lb
Bench Press / ...Squat
`;
    expect(materialize(text, "Bench Press", 1)).to.equal("Bench Press / 3x8 / 100lb");
    expect(materialize(text, "Bench Press", 2)).to.equal("Bench Press / 5x3 / 120lb");
  });

  it("keeps labels, tags, supersets and templates", () => {
    const text = `# Week 1
## Day 1
tempo: Squat / 3x8 100lb / id: tags(1) / superset: A
Bench Press / used: none / 3x8 80lb
`;
    expect(materialize(text, "tempo: Squat")).to.equal("tempo: Squat / 3x8 / 100lb / id: tags(1) / superset: A");
    expect(materialize(text, "Bench Press")).to.equal("Bench Press / used: none / 3x8 / 80lb");
  });

  it("prints no sets for a template that only carries properties", () => {
    const text = `# Week 1
## Day 1
t1 / used: none / 3x5 100lb / progress: custom() {~ weights += 1lb ~}
tmpl / used: none / progress: custom() { ...t1 }
Squat / 3x5 100lb / progress: custom() { ...tmpl }
`;
    expect(materialize(text, "tmpl")).to.equal("tmpl / used: none / progress: custom() {~ weights += 1lb ~}");
  });

  // Chains deeper than this are rejected by the evaluator (see planner.test.ts) precisely because
  // nothing resolves them, so the view never has to render an unresolvable one.
  it("resolves a progress reused through a template that reuses another", () => {
    const text = `# Week 1
## Day 1
t1 / used: none / 3x5 100lb / progress: custom() {~ weights += 1lb ~}
t2 / used: none / 3x5 100lb / progress: custom() { ...t1 }
Squat / 3x5 100lb / progress: custom() { ...t2 }
`;
    expect(materialize(text, "Squat")).to.equal("Squat / 3x5 / 100lb / progress: custom() {~ weights += 1lb ~}");
  });

  it("resolves reused warmups", () => {
    const text = `# Week 1
## Day 1
Squat / 3x8 100lb / warmup: 2x5 45lb, 1x3 60lb
Bench Press / ...Squat
`;
    expect(materialize(text, "Bench Press")).to.equal("Bench Press / 3x8 / 100lb / warmup: 2x5 45lb, 1x3 60lb");
  });
});
