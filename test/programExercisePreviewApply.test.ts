import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { Program_evaluate } from "../src/models/program";
import { IProgram, IPlannerProgram, IDayData } from "../src/types";
import {
  IProgramExercisePreviewApplied,
  ProgramExercisePreview_apply,
  ProgramExercisePreview_materialize,
} from "../src/models/programExercisePreview";
import { ProgramExerciseText_findDeclaration } from "../src/models/programExerciseText";

const settings = Settings_build();

interface IOpened {
  program: IProgram;
  planner: IPlannerProgram;
  declarationDayData: Required<IDayData>;
  tappedDayData: Required<IDayData>;
  key: string;
  fullName: string;
  panel: string;
}

function open(programText: string, fullName: string, week: number = 1, dayInWeek: number = 1): IOpened {
  const { program } = PlannerTestUtils_get(programText);
  const planner = program.planner;
  if (planner == null) {
    throw new Error("No planner");
  }
  const evaluatedProgram = Program_evaluate(program, settings);
  const day = evaluatedProgram.weeks[week - 1].days[dayInWeek - 1];
  const tapped = day.exercises.find((e) => e.fullName === fullName);
  if (tapped == null) {
    throw new Error(`No exercise ${fullName} in week ${week}, day ${dayInWeek}`);
  }
  const declaration = ProgramExerciseText_findDeclaration(evaluatedProgram, tapped);
  const panel = ProgramExercisePreview_materialize(program, planner, tapped.dayData, tapped.key, settings);
  if (panel == null) {
    throw new Error(`Couldn't materialize ${fullName}`);
  }
  return {
    program,
    planner,
    declarationDayData: declaration.dayData,
    tappedDayData: tapped.dayData,
    key: tapped.key,
    fullName,
    panel,
  };
}

function apply(opened: IOpened, panelText: string): IProgramExercisePreviewApplied | { error: string } {
  const result = ProgramExercisePreview_apply(
    opened.planner,
    { key: opened.key, dayData: opened.declarationDayData, tappedDayData: opened.tappedDayData },
    panelText,
    settings
  );
  return "error" in result ? { error: result.error.message } : result;
}

function dayText(planner: IPlannerProgram, week: number, dayInWeek: number): string {
  return planner.weeks[week - 1].days[dayInWeek - 1].exerciseText.trim();
}

function blurbOf(result: ReturnType<typeof apply>): string {
  if ("error" in result) {
    throw new Error(result.error);
  }
  return result.blurb;
}

function plannerOf(result: ReturnType<typeof apply>): IPlannerProgram {
  if ("error" in result) {
    throw new Error(result.error);
  }
  return result.planner;
}

const reuseProgram = `# Week 1
## Day 1
t1 / used: none / 5x3 / 6x2 / 10x1 / 150lb / progress: lp(5lb)
T1: Squat / ...t1
`;

