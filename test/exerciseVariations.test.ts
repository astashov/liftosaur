import { expect } from "chai";
import "mocha";
import { Settings_build } from "../src/models/settings";
import { PlannerProgram_evaluateText, PlannerProgram_evaluate } from "../src/pages/planner/models/plannerProgram";
import { Program_create, Program_evaluate, Program_nextHistoryRecord } from "../src/models/program";
import { IProgram, IPlannerProgram, ISettings } from "../src/types";
import { IEvaluatedProgram } from "../src/models/program";
import { ProgramToPlanner } from "../src/models/programToPlanner";
import { Stats_getEmpty } from "../src/models/stats";
import { PlannerTestUtils_finish, PlannerTestUtils_changeExercise } from "./utils/plannerTestUtils";
import { migrations } from "../src/migrations/migrations";
import { IStorage } from "../src/types";

function evalFirst(text: string): { evaluated: IEvaluatedProgram; settings: ISettings; program: IProgram } {
  const planner: IPlannerProgram = { vtype: "planner", name: "MyProgram", weeks: PlannerProgram_evaluateText(text) };
  const program: IProgram = { ...Program_create("MyProgram"), planner };
  const settings = Settings_build();
  const evaluated = Program_evaluate(program, settings);
  return { evaluated, settings, program };
}

