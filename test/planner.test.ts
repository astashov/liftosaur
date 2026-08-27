import "mocha";
import { expect } from "chai";
import {
  PlannerProgram_generateFullText,
  PlannerProgram_switchToUnit,
  PlannerProgram_evaluateText,
  PlannerProgram_evaluate,
  PlannerProgram_replaceExercise,
} from "../src/pages/planner/models/plannerProgram";
import {
  PlannerTestUtils_finish,
  PlannerTestUtils_changeExercise,
  PlannerTestUtils_changeWeight,
  PlannerTestUtils_get,
} from "./utils/plannerTestUtils";
import { Program_evaluate, Program_nextHistoryRecord, Program_runAllFinishDayScripts } from "../src/models/program";
import { ProgramToPlanner } from "../src/models/programToPlanner";
import { IPlannerProgram, ISettings, IStats, IUnit } from "../src/types";
import { Settings_build, Settings_defaultEquipment } from "../src/models/settings";
import { PlannerExerciseEvaluator, PlannerSyntaxError } from "../src/pages/planner/plannerExerciseEvaluator";
import { Weight_build } from "../src/models/weight";
import { ObjectUtils_clone } from "../src/utils/object";
import { Stats_getEmpty } from "../src/models/stats";
import {
  EditProgramUiHelpers_changeCurrentInstancePosition,
  EditProgramUiHelpers_changeFirstInstance,
  EditProgramUiHelpers_getChangedKeys,
} from "../src/components/editProgram/editProgramUi/editProgramUiHelpers";
import { PlannerProgramExercise_buildProgress } from "../src/pages/planner/models/plannerProgramExercise";