describe("ProgramExercisePreview_apply", () => {
  it("materializes the reused line for the panel", () => {
    const opened = open(reuseProgram, "T1: Squat");
    expect(opened.panel).to.equal("T1: Squat / 5x3 / 6x2 / 10x1 / 150lb / progress: lp(5lb)");
  });

  it("writes make current as a sets override and keeps the weight and progress reused", () => {
    const opened = open(reuseProgram, "T1: Squat");
    const result = apply(opened, "T1: Squat / 5x3 / ! 6x2 / 10x1 / 150lb / progress: lp(5lb)");
    expect(blurbOf(result)).to.equal("T1: Squat / ...t1 / 5x3 / ! 6x2 / 10x1");
    expect(dayText(plannerOf(result), 1, 1)).to.equal(
      "t1 / used: none / 5x3 / 6x2 / 10x1 / 150lb / progress: lp(5lb)\nT1: Squat / ...t1 / 5x3 / ! 6x2 / 10x1"
    );
  });

  it("writes a changed global weight as a globals override", () => {
    const opened = open(reuseProgram, "T1: Squat");
    const result = apply(opened, "T1: Squat / 5x3 / 6x2 / 10x1 / 160lb / progress: lp(5lb)");
    expect(blurbOf(result)).to.equal("T1: Squat / ...t1 / 160lb");
  });

  it("writes a per-set weight change as a sets override when the target has per-set weights", () => {
    const opened = open(
      `# Week 1
## Day 1
t1 / used: none / 5x3 150lb, 6x2 155lb
T1: Squat / ...t1
`,
      "T1: Squat"
    );
    expect(opened.panel).to.equal("T1: Squat / 5x3 150lb, 6x2 155lb");
    const result = apply(opened, "T1: Squat / 5x3 150lb, 6x2 160lb");
    expect(blurbOf(result)).to.equal("T1: Squat / ...t1 / 5x3 150lb, 6x2 160lb");
  });

  it("writes a changed warmup on the week that declares it", () => {
    const opened = open(
      `# Week 1
## Day 1
t1 / used: none / 5x3 / 150lb
T1: Squat / ...t1

# Week 2
## Day 1
t1 / used: none / 5x3 / 150lb
T1: Squat / ...t1 / warmup: 2x5 45%
`,
      "T1: Squat"
    );
    expect(opened.panel).to.equal("T1: Squat / 5x3 / 150lb / warmup: 2x5 45%");
    const result = apply(opened, "T1: Squat / 5x3 / 150lb / warmup: 2x5 50%");
    expect(blurbOf(result)).to.equal("T1: Squat / ...t1");
    expect(dayText(plannerOf(result), 2, 1)).to.equal(
      "t1 / used: none / 5x3 / 150lb\nT1: Squat / ...t1 / warmup: 2x5 50%"
    );
  });

  it("writes a changed inherited progress as an override on this line", () => {
    const opened = open(reuseProgram, "T1: Squat");
    const result = apply(opened, "T1: Squat / 5x3 / 6x2 / 10x1 / 150lb / progress: lp(10lb)");
    expect(blurbOf(result)).to.equal("T1: Squat / ...t1 / progress: lp(10lb)");
  });

  it("leaves the line alone when the panel did not change", () => {
    const opened = open(reuseProgram, "T1: Squat");
    const result = apply(opened, opened.panel);
    expect(blurbOf(result)).to.equal("T1: Squat / ...t1");
  });

  it("drops back to the reused sets when the last variation is removed", () => {
    const opened = open(reuseProgram, "T1: Squat");
    const result = apply(opened, "T1: Squat / 150lb / progress: lp(5lb)");
    expect(blurbOf(result)).to.equal("T1: Squat / ...t1");
  });

  it("applies to the repeat siblings that resolve the same and splits the ones that do not", () => {
    const opened = open(
      `# Week 1
## Day 1
t1 / used: none / 5x3 / 150lb
T1: Squat[1-3] / ...t1

# Week 2
## Day 1
t1 / used: none / 5x3 / 150lb

# Week 3
## Day 1
t1 / used: none / 4x4 / 160lb
`,
      "T1: Squat",
      2
    );
    expect(opened.panel).to.equal("T1: Squat / 5x3 / 150lb");
    const result = apply(opened, "T1: Squat / 5x3 / 170lb");
    const planner = plannerOf(result);
    expect(dayText(planner, 1, 1)).to.equal("t1 / used: none / 5x3 / 150lb\nT1: Squat[1-2] / ...t1 / 170lb");
    expect(dayText(planner, 3, 1)).to.equal("t1 / used: none / 4x4 / 160lb\nT1: Squat / ...t1");
  });

  it("follows the tapped week to its own line when the writer splits the bracket", () => {
    const opened = open(
      `# Week 1
## Day 1
t1 / used: none / 5x3 / 150lb
T1: Squat[1-3] / ...t1

# Week 2
## Day 1
t1 / used: none / 5x3 / 150lb

# Week 3
## Day 1
t1 / used: none / 4x4 / 160lb
`,
      "T1: Squat",
      3
    );
    expect(opened.panel).to.equal("T1: Squat / 4x4 / 160lb");
    const result = apply(opened, "T1: Squat / 4x4 / 170lb");
    expect(blurbOf(result)).to.equal("T1: Squat / ...t1 / 170lb");
    expect("declarationDayData" in result && result.declarationDayData.week).to.equal(3);
    expect(dayText(plannerOf(result), 1, 1)).to.equal("t1 / used: none / 5x3 / 150lb\nT1: Squat[1-2] / ...t1");
    expect(dayText(plannerOf(result), 3, 1)).to.equal("t1 / used: none / 4x4 / 160lb\nT1: Squat / ...t1 / 170lb");
  });

  it("writes an edited script as an own progress that declares its whole state", () => {
    const opened = open(
      `# Week 1
## Day 1
t1 / used: none / 5x3 / 150lb / progress: custom(increase: 10lb) {~
  if (completedReps >= reps) {
    weights = completedWeights[ns] + state.increase
  }
~}
T1: Squat / ...t1
`,
      "T1: Squat"
    );
    expect(opened.panel).to.contain("weights = completedWeights[ns] + state.increase");
    const result = apply(opened, opened.panel.replace("completedWeights[ns]", "completedWeights[1]"));
    expect(blurbOf(result)).to.equal(`T1: Squat / ...t1 / progress: custom(increase: 10lb) {~
  if (completedReps >= reps) {
    weights = completedWeights[1] + state.increase
  }
~}`);
  });

  it("leaves another week's own progression alone when the panel did not change it", () => {
    const opened = open(
      `# Week 1
## Day 1
t1 / used: none / 5x3 / 150lb / progress: lp(5lb)
T1: Squat / ...t1

# Week 2
## Day 1
t1 / used: none / 5x3 / 150lb / progress: lp(5lb)
T1: Squat / ...t1 / progress: none
`,
      "T1: Squat"
    );
    expect(opened.panel).to.equal("T1: Squat / 5x3 / 150lb / progress: lp(5lb)");
    const result = apply(opened, "T1: Squat / 5x3 / 160lb / progress: lp(5lb)");
    expect(blurbOf(result)).to.equal("T1: Squat / ...t1 / 160lb");
    expect(dayText(plannerOf(result), 2, 1)).to.equal(
      "t1 / used: none / 5x3 / 150lb\nT1: Squat / ...t1 / progress: none"
    );
  });

  it("keeps an id declared on another week", () => {
    const opened = open(
      `# Week 1
## Day 1
t1 / used: none / 5x3 / 150lb
T1: Squat / ...t1

# Week 2
## Day 1
t1 / used: none / 5x3 / 150lb
T1: Squat / ...t1 / id: tags(7)
`,
      "T1: Squat"
    );
    expect(opened.panel).to.equal("T1: Squat / 5x3 / 150lb");
    const result = apply(opened, "T1: Squat / 5x3 / 160lb");
    expect(blurbOf(result)).to.equal("T1: Squat / ...t1 / 160lb");
    expect(dayText(plannerOf(result), 2, 1)).to.equal("t1 / used: none / 5x3 / 150lb\nT1: Squat / ...t1 / id: tags(7)");
  });

  it("clears used: none on every week, since one left standing hides the exercise again", () => {
    const opened = open(
      `# Week 1
## Day 1
Squat / used: none / 5x3 / 150lb

# Week 2
## Day 1
Squat / used: none / 5x3 / 150lb
`,
      "Squat"
    );
    expect(opened.panel).to.equal("Squat / used: none / 5x3 / 150lb");
    const result = apply(opened, "Squat / 5x3 / 150lb");
    expect(blurbOf(result)).to.equal("Squat / 5x3 / 150lb");
    expect(dayText(plannerOf(result), 2, 1)).to.equal("Squat / 5x3 / 150lb");
  });

  it("adds used: none on the tapped week only", () => {
    const opened = open(
      `# Week 1
## Day 1
Squat / 5x3 / 150lb

# Week 2
## Day 1
Squat / 5x3 / 150lb
`,
      "Squat"
    );
    const result = apply(opened, "Squat / used: none / 5x3 / 150lb");
    expect(blurbOf(result)).to.equal("Squat / used: none / 5x3 / 150lb");
    expect(dayText(plannerOf(result), 2, 1)).to.equal("Squat / 5x3 / 150lb");
  });

  it("reports a parse error without writing", () => {
    const opened = open(reuseProgram, "T1: Squat");
    const result = apply(opened, "T1: Squat / 5x3 / ?? / 150lb");
    expect("error" in result).to.equal(true);
  });

  it("refuses a changed name", () => {
    const opened = open(reuseProgram, "T1: Squat");
    const result = apply(opened, "T2: Squat / 5x3 / 6x2 / 10x1 / 150lb / progress: lp(5lb)");
    expect("error" in result && result.error).to.contain("keeps its name");
  });
});