describe("exercise variations", () => {
  it("parses two variations with current marker", () => {
    const text = `# Week 1
## Day 1
Squat, Bodyweight | ! Pistol Squat / 3x8
`;
    const { evaluated } = evalFirst(text);
    const ex = evaluated.weeks[0].days[0].exercises[0];
    expect(ex.exerciseVariations.length).to.equal(2);
    expect(ex.exerciseVariations[0].name).to.equal("Squat");
    expect(ex.exerciseVariations[1].name).to.equal("Pistol Squat");
    expect(ex.exerciseVariations[0].isCurrent).to.equal(false);
    expect(ex.exerciseVariations[1].isCurrent).to.equal(true);
    // active exerciseType == the marked variation
    expect(ex.exerciseVariations[1].exerciseType?.id).to.equal(ex.exerciseType?.id);
  });

  it("composite key is distinct from single variation and stable when only ! moves", () => {
    const single = evalFirst(`# Week 1\n## Day 1\nSquat / 3x8\n`).evaluated.weeks[0].days[0].exercises[0];
    const ladderA = evalFirst(`# Week 1\n## Day 1\nSquat | ! Pistol Squat / 3x8\n`).evaluated.weeks[0].days[0]
      .exercises[0];
    const ladderB = evalFirst(`# Week 1\n## Day 1\n! Squat | Pistol Squat / 3x8\n`).evaluated.weeks[0].days[0]
      .exercises[0];
    expect(ladderA.key).to.not.equal(single.key);
    expect(ladderA.key).to.equal(ladderB.key);
  });

  it("round-trips the ladder and the current marker through serialization", () => {
    const text = `# Week 1\n## Day 1\nSquat | ! Pistol Squat / 3x8\n`;
    const { evaluated, settings } = evalFirst(text);
    const planner = new ProgramToPlanner(evaluated, settings).convertToPlanner();
    const serialized = planner.weeks[0].days[0].exerciseText;
    expect(serialized).to.contain("|");
    expect(serialized).to.contain("! Pistol Squat");
  });

  it("does not let a multi-variation ladder be reused by a rung's name", () => {
    const text = `# Week 1
## Day 1
Squat | Pistol Squat / 3x8
Bench Press / ...Squat
`;
    const planner: IPlannerProgram = { vtype: "planner", name: "MyProgram", weeks: PlannerProgram_evaluateText(text) };
    const evaluatedWeeks = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks;
    const day = evaluatedWeeks[0][0];
    expect(day.success).to.equal(false);
    if (!day.success) {
      expect(day.error.message).to.match(/No such exercise/);
    }
  });

  it("lets a multi-variation exercise be a reuse consumer of a template", () => {
    const text = `# Week 1
## Day 1
tmp: Squat / used: none / 3x8 / progress: lp(5lb)
Squat | Pistol Squat / ...tmp: Squat
`;
    const planner: IPlannerProgram = { vtype: "planner", name: "MyProgram", weeks: PlannerProgram_evaluateText(text) };
    const evaluatedWeeks = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks;
    const day = evaluatedWeeks[0][0];
    expect(day.success).to.equal(true);
  });

  it("logs the active movement and composite programExerciseId in the history entry", () => {
    const text = `# Week 1\n## Day 1\nSquat | ! Pistol Squat / 3x8\n`;
    const { program, evaluated, settings } = evalFirst(text);
    const nextRecord = Program_nextHistoryRecord(program, settings, Stats_getEmpty());
    const entry = nextRecord.entries[0];
    const ex = evaluated.weeks[0].days[0].exercises[0];
    expect(entry.exercise.id).to.equal("pistolSquat");
    expect(entry.programExerciseId).to.equal(ex.key);
    expect(ex.key).to.contain("_");
  });

  it("errors when a non-active variation is not a known exercise", () => {
    const text = `# Week 1\n## Day 1\nSquat | Totally Made Up Movement / 3x8\n`;
    const planner: IPlannerProgram = { vtype: "planner", name: "MyProgram", weeks: PlannerProgram_evaluateText(text) };
    const evaluatedWeeks = PlannerProgram_evaluate(planner, Settings_build()).evaluatedWeeks;
    const day = evaluatedWeeks[0][0];
    expect(day.success).to.equal(false);
    if (!day.success) {
      expect(day.error.message).to.match(/Unknown exercise Totally Made Up Movement/);
    }
  });

  it("advances the current variation via exerciseVariationIndex", () => {
    const text = `# Week 1
## Day 1
Squat | Pistol Squat / 3x8 / progress: custom() {~
  if (completedReps >= reps) {
    exerciseVariationIndex += 1
  }
~}
`;
    const { program } = PlannerTestUtils_finish(text, { completedReps: [[8, 8, 8]] });
    const newText = program.planner?.weeks[0].days[0].exerciseText || "";
    expect(newText).to.contain("! Pistol Squat");
  });

  it("exposes the 1-based current rung to progress scripts via exerciseVariationIndex", () => {
    // Starts on rung 2 (Pistol Squat); the script only advances when it reads the current rung as 2.
    const text = `# Week 1
## Day 1
Squat | ! Pistol Squat | Front Squat / 3x8 / progress: custom() {~
  if (exerciseVariationIndex == 2) {
    exerciseVariationIndex += 1
  }
~}
`;
    const { program } = PlannerTestUtils_finish(text, { completedReps: [[8, 8, 8]] });
    const newText = program.planner?.weeks[0].days[0].exerciseText || "";
    expect(newText).to.contain("! Front Squat");
  });

  it("collapses the ladder to the new target when replacing a multi-variation exercise", () => {
    const text = `# Week 1\n## Day 1\nSquat | Pistol Squat / 3x8\n`;
    const newText = PlannerTestUtils_changeExercise(text, "Squat | Pistol Squat", {
      id: "benchPress",
      equipment: "barbell",
    }).trim();
    expect(newText).to.contain("Bench Press");
    expect(newText).to.not.contain("|");
    expect(newText).to.not.contain("Pistol Squat");
  });

  it("migration rewrites planner text references to sanitized custom exercise names", () => {
    const migration = migrations["20260702120000_sanitize_pipe_bang_in_custom_exercise_names"];
    const storage = {
      settings: { exercises: { abc123: { id: "abc123", name: "Pull | Row" } } },
      programs: [{ planner: { weeks: [{ days: [{ exerciseText: "Pull | Row / 3x8\n" }] }] } }],
    } as unknown as IStorage;
    const result = migration(storage);
    expect(result.settings.exercises.abc123!.name).to.equal("Pull - Row");
    expect(result.programs[0].planner!.weeks[0].days[0].exerciseText).to.equal("Pull - Row / 3x8\n");
  });
});