describe("Planner", () => {
  it("updates weight after completing", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x5 / 100lb / progress: lp(5lb)`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 2x5 / 105lb / progress: lp(5lb)


`);
  });

  it("keeps 'used: none' templates with repeat ranges in place on finish", () => {
    const programText = `# Week 1
## Day 1
base / used: none / 2x5 / progress: custom(increment: 5lb) {~
  weights += state.increment
~}
tpl[1-2] / used: none / 2x8 / progress: custom(increment: 2.5lb) { ...base }
Bench Press[1] / ...tpl / 100lb
Squat[2] / ...tpl / 200lb

# Week 2
## Day 1
Bench Press[1] / ...tpl / 110lb
Squat[2] / ...tpl / 210lb`;
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [
        [8, 8],
        [8, 8],
      ],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
base / used: none / 2x5 / progress: custom(increment: 5lb) {~
  weights += state.increment
~}
tpl[1-2] / used: none / 2x8 / progress: custom(increment: 2.5lb) { ...base }
Bench Press[1] / ...tpl / 102.5lb
Squat[2] / ...tpl / 202.5lb


# Week 2
## Day 1
Bench Press[1] / ...tpl / 112.5lb
Squat[2] / ...tpl / 212.5lb


`);
  });

  it("evaluates progress reuse chains regardless of exercise order", () => {
    const programText = `# Week 1
## Day 1
base / used: none / 2x5 / progress: custom(increment: 5lb) {~
  weights += state.increment
~}
Bench Press / ...tpl / 100lb
tpl[1-2] / used: none / 2x8 / progress: custom(increment: 2.5lb) { ...base }

# Week 2
## Day 1
Bench Press / ...tpl / 110lb`;
    const planner: IPlannerProgram = {
      vtype: "planner",
      name: "MyProgram",
      weeks: PlannerProgram_evaluateText(programText),
    };
    const evaluatedWeeks = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks;
    const errors = evaluatedWeeks.flat().flatMap((day) => (day.success ? [] : [day.error.message]));
    expect(errors).to.eql([]);
  });

  it("updates empty weight after completing", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 / progress: lp(5lb)`;
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [[5]],
      completedWeights: [[Weight_build(100, "lb")]],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x5 / 105lb / progress: lp(5lb)


`);
  });

  it("keeps reusing the progress if reused in previous instance", () => {
    const programText = `# Week 1
## Day 1
main / used: none / 1x5 / 100lb /  progress: custom(increment: 5lb) {~
  weights += 5lb
~}

Squat / ...main

## Day 2
Squat / 1x5 / 100lb`;
    const { program } = PlannerTestUtils_finish(
      programText,
      {
        completedReps: [[5]],
        completedWeights: [[Weight_build(100, "lb")]],
      },
      Settings_build(),
      Stats_getEmpty(),
      2
    );
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
main / used: none / 1x5 / 100lb / progress: custom(increment: 5lb) {~
  weights += 5lb
~}

Squat / ...main / 105lb

## Day 2
Squat / 1x5 / 105lb


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
    const settings = { ...Settings_build(), units: "kg" as IUnit };
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5]] }, settings);
    const kgProgram = PlannerProgram_switchToUnit(program.planner!, settings);
    const newText = PlannerProgram_generateFullText(kgProgram.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[8, 8]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 2x5 / 100lb / progress: lp(5lb, 2, 1)


`);
  });

  it("updates lp and weight after failing", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x5 / 100lb / progress: lp(5lb, 1, 0, 10lb, 2, 1)`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 3]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat[1-2] / 2x5


# Week 2
## Day 1



# Week 3
## Day 1
Squat / 2x5


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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [
        [5, 5],
        [5, 5],
      ],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [
        [5, 3],
        [5, 3],
      ],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x6 100lb, 1x4 200lb / 60s / progress: dp(5lb, 3, 8)
Bench Press / ...Squat / 1x5, 1x3 / 125lb / progress: lp(5lb)


`);
  });

  it("should work with negative weights", () => {
    const settings: ISettings = {
      ...Settings_build(),
      exerciseData: {
        benchPress_barbell: { equipment: { default: undefined } },
        squat_barbell: { equipment: { default: undefined } },
      },
    };
    const programText = `# Week 1
## Day 1
Squat / 2x5 / -40lb / progress: lp(5lb)
Bench Press / 2x3-5 -20lb / progress: lp(-5lb)
`;
    const { program } = PlannerTestUtils_finish(
      programText,
      {
        completedReps: [
          [5, 5],
          [5, 5],
        ],
      },
      settings
    );
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [
        [5, 5],
        [5, 5],
      ],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [
        [5, 3],
        [5, 3],
      ],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x5 105lb+, 1x3 105lb / 60s / progress: lp(5lb)
Bench Press / ...Squat


`);
  });

  it("parses ?+ as askWeight without explicit weight", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x8 @8 ?+`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[8, 8, 8]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 3x8 / ?+ @8


`);
  });

  it("handles ?+ with lp() progress", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x8 @8 ?+ / progress: lp(5lb)`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[8, 8, 8]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 3x8 / 102.5lb+ @8 / progress: lp(5lb)


`);
  });

  it("handles per-set ?+ mixed with non-askWeight sets", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x8 @8 ?+, 1x5 100lb`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[8, 5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x8 ?+ @8, 1x5 100lb


`);
  });

  it("replace exercise", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 100lb, 1x3 200lb / 60s / progress: lp(5lb)

## Day 2
Bench Press / 3x8 150lb / progress: dp(5lb, 8, 12)
`;
    const newText = PlannerTestUtils_changeExercise(programText, "Squat", {
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
    const newText = PlannerTestUtils_changeExercise(programText, "Squat", {
      id: "benchPress",
      equipment: "barbell",
    }).trim();
    expect(newText).to.contain(`Bench Press / 1x5 100lb, 1x3 200lb / 60s / progress: lp(5lb)

## Day 2
Bench Press / 3x8 / progress: dp(5lb, 8, 12)`);
    expect(newText.split("\n")[2]).to.match(/^[a-z]{3}: Bench Press/);
  });

  it("preserves repeating ranges when replacing an exercise", () => {
    const programText = `# Week 1
## Day 1
Deadlift[1-4] / 3x5 100lb / progress: lp(5lb)

# Week 2
## Day 1

# Week 3
## Day 1

# Week 4
## Day 1
`;
    const newText = PlannerTestUtils_changeExercise(programText, "Deadlift", {
      id: "benchPress",
      equipment: "barbell",
    }).trim();
    expect(newText).to.equal(`# Week 1
## Day 1
Bench Press[1-4] / 3x5 / 100lb / progress: lp(5lb)


# Week 2
## Day 1



# Week 3
## Day 1



# Week 4
## Day 1`);
  });

  it("properly update weights", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x5 100lb, 1x3 200lb / 60s / progress: lp(5lb)
`;
    const newText = PlannerTestUtils_changeWeight(programText, (weightChanges) => {
      weightChanges[1].weight = Weight_build(250, "lb");
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
    const newText = PlannerTestUtils_changeWeight(programText, (weightChanges) => {
      weightChanges[0].weight = Weight_build(100, "lb");
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
    const newText = PlannerTestUtils_changeWeight(programText, (weightChanges) => {
      weightChanges[0].weight = Weight_build(100, "lb");
      weightChanges[1].weight = Weight_build(150, "lb");
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [[8, 6, 8]],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[10, 10, 10]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / used: none / 1x1 / 100% 100s / warmup: none
Bench Press / ...Squat / 3x11 / 30lb / progress: dp(3lb, 8, 12)


`);
  });

  it("dp with range - narrows minReps on failure", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x8-12 / 100lb / progress: dp(5lb, 8, 12)`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[9, 10, 8]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x10-12, 1x11-12, 1x9-12 / 100lb / progress: dp(5lb, 8, 12)


`);
  });

  it("dp with range - increases weight on success", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x8-12 / 100lb / progress: dp(5lb, 8, 12)`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[12, 12, 12]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 3x8-12 / 105lb / progress: dp(5lb, 8, 12)


`);
  });

  it("dp without range - increases reps then weight", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x8 / 100lb / progress: dp(5lb, 8, 12)`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[8, 8, 8]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 3x9 / 100lb / progress: dp(5lb, 8, 12)


`);
  });

  it("dp without range - resets reps and increases weight at maxReps", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x12 / 100lb / progress: dp(5lb, 8, 12)`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[12, 12, 12]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 3x8 / 105lb / progress: dp(5lb, 8, 12)


`);
  });

  it("dp without range - skips reps when over-performing", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x8 / 100lb / progress: dp(5lb, 8, 12)`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[11, 10, 9]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x12, 1x11, 1x10 / 100lb / progress: dp(5lb, 8, 12)


`);
  });

  it("dp without range - increases weight when over-performing past maxReps", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x8 / 100lb / progress: dp(5lb, 8, 12)`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[15, 13, 12]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 3x8 / 105lb / progress: dp(5lb, 8, 12)


`);
  });

  it("keeps customized warmups", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x4-6 / 80% @8+ 180s / warmup: 2x10 50%, 1x4 70%`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[6, 6, 6]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[10, 10, 10]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[2]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[2]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[2]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [
        [5, 5],
        [5, 5],
      ],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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

  // Authors park a bulky template on the last week so the first week a user opens isn't a wall of
  // script. Every week the `[1-3]` spans holds a materialized copy of it, and printing the block on
  // the first copy - then compacting only forward - moved the template to week 1 and split the range.
  it("keeps a template written on the last week there", () => {
    const programText = `# Week 1
## Day 1
Squat[1,1-3] / ...tmp / 100lb / progress: custom(foo: 0) { ...tmp }

# Week 2
## Day 1

# Week 3
## Day 1
/// The program logic lives here
tmp[1-3] / used: none / 2x5 / 100lb / warmup: none / update: custom() {~
  numberOfSets = state.foo
~} / progress: custom(foo: 0) {~
  weights += 5lb
~}
`;
    const { program } = PlannerTestUtils_get(programText);
    const evaluated = Program_evaluate(program, Settings_build());
    const newText = PlannerProgram_generateFullText(
      new ProgramToPlanner(evaluated, Settings_build()).convertToPlanner().weeks
    );
    expect(newText).to.equal(`# Week 1
## Day 1
Squat[1,1-3] / ...tmp


# Week 2
## Day 1



# Week 3
## Day 1
/// The program logic lives here
tmp[1-3] / used: none / 2x5 / 100lb / warmup: none / update: custom() {~
  numberOfSets = state.foo
~} / progress: custom(foo: 0) {~
  weights += 5lb
~}


`);
  });

  it("stops a template's backwards range at the week that differs", () => {
    const programText = `# Week 1
## Day 1
tmp / used: none / 3x5 / 100lb
Squat[1,1-3] / ...tmp / 100lb / progress: custom(foo: 0) { ...tmp }

# Week 2
## Day 1

# Week 3
## Day 1
tmp[2-3] / used: none / 2x5 / 100lb / progress: custom(foo: 0) {~
  weights += 5lb
~}
`;
    const { program } = PlannerTestUtils_get(programText);
    const evaluated = Program_evaluate(program, Settings_build());
    const newText = PlannerProgram_generateFullText(
      new ProgramToPlanner(evaluated, Settings_build()).convertToPlanner().weeks
    );
    expect(newText).to.equal(`# Week 1
## Day 1
tmp / used: none / 3x5 / 100lb
Squat[1,1-3] / ...tmp


# Week 2
## Day 1



# Week 3
## Day 1
tmp[2-3] / used: none / 2x5 / 100lb / progress: custom(foo: 0) {~
  weights += 5lb
~}


`);
  });

  // Each declaration owns its own range, so tracking only one declaring week per key/day let the
  // later one hide the earlier - the earlier declaration was then compacted away by a materialized
  // copy from a week before it, taking the progress block that only existed on that line.
  it("keeps both declarations when a template is declared twice on the same day", () => {
    const programText = `# Week 1
## Day 1
Squat[1,1-5] / ...tmp / 100lb

# Week 2
## Day 1

# Week 3
## Day 1
tmp[1-3] / used: none / 2x5 / 100lb / progress: custom(foo: 0) {~
  weights += 5lb
~}

# Week 4
## Day 1
tmp[4-5] / used: none / 3x5 / 100lb

# Week 5
## Day 1
`;
    const { program } = PlannerTestUtils_get(programText);
    const evaluated = Program_evaluate(program, Settings_build());
    const newText = PlannerProgram_generateFullText(
      new ProgramToPlanner(evaluated, Settings_build()).convertToPlanner().weeks
    );
    expect(newText).to.equal(`# Week 1
## Day 1
Squat[1,1-5] / ...tmp


# Week 2
## Day 1



# Week 3
## Day 1
tmp[1-3] / used: none / 2x5 / 100lb / progress: custom(foo: 0) {~
  weights += 5lb
~}


# Week 4
## Day 1
tmp[4-5] / used: none / 3x5 / 100lb


# Week 5
## Day 1



`);
  });

  // The declaring-week table is keyed by the old program's keys, so without going back through
  // renameMapping a renamed template stopped being recognized as the week that declares it, and
  // its progress block was compacted away.
  it("keeps a backwards-declared template's progress when the template itself is renamed", () => {
    const planner: IPlannerProgram = {
      vtype: "planner",
      name: "MyProgram",
      weeks: PlannerProgram_evaluateText(`# Week 1
## Day 1
Squat[1,1-3] / ...tmp / 100lb

# Week 2
## Day 1

# Week 3
## Day 1
tmp[1-3] / used: none / 2x5 / 100lb / progress: custom(foo: 0) {~
  weights += 5lb
~}
`),
    };
    const result = PlannerProgram_replaceExercise(planner, "tmp", undefined, "tmpRenamed", Settings_build());
    expect(PlannerProgram_generateFullText(result.weeks)).to.equal(`# Week 1
## Day 1
Squat[1,1-3] / ...tmpRenamed / progress: custom() { ...tmpRenamed }


# Week 2
## Day 1



# Week 3
## Day 1
tmpRenamed[1-3] / used: none / 2x5 / 100lb / progress: custom(foo: 0) {~
  weights += 5lb
~}


`);
  });

  // `id:` is shared across every instance of a key, and it used to be printed on the first one -
  // which for a backwards-declared exercise is a materialized copy in an earlier week, exactly the
  // line compaction deletes. Tags address exercises across days, so losing them is silent breakage.
  it("keeps id: tags on a backwards-declared exercise", () => {
    const programText = `# Week 1
## Day 1

# Week 2
## Day 1

# Week 3
## Day 1
Squat[1-3] / 2x5 / 100lb / id: tags(5)
`;
    const { program } = PlannerTestUtils_get(programText);
    const evaluated = Program_evaluate(program, Settings_build());
    const newText = PlannerProgram_generateFullText(
      new ProgramToPlanner(evaluated, Settings_build()).convertToPlanner().weeks
    );
    expect(newText).to.equal(`# Week 1
## Day 1



# Week 2
## Day 1



# Week 3
## Day 1
Squat[1-3] / 2x5 / 100lb / id: tags(5)


`);
  });

  // Pins PlannerEvaluator_compareExerciseOrder directly: in week 2 the template, the materialized
  // repeat and the local exercise all share exerciseIndex 0, and the whole round trip depends on
  // them landing in that order in both weeks. Regressing the tie-break shows up here rather than
  // as a much less obvious compaction failure somewhere else.
  it("orders a template, a repeat copy and a local exercise the same way in every week", () => {
    const programText = `# Week 1
## Day 1
tmpl[1-2] / used: none / 2x5 / 100lb
Squat[1-2] / ...tmpl

# Week 2
## Day 1
Bench Press / 3x5 / 50lb
`;
    const { program } = PlannerTestUtils_get(programText);
    const evaluated = Program_evaluate(program, Settings_build());
    const newText = PlannerProgram_generateFullText(
      new ProgramToPlanner(evaluated, Settings_build()).convertToPlanner().weeks
    );
    expect(newText).to.equal(`# Week 1
## Day 1
tmpl[1-2] / used: none / 2x5 / 100lb
Squat[1-2] / ...tmpl


# Week 2
## Day 1
Bench Press / 3x5 / 50lb


`);
  });

  // Replacing an exercise with a name that isn't a known one turns it into a `used: none` template,
  // which moves it ahead of the repeat copy it shares an exerciseIndex with. Pairing the day's
  // exercises by array index then reported a rename for both of them, and edit state followed the
  // wrong key.
  it("reports only the actually renamed key when an exercise becomes a template", () => {
    const settings = Settings_build();
    const planner: IPlannerProgram = {
      vtype: "planner",
      name: "MyProgram",
      weeks: PlannerProgram_evaluateText(`# Week 1
## Day 1
Squat[1-2] / 2x5 / 100lb

# Week 2
## Day 1
Bench Press / 3x5 / 50lb
`),
    };
    const newPlanner = PlannerProgram_replaceExercise(
      planner,
      "benchpress_barbell",
      undefined,
      "Mystery Move",
      settings
    );
    expect(EditProgramUiHelpers_getChangedKeys(planner, newPlanner, settings)).to.eql({
      benchpress_barbell: "mystery move",
    });
  });

  // The script getters walk a fixed couple of hops, and the progression/update runners read those
  // same getters — so a chain past them resolves to no script at all and silently never runs.
  // 'used: none' templates were exempt from the "cannot reuse another progress" check with nothing
  // bounding the exemption, which is how such a chain could be written and saved.
  describe("reuse chains deeper than the app resolves", () => {
    function errorsFor(programText: string): string[] {
      const planner: IPlannerProgram = {
        vtype: "planner",
        name: "MyProgram",
        weeks: PlannerProgram_evaluateText(programText),
      };
      const evaluatedWeeks = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks;
      return evaluatedWeeks.flat().flatMap((day) => (day.success ? [] : [day.error.message]));
    }

    it("allows a progress reused through one template that reuses another", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
t1 / used: none / 1x5 100lb / progress: custom() {~ weights += 10lb ~}
t2 / used: none / 1x5 100lb / progress: custom() { ...t1 }
Squat / 1x5 100lb / progress: custom() { ...t2 }
`)
      ).to.eql([]);
    });

    it("rejects a third progress hop", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
t1 / used: none / 1x5 100lb / progress: custom() {~ weights += 10lb ~}
t2 / used: none / 1x5 100lb / progress: custom() { ...t1 }
t3 / used: none / 1x5 100lb / progress: custom() { ...t2 }
Squat / 1x5 100lb / progress: custom() { ...t3 }
`)
      ).to.eql([
        "Squat: Couldn't find the progress script this reuses - reuse the exercise that defines it instead (4:20)",
      ]);
    });

    it("allows sets reuse of a template whose progress reuses another exercise", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
t1 / used: none / 1x5 100lb / progress: custom() {~ weights += 10lb ~}
t2 / used: none / 1x5 100lb / progress: custom() { ...t1 }
Squat / ...t2
`)
      ).to.eql([]);
    });

    it("rejects sets reuse of a template whose progress reuses a progress that reuses again", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
t1 / used: none / 1x5 100lb / progress: custom() {~ weights += 10lb ~}
t2 / used: none / 1x5 100lb / progress: custom() { ...t1 }
t3 / used: none / 1x5 100lb / progress: custom() { ...t2 }
Squat / ...t3
`)
      ).to.eql([
        "Squat: Couldn't find the progress script this reuses - reuse the exercise that defines it instead (4:0)",
      ]);
    });

    it("rejects the same shape for update", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
t1 / used: none / 1x5 100lb / update: custom() {~ weights = 5lb ~}
t2 / used: none / 1x5 100lb / update: custom() { ...t1 }
t3 / used: none / 1x5 100lb / update: custom() { ...t2 }
Squat / ...t3
`)
      ).to.eql([
        "Squat: Couldn't find the update script this reuses - reuse the exercise that defines it instead (4:0)",
      ]);
    });
  });

  // A reuse resolving back to the exercise that declares it used to wire a self-loop that
  // PlannerProgramExercise_getState walked forever - reading such a program (e.g. GET
  // /user/programs) died with "Maximum call stack size exceeded" instead of showing an error.
  describe("reuses that loop back", () => {
    function errorsFor(programText: string): string[] {
      const planner: IPlannerProgram = {
        vtype: "planner",
        name: "MyProgram",
        weeks: PlannerProgram_evaluateText(programText),
      };
      const evaluatedWeeks = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks;
      return evaluatedWeeks.flat().flatMap((day) => (day.success ? [] : [day.error.message]));
    }

    it("rejects an exercise reusing its own sets", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
Squat / ...Squat / 3x8 100lb
`)
      ).to.eql(["Squat: Exercise cannot reuse itself (1:8)"]);
    });

    it("rejects an exercise reusing its own progress", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
Squat / 3x8 100lb / progress: custom() { ...Squat }
`)
      ).to.eql(["Squat: Exercise cannot reuse its own progress (1:20)"]);
    });

    it("rejects an exercise reusing its own update", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
Squat / 3x8 100lb / update: custom() { ...Squat }
`)
      ).to.eql(["Squat: Exercise cannot reuse its own update (1:20)"]);
    });

    it("rejects an exercise reusing its own description", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
// ...Squat
Squat / 3x8 100lb
`)
      ).to.eql(["Squat: Exercise cannot reuse its own description (2:0)"]);
    });

    // A description reuse copies what the target holds when it is wired, rather than following a
    // pointer, so a target that is itself borrowing hands over the raw `...name` directive — which
    // the reader then sees as the description. Loops are the case where that always happens.
    it("rejects two exercises reusing each other's description", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
// ...t2
t1 / used: none / 1x5 100lb

// ...t1
t2 / used: none / 1x5 100lb
`)
      ).to.eql(["t1: Original exercise cannot reuse another description - reuse the one that writes it instead (2:0)"]);
    });

    it("rejects a three-exercise description loop", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
// ...t2
t1 / used: none / 1x5 100lb

// ...t3
t2 / used: none / 1x5 100lb

// ...t1
t3 / used: none / 1x5 100lb
`)
      ).to.eql(["t1: Original exercise cannot reuse another description - reuse the one that writes it instead (2:0)"]);
    });

    // Both ends report: a bare `...name` resolves against the first day of the week that has the
    // exercise, so each of the two finds the other whichever day it sits on.
    it("rejects a description loop that closes across days", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
// ...t2
t1 / used: none / 1x5 100lb
## Day 2
// ...t1
t2 / used: none / 1x5 100lb
`)
      ).to.eql([
        "t1: Original exercise cannot reuse another description - reuse the one that writes it instead (2:0)",
        "t2: Original exercise cannot reuse another description - reuse the one that writes it instead (2:0)",
      ]);
    });

    // Not a loop, but the same copied-directive problem: which text t3 ends up with depended on
    // the order the days were evaluated in.
    it("rejects reusing a description that is itself reused", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
// real description
t1 / used: none / 1x5 100lb

// ...t1
t2 / used: none / 1x5 100lb

// ...t2
t3 / used: none / 1x5 100lb
`)
      ).to.eql(["t3: Original exercise cannot reuse another description - reuse the one that writes it instead (8:0)"]);
    });

    it("keeps reusing a description that the target writes itself", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
// real description
t1 / used: none / 1x5 100lb

// ...t1
t2 / used: none / 1x5 100lb
`)
      ).to.eql([]);
    });

    // The 'used: none' exemption let a template's progress reuse itself, and the exercises reusing
    // that template inherited the loop.
    it("rejects a 'used: none' template reusing its own progress", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
tpl / used: none / 1x5 100lb / progress: custom(foo: 5lb) { ...tpl }
Squat / ...tpl
`)
      ).to.eql(["tpl: Exercise cannot reuse its own progress (1:31)"]);
    });

    it("rejects two templates reusing each other's progress", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
t1 / used: none / 1x5 100lb / progress: custom(foo: 5lb) { ...t2 }
t2 / used: none / 1x5 100lb / progress: custom(foo: 5lb) { ...t1 }
Squat / ...t1
`)
      ).to.eql(["t1: This exercise ends up reusing itself through other exercises (1:30)"]);
    });

    it("allows reusing the same exercise from an earlier week", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
Squat / 3x8 100lb

# Week 2
## Day 1
Squat / ...Squat[1:1]
`)
      ).to.eql([]);
    });

    it("allows reusing a template that only shares its name", () => {
      expect(
        errorsFor(`# Week 1
## Day 1
tmp: Squat / used: none / 1x5 100lb / progress: custom() {~ weights += 5lb ~}
Squat / ...tmp: Squat
`)
      ).to.eql([]);
    });
  });

  it("doesn't show an error if original exercise progress reuses another exercise but overrides progress", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x1 100lb / progress: custom(increment: 10lb) { ...Bench Press }
Bench Press / ...Squat / progress: custom() {~ ~}
`;
    const planner: IPlannerProgram = {
      vtype: "planner",
      name: "MyProgram",
      weeks: PlannerProgram_evaluateText(programText),
    };
    const evaluatedWeeks = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks;
    expect(evaluatedWeeks[0][0].success).to.be.true;
  });

  it("doesn't show an error if original exercise update reuses another exercise but overrides update", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x1 100lb / update: custom() { ...Bench Press }
Bench Press / ...Squat / update: custom() {~ ~}
`;
    const planner: IPlannerProgram = {
      vtype: "planner",
      name: "MyProgram",
      weeks: PlannerProgram_evaluateText(programText),
    };
    const evaluatedWeeks = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks;
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
    const planner: IPlannerProgram = {
      vtype: "planner",
      name: "MyProgram",
      weeks: PlannerProgram_evaluateText(programText),
    };
    const evaluatedWeeks = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks;
    expect(evaluatedWeeks[2][0]).to.deep.equal({
      success: false,
      error: new PlannerSyntaxError("Squat: No such exercise tmp: Squat at week: 3 (4:13)", 0, 0, 0, 0, {
        type: "reuseTargetNotFound",
        data: { fullName: "tmp: Squat", week: 3 },
      }),
    });
  });

  it("shows a positioned syntax error when passing an array to a scalar function in a progress script", () => {
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
    expect(result).to.deep.equal({
      success: false,
      error: new PlannerSyntaxError(
        "Function 'increment' doesn't accept arrays, and 'weights' is an array. Use an index to pick one value, like 'weights[1]' (3:24)",
        0,
        0,
        0,
        0,
        { type: "fnArrayArgument", data: { fn: "increment", argText: "weights" } }
      ),
    });
  });

  it("shows a positioned syntax error on wrong number of function arguments in a progress script", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x8+ / 100lb / progress: custom(foo: 0) {~
  state.foo = rpeMultiplier()
~}`;
    const planner: IPlannerProgram = {
      vtype: "planner",
      name: "MyProgram",
      weeks: PlannerProgram_evaluateText(programText),
    };
    const result = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks[0][0];
    expect(result).to.deep.equal({
      success: false,
      error: new PlannerSyntaxError("Function 'rpeMultiplier' expects 1-2 arguments, but got 0 (2:14)", 0, 0, 0, 0, {
        type: "fnArity",
        data: { fn: "rpeMultiplier", expected: "1-2", got: 0 },
      }),
    });
  });

  it("shows a positioned syntax error on a statically known wrong argument type in a progress script", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x8+ / 100lb / progress: custom(foo: 0) {~
  state.foo = calculateTrainingMax(100lb, 5lb)
~}`;
    const planner: IPlannerProgram = {
      vtype: "planner",
      name: "MyProgram",
      weeks: PlannerProgram_evaluateText(programText),
    };
    const result = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks[0][0];
    expect(result).to.deep.equal({
      success: false,
      error: new PlannerSyntaxError(
        "Argument 2 (reps) of 'calculateTrainingMax' should be a number of reps, but '5lb' is a weight (2:42)",
        0,
        0,
        0,
        0,
        {
          type: "fnArgumentType",
          data: {
            fn: "calculateTrainingMax",
            index: 1,
            argName: "reps",
            hint: "a number of reps",
            got: "weight",
          },
        }
      ),
    });
  });

  it("shows a positioned syntax error on wrong number of 'sets' arguments in an update script", () => {
    const programText = `# Week 1
## Day 1
Squat / 2x8+ / 100lb / update: custom() {~
  sets(1, 3, 5, 5, 0, 100lb, 60, 0)
~}`;
    const planner: IPlannerProgram = {
      vtype: "planner",
      name: "MyProgram",
      weeks: PlannerProgram_evaluateText(programText),
    };
    const result = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks[0][0];
    expect(result).to.deep.equal({
      success: false,
      error: new PlannerSyntaxError("Function 'sets' expects 9 arguments, but got 8 (2:2)", 0, 0, 0, 0, {
        type: "fnArity",
        data: { fn: "sets", expected: "9", got: 8 },
      }),
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [
        [5, 5],
        [5, 5],
      ],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
tmp: Squat[1-5] / used: none / 2x5
Squat[3,1-5] / ...tmp: Squat
Bench Press[2] / ...tmp: Squat


# Week 2
## Day 1
Bicep Curl[2-5] / 5x5
Bench Press[2,2-5] / ...tmp: Squat


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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [[2], [1]],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [
        [2, 2],
        [2, 2],
      ],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [[1], [1]],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [[2], [2]],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [[1], [2]],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [[1], [2]],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(
      programText,
      {
        completedReps: [[3], [2]],
      },
      Settings_build(),
      Stats_getEmpty(),
      2
    );
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [[1], [1]],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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

  it("allows reusing progress of exercise that reuses original exercise sets, but has custom progress", () => {
    const programText = `# Week 1
## Day 1

Squat / 1x8 100lb / progress: custom(foo: 10lb) { ...Bench Press }
Bench Press / ...Squat / warmup: none / progress: custom(foo: 5lb, blah: 10lb) {~
  weights += state.foo + state.blah
~}
`;
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [[8]],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x8 / 120lb / progress: custom(foo: 10lb) { ...Bench Press }
Bench Press / ...Squat / 100lb / warmup: none / progress: custom(foo: 5lb, blah: 10lb) {~
  weights += state.foo + state.blah
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
    const { program } = PlannerTestUtils_finish(programText, {
      completedReps: [[1], [1]],
    });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(
      programText,
      { completedReps: [[5]] },
      Settings_build(),
      Stats_getEmpty(),
      4
    );
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
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

  it("increment() weight", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x10 / 100lb / progress: custom() {~
  weights[1] = increment(weights[1])
~}`;
    const equipment = ObjectUtils_clone(Settings_defaultEquipment());
    equipment.barbell!.plates = [
      { weight: Weight_build(10, "lb"), num: 2 },
      { weight: Weight_build(25, "lb"), num: 2 },
      { weight: Weight_build(45, "lb"), num: 2 },
    ];
    const settings: ISettings = {
      ...Settings_build(),
      gyms: [{ vtype: "gym", id: "default", name: "Main", equipment }],
      exerciseData: {
        squat_barbell: { equipment: { default: "barbell" } },
      },
    };
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[10]] }, settings);
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x10 / 115lb / progress: custom() {~
  weights[1] = increment(weights[1])
~}


`);
  });

  it("increment() number", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x10 / 100lb / progress: custom() {~
  weights[1] = increment(105)
~}`;
    const equipment = ObjectUtils_clone(Settings_defaultEquipment());
    equipment.barbell!.isFixed = true;
    equipment.barbell!.fixed = [Weight_build(45, "lb"), Weight_build(100, "lb"), Weight_build(120, "lb")];
    const settings: ISettings = {
      ...Settings_build(),
      gyms: [{ vtype: "gym", id: "default", name: "Main", equipment }],
      exerciseData: {
        squat_barbell: { equipment: { default: "barbell" } },
      },
    };
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[10]] }, settings);
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x10 / 120lb / progress: custom() {~
  weights[1] = increment(105)
~}


`);
  });

  it("decrement() percentage", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x10 / 100lb / progress: custom() {~
  weights[1] = decrement(50%)
~}`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[10]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x10 / 49% / progress: custom() {~
  weights[1] = decrement(50%)
~}


`);
  });

  it("properly uses bodyweight", () => {
    const programText = `# Week 1
## Day 1
Squat / 1x10 / 100lb / progress: custom() {~
  weights = bodyweight
~}`;
    const stats: IStats = {
      weight: {
        weight: [
          { vtype: "stat", value: Weight_build(200, "lb"), timestamp: 10 },
          { vtype: "stat", value: Weight_build(220, "lb"), timestamp: 30 },
          { vtype: "stat", value: Weight_build(210, "lb"), timestamp: 20 },
          { vtype: "stat", value: Weight_build(240, "lb"), timestamp: 50 },
          { vtype: "stat", value: Weight_build(230, "lb"), timestamp: 40 },
        ],
      },
      length: {},
      percentage: {},
    };
    const settings: ISettings = {
      ...Settings_build(),
      graphOptions: {
        weight: {
          movingAverageWindowSize: 3,
        },
      },
    };
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[10]] }, settings, stats);
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x10 / 230lb / progress: custom() {~
  weights = bodyweight
~}


`);
  });

  it("template reuses progress of another template", () => {
    const programText = `# Week 1
## Day 1
t1 / used: none / 3x5 100lb / progress: custom() {~
  weights += 5lb
~}
t2 / used: none / 2x5 120lb / progress: custom() { ...t1 }
Squat / ...t2

`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
t1 / used: none / 3x5 / 100lb / progress: custom() {~
  weights += 5lb
~}
t2 / used: none / 2x5 / 120lb / progress: custom() { ...t1 }
Squat / ...t2 / 125lb


`);
  });

  it("updates isAMRAP, logRPE and askWeight", () => {
    const programText = `# Week 1
## Day 1
Squat / 3x5 / @8 100lb / progress: custom() {~
  amraps[1] = 1
  amraps[2] = 0
  logrpes[2] = 1
  askweights[3] = 1
~}`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[5, 5, 5]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
Squat / 1x5+ 100lb @8, 1x5 100lb @8+, 1x5 100lb+ @8 / progress: custom() {~
  amraps[1] = 1
  amraps[2] = 0
  logrpes[2] = 1
  askweights[3] = 1
~}


`);
  });

  describe("description reuse", () => {
    it("keeps description [1:1] reuse syntax if different day or week", () => {
      const programText = `# Week 1
## Day 1
// Description
Squat / 1x1

# Week 2
## Day 1
// ...Squat[1:1]
Bench Press / 1x1`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[1]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.equal(`# Week 1
## Day 1
// Description
Squat / 1x1


# Week 2
## Day 1
// ...Squat[1:1]
Bench Press / 1x1


`);
    });
  });

  it("omits [1:1] description reuse syntax if on the same week", () => {
    const programText = `# Week 1
## Day 1
// Description
Squat / 1x1

## Day 2
// ...Squat
Bench Press / 1x1`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[1]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
// Description
Squat / 1x1

## Day 2
// ...Squat
Bench Press / 1x1


`);
  });

  it("adds [1:1] description reuse syntax if there's 2 same exercises", () => {
    const programText = `# Week 1
## Day 1
// Description
Squat / 1x1

## Day 2
// Description 2
Squat / 1x1

## Day 3
// ...Squat[1:2]
Bench Press / 1x1`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[1]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
// Description
Squat / 1x1

## Day 2
// Description 2
Squat / 1x1

## Day 3
// ...Squat[1:2]
Bench Press / 1x1


`);
  });

  it("omits [1:1] description reuse syntax if exercise description is repeated on the same week", () => {
    const programText = `# Week 1
## Day 1

// Description
Squat / 1x1

# Week 2
## Day 1

Squat / 1x1
// ...Squat
Bench Press / 1x1`;
    const { program } = PlannerTestUtils_finish(programText, { completedReps: [[1]] });
    const newText = PlannerProgram_generateFullText(program.planner!.weeks);
    expect(newText).to.equal(`# Week 1
## Day 1
// Description
Squat / 1x1


# Week 2
## Day 1
// Description
Squat / 1x1
// ...Squat
Bench Press / 1x1


`);
  });

  describe("Set timers", () => {
    it("parses setTimer|restTimer, overflow + and auto into evaluated sets", () => {
      const programText = `# Week 1
## Day 1
Plank / 3x1 60s|30s auto
Squat / 8x1+ 20s|10s auto
Bench Press / 1x100 0s+|?
Push Up / 3x10 30s`;
      const planner: IPlannerProgram = { vtype: "planner", name: "P", weeks: PlannerProgram_evaluateText(programText) };
      const day = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks[0][0];
      expect(day.success).to.equal(true);
      if (!day.success) {
        return;
      }
      const [plank, squat, bench, pushup] = day.data.map((ex) => ex.evaluatedSetVariations[0].sets[0]);
      expect({ setTimer: plank.setTimer, timer: plank.timer, auto: plank.auto, ovf: plank.isOverflowSetTimer }).to.eql({
        setTimer: 60,
        timer: 30,
        auto: true,
        ovf: undefined,
      });
      expect({ setTimer: squat.setTimer, timer: squat.timer, auto: squat.auto }).to.eql({
        setTimer: 20,
        timer: 10,
        auto: true,
      });
      // 0s+|? — count-up stopwatch, "?" rest falls back to the default (undefined) rest timer
      expect({ setTimer: bench.setTimer, ovf: bench.isOverflowSetTimer, timer: bench.timer }).to.eql({
        setTimer: 0,
        ovf: true,
        timer: undefined,
      });
      // Bare "30s" stays a rest-only timer (backwards compatible), no set timer
      expect({ setTimer: pushup.setTimer, timer: pushup.timer }).to.eql({ setTimer: undefined, timer: 30 });
    });

    it("round-trips set timer syntax through serialization", () => {
      const programText = `# Week 1
## Day 1
Squat / 5x5 135lb 60s|0s auto / progress: lp(5lb)
Plank / 3x1 20s+|?
Bench Press / 1x100 0s+|? auto`;
      const { program } = PlannerTestUtils_finish(programText, {
        completedReps: [[5, 5, 5, 5, 5], [1, 1, 1], [100]],
      });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.equal(`# Week 1
## Day 1
Squat / 5x5 60s|0s auto / 140lb / progress: lp(5lb)
Plank / 3x1 20s+|?
Bench Press / 1x100 0s+|? auto


`);
    });

    describe("global and reuse override combinations", () => {
      const cases: {
        name: string;
        text: string;
        expected: { st?: number; rest?: number; ovf?: boolean; auto?: boolean }[];
      }[] = [
        {
          name: "? rest falls back to the exercise's global rest section",
          text: "Squat / 3x8 60s|? / 30s",
          expected: [{ st: 60, rest: 30 }],
        },
        {
          name: "? rest with no global stays unset (app default at runtime)",
          text: "Squat / 3x8 60s|?",
          expected: [{ st: 60 }],
        },
        {
          name: "global set-timer section applies to every set and group",
          text: "Squat / 3x8, 2x5 / 60s|30s",
          expected: [{ st: 60, rest: 30, ovf: false }],
        },
        {
          name: "global + section makes all sets overflow",
          text: "Squat / 3x8 / 60s+|30s",
          expected: [{ st: 60, rest: 30, ovf: true }],
        },
        {
          name: "reuse carries set timer, rest and auto",
          text: "Squat / 3x8 60s|30s auto\nBench Press / ...Squat",
          expected: [
            { st: 60, rest: 30, auto: true },
            { st: 60, rest: 30, auto: true },
          ],
        },
        {
          name: "reuse with rest-only override keeps the reused set timer",
          text: "Squat / 3x8 60s|10s\nBench Press / ...Squat / 45s",
          expected: [
            { st: 60, rest: 10 },
            { st: 60, rest: 45 },
          ],
        },
        {
          name: "reuse with set-timer override resets the + modifier",
          text: "Squat / 3x8 60s+|10s auto\nBench Press / ...Squat / 30s|45s",
          expected: [
            { st: 60, rest: 10, ovf: true, auto: true },
            { st: 30, rest: 45, ovf: false, auto: true },
          ],
        },
        {
          name: "reuse with set-timer override keeps + when restated",
          text: "Squat / 3x8 60s+|10s auto\nBench Press / ...Squat / 30s+|45s",
          expected: [
            { st: 60, rest: 10, ovf: true, auto: true },
            { st: 30, rest: 45, ovf: true, auto: true },
          ],
        },
        {
          name: "reuse of a global-set-timer source carries the +",
          text: "Squat / 3x8 / 60s+|30s\nBench Press / ...Squat",
          expected: [
            { st: 60, rest: 30, ovf: true },
            { st: 60, rest: 30, ovf: true },
          ],
        },
        {
          name: "reuse override of set timer with ? rest inherits the reused rest",
          text: "Squat / 3x8 60s|10s\nBench Press / ...Squat / 30s|?",
          expected: [
            { st: 60, rest: 10 },
            { st: 30, rest: 10, ovf: false },
          ],
        },
      ];
      for (const c of cases) {
        it(c.name, () => {
          const planner: IPlannerProgram = {
            vtype: "planner",
            name: "P",
            weeks: PlannerProgram_evaluateText(`# Week 1\n## Day 1\n${c.text}\n`),
          };
          const day = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks[0][0];
          expect(day.success).to.equal(true);
          if (!day.success) {
            return;
          }
          expect(day.data.length).to.equal(c.expected.length);
          day.data.forEach((ex, exIndex) => {
            const exp = { st: undefined, rest: undefined, ovf: undefined, auto: undefined, ...c.expected[exIndex] };
            // Every set within the exercise should resolve to the same expected timer tuple
            for (const s of ex.evaluatedSetVariations[0].sets) {
              expect({ st: s.setTimer, rest: s.timer, ovf: s.isOverflowSetTimer, auto: s.auto }).to.eql(exp);
            }
          });
        });
      }

      it("round-trips a reuse with a set timer override", () => {
        const text = `# Week 1
## Day 1
Squat / 3x8 60s+|10s auto
Bench Press / ...Squat / 30s|45s`;
        const { program } = PlannerTestUtils_get(text);
        const evaluated = Program_evaluate(program, Settings_build());
        const result = new ProgramToPlanner(evaluated, Settings_build()).convertToPlanner();
        expect(result.weeks[0].days[0].exerciseText).to.equal(
          `Squat / 3x8 60s+|10s auto\nBench Press / ...Squat / 30s|45s`
        );
      });
    });

    it("exposes setTime as an assignable variable in progress scripts", () => {
      const programText = `# Week 1
## Day 1
Plank / 1x1 30s|60s / progress: custom() {~
  setTime[1] += 5
~}`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[1]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.equal(`# Week 1
## Day 1
Plank / 1x1 35s|60s / progress: custom() {~
  setTime[1] += 5
~}


`);
    });

    it("moves a uniform setTime change back into a global override on a reuse line", () => {
      const programText = `# Week 1
## Day 1
plank_progression / used: none / 2x1 / 70s|90s 0lb / progress: custom(completions: 1) {~
  setTime = 80
~}

Plank / ...plank_progression`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[1, 1]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.equal(`# Week 1
## Day 1
plank_progression / used: none / 2x1 / 0lb 70s|90s / progress: custom(completions: 1) {~
  setTime = 80
~}

Plank / ...plank_progression / 80s|90s


`);
    });

    it("dereuses sets when setTime changes on an exercise with reused sets", () => {
      const programText = `# Week 1
## Day 1
plank_progression / used: none / 1x1 70s|90s, 1x1 60s+|90s / 0lb / progress: custom(completions: 1) {~
  setTime[2] = 70
~}

Plank / ...plank_progression / progress: custom(completions: 0) { ...plank_progression }`;
      const { program } = PlannerTestUtils_finish(programText, { completedReps: [[1, 1]] });
      const newText = PlannerProgram_generateFullText(program.planner!.weeks);
      expect(newText).to.equal(`# Week 1
## Day 1
plank_progression / used: none / 1x1 70s|90s, 1x1 60s+|90s / 0lb / progress: custom(completions: 1) {~
  setTime[2] = 70
~}

Plank / ...plank_progression / 1x1 70s|90s, 1x1 70s+|90s / progress: custom(completions: 0) { ...plank_progression }


`);
    });

    it("exposes completedSetTime to progress scripts", () => {
      const programText = `# Week 1
## Day 1
Plank / 1x1 30s+|60s / progress: custom() {~
  setTime[1] = completedSetTime[1] + 5
~}`;
      const { program } = PlannerTestUtils_get(programText);
      const settings = Settings_build();
      const record = Program_nextHistoryRecord(program, settings, Stats_getEmpty());
      const set = record.entries[0].sets[0];
      set.completedReps = 1;
      set.completedSetTimer = 45;
      set.isCompleted = true;
      const { program: newProgram } = Program_runAllFinishDayScripts(program, record, Stats_getEmpty(), settings);
      const newText = PlannerProgram_generateFullText(newProgram.planner!.weeks);
      expect(newText).to.equal(`# Week 1
## Day 1
Plank / 1x1 50s+|60s / progress: custom() {~
  setTime[1] = completedSetTime[1] + 5
~}


`);
    });

    it("removes sets (not zeroes them out) when update reduces numberOfSets", () => {
      const programText = `# Week 1
## Day 1
Squat[1-3] / ...customLogic / 3x5-10 / 200lb

# Week 2
## Day 1


# Week 3
## Day 1
customLogic[1-3] / used: none / 2x5-30 / 5lb / warmup: none / update: custom() {~
  if (week == 1) {
    numberOfSets = 2
  }
~}`;
      const { program } = PlannerTestUtils_get(programText);
      const settings = Settings_build();
      const record = Program_nextHistoryRecord(program, settings, Stats_getEmpty());
      expect(record.entries[0].sets.length).to.equal(2);
    });
  });

  describe("shared property placement", () => {
    function roundtrip(text: string): string {
      const { program } = PlannerTestUtils_get(text);
      const settings = Settings_build();
      const evaluated = Program_evaluate(program, settings);
      const planner = new ProgramToPlanner(evaluated, settings).convertToPlanner();
      return PlannerProgram_generateFullText(planner.weeks).trim();
    }

    it("keeps progress on the week it was written on", () => {
      expect(
        roundtrip(`# Week 1
## Day 1
Squat / 3x8 100lb

# Week 2
## Day 1
Squat / 3x8 100lb / progress: lp(5lb)`)
      ).to.equal(`# Week 1
## Day 1
Squat / 3x8 / 100lb


# Week 2
## Day 1
Squat / 3x8 / 100lb / progress: lp(5lb)`);
    });

    it("keeps update and warmup on the day they were written on", () => {
      expect(
        roundtrip(`# Week 1
## Day 1
Squat / 3x8 100lb
## Day 2
Squat / 3x8 100lb / warmup: 2x5 50lb / update: custom() {~ weights = 100lb ~}`)
      ).to.equal(`# Week 1
## Day 1
Squat / 3x8 / 100lb

## Day 2
Squat / 3x8 / 100lb / warmup: 2x5 50lb / update: custom() {~ weights = 100lb ~}`);
    });

    it("keeps progress on the last week after finishing a workout", () => {
      const { program } = PlannerTestUtils_finish(
        `# Week 1
## Day 1
Squat / 3x8 100lb

# Week 2
## Day 1
Squat / 3x8 100lb / progress: lp(5lb, 3, 0)`,
        { completedReps: [[8, 8, 8]] }
      );
      expect(PlannerProgram_generateFullText(program.planner!.weeks).trim()).to.equal(`# Week 1
## Day 1
Squat / 3x8 / 100lb


# Week 2
## Day 1
Squat / 3x8 / 100lb / progress: lp(5lb, 3, 1)`);
    });

    // A forced order outranks where a line sits, so the day was rewritten and then drawn in the
    // order it was already in — the drag looked like it did nothing at all.
    it("drops the forced order when the per-day editor moves an exercise", () => {
      const settings = Settings_build();
      const { planner } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat[1] / 3x8 100lb
Bench Press[2] / 3x8 100lb
Bicep Curl[3] / 3x8 20lb`);
      const newPlanner = EditProgramUiHelpers_changeCurrentInstancePosition(
        planner,
        { week: 1, dayInWeek: 1, day: 1 },
        "Bicep Curl",
        2,
        0,
        settings
      );
      expect(PlannerProgram_generateFullText(newPlanner.weeks).trim()).to.equal(`# Week 1
## Day 1
Bicep Curl / 3x8 / 20lb
Squat / 3x8 / 100lb
Bench Press / 3x8 / 100lb`);
    });

    it("applies a UI progress edit at the week the progress was written on", () => {
      const text = `# Week 1
## Day 1
Squat / 3x8 100lb

# Week 2
## Day 1
Squat / 3x8 100lb / progress: lp(5lb)`;
      const settings = Settings_build();
      const { planner, program } = PlannerTestUtils_get(text);
      const exercise = Program_evaluate(program, settings).weeks[0].days[0].exercises[0];
      const newPlanner = EditProgramUiHelpers_changeFirstInstance(planner, exercise, settings, false, (e) => {
        const result = PlannerProgramExercise_buildProgress("lp", ["10lb"]);
        if (result.success) {
          e.progress = result.data;
        }
      });
      expect(PlannerProgram_generateFullText(newPlanner.weeks).trim()).to.equal(`# Week 1
## Day 1
Squat / 3x8 / 100lb


# Week 2
## Day 1
Squat / 3x8 / 100lb / progress: lp(10lb)`);
    });

    it("still prints progress on the first instance when it's written there", () => {
      expect(
        roundtrip(`# Week 1
## Day 1
Squat / 3x8 100lb / progress: lp(5lb)

# Week 2
## Day 1
Squat / 3x8 100lb`)
      ).to.equal(`# Week 1
## Day 1
Squat / 3x8 / 100lb / progress: lp(5lb)


# Week 2
## Day 1
Squat / 3x8 / 100lb`);
    });
  });
});
