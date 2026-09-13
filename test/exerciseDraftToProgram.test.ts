import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { Program_evaluate, Program_getAllProgramExercises } from "../src/models/program";
import { IPlannerProgram } from "../src/types";
import {
  ExerciseLiftoEditorDraft_create,
  ExerciseLiftoEditorDraft_isDirty,
} from "../src/models/exerciseLiftoEditorDraft";
import {
  ExerciseDraftToProgram_analyze,
  ExerciseDraftToProgram_apply,
  ExerciseDraftToProgram_snapshot,
  ExerciseDraftToProgram_writePreview,
  IExerciseDraftToProgramOptions,
  IExerciseDraftToProgramSnapshot,
} from "../src/models/exerciseDraftToProgram";
import {
  LiftoEditorBrain_exerciseFullName,
  LiftoEditorParseCache,
} from "../src/components/primitives/liftoEditorBrain";
import { ProgramExerciseSwap_detect } from "../src/models/programExerciseSwap";
import { ExerciseLiftoEditorSave_decide } from "../src/models/exerciseLiftoEditorSave";
import { IPlannerProgramExercise } from "../src/pages/planner/models/types";

const settings = Settings_build();
const cache = new LiftoEditorParseCache();

const options: IExerciseDraftToProgramOptions = {
  swapScope: "all",
  detectSwap: (text: string, declaration: IPlannerProgramExercise) => {
    const parsed = LiftoEditorBrain_exerciseFullName(cache, text);
    return parsed != null ? ProgramExerciseSwap_detect(parsed, declaration, settings) : undefined;
  },
};

const reuseProgram = `# Week 1
## Day 1
t1 / used: none / 5x3 / 150lb / progress: lp(5lb)
T1: Squat / ...t1
`;

function open(programText: string, fullName: string): IExerciseDraftToProgramSnapshot {
  const { program } = PlannerTestUtils_get(programText);
  const evaluated = Program_evaluate(program, settings);
  const exercise = Program_getAllProgramExercises(evaluated).find((e) => e.fullName === fullName);
  if (exercise == null || program.planner == null) {
    throw new Error(`No ${fullName}`);
  }
  const snapshot = ExerciseDraftToProgram_snapshot(
    { ...program, planner: program.planner },
    { exerciseKey: exercise.key, day: exercise.dayData.day, selectedDayData: undefined },
    settings
  );
  if (snapshot == null) {
    throw new Error(`No snapshot for ${fullName}`);
  }
  return snapshot;
}

function dayText(planner: IPlannerProgram, week: number, dayInWeek: number): string {
  return planner.weeks[week - 1].days[dayInWeek - 1].exerciseText.trim();
}

describe("ExerciseDraftToProgram", () => {
  it("resolves the declaration, its blurb and its instances from one evaluation", () => {
    const snapshot = open(reuseProgram, "T1: Squat");
    expect(snapshot.blurb).to.equal("T1: Squat / ...t1");
    expect(snapshot.instances.map((e) => e.dayData.week)).to.deep.equal([1]);
    expect(snapshot.declaration.dayData).to.deep.equal(snapshot.declarationDayData);
  });

  it("returns nothing for an exercise the program does not have", () => {
    const snapshot = open(reuseProgram, "T1: Squat");
    expect(
      ExerciseDraftToProgram_snapshot(
        snapshot.program,
        { exerciseKey: "nope", day: 1, selectedDayData: undefined },
        settings
      )
    ).to.equal(undefined);
  });

  it("applies an edited line onto the program", () => {
    const snapshot = open(reuseProgram, "T1: Squat");
    const draft = ExerciseLiftoEditorDraft_create(snapshot.blurb, snapshot.sharedSections);
    const result = ExerciseDraftToProgram_apply(snapshot, draft, "T1: Squat / ...t1 / 3x8", options);
    expect(result != null && "planner" in result.applied && dayText(result.applied.planner, 1, 1)).to.contain(
      "T1: Squat / ...t1 / 3x8"
    );
  });

  it("applies nothing for empty text", () => {
    const snapshot = open(reuseProgram, "T1: Squat");
    const draft = ExerciseLiftoEditorDraft_create(snapshot.blurb, snapshot.sharedSections);
    expect(ExerciseDraftToProgram_apply(snapshot, draft, "   ", options)).to.equal(undefined);
  });

  it("resolves the panel's text through the reuse", () => {
    const snapshot = open(reuseProgram, "T1: Squat");
    const draft = ExerciseLiftoEditorDraft_create(snapshot.blurb, snapshot.sharedSections);
    const analysis = ExerciseDraftToProgram_analyze(snapshot, draft, snapshot.blurb, options, true);
    expect(analysis.error).to.equal(undefined);
    expect(analysis.preview).to.deep.equal({ text: "T1: Squat / 5x3 / 150lb / progress: lp(5lb)" });
  });

  it("rebases an error past the leading whitespace the editor shows", () => {
    const snapshot = open(reuseProgram, "T1: Squat");
    const draft = ExerciseLiftoEditorDraft_create(snapshot.blurb, snapshot.sharedSections);
    const plain = ExerciseDraftToProgram_analyze(snapshot, draft, "T1: Squat / ...t1 / 5x?", options, false);
    const indented = ExerciseDraftToProgram_analyze(snapshot, draft, "  T1: Squat / ...t1 / 5x?", options, false);
    expect(plain.error?.from).to.be.a("number");
    expect(indented.error?.from).to.equal((plain.error?.from ?? 0) + 2);
  });

  it("answers with a preview error when there is no snapshot", () => {
    const draft = ExerciseLiftoEditorDraft_create("", []);
    expect(ExerciseDraftToProgram_analyze(undefined, draft, "Squat", options, true)).to.deep.equal({
      preview: { error: "There's nothing to resolve here yet." },
    });
  });

  it("previews a renamed exercise under its new key", () => {
    const snapshot = open(reuseProgram, "T1: Squat");
    const draft = ExerciseLiftoEditorDraft_create(snapshot.blurb, snapshot.sharedSections);
    const analysis = ExerciseDraftToProgram_analyze(snapshot, draft, "T1: Bench Press / ...t1", options, true);
    expect(analysis.error).to.equal(undefined);
    expect(analysis.preview).to.deep.equal({ text: "T1: Bench Press / 5x3 / 150lb / progress: lp(5lb)" });
  });

  it("writes the panel's line and hands back the planner and a clean draft", () => {
    const snapshot = open(reuseProgram, "T1: Squat");
    const draft = ExerciseLiftoEditorDraft_create(snapshot.blurb, snapshot.sharedSections);
    const written = ExerciseDraftToProgram_writePreview(
      snapshot,
      draft,
      "T1: Squat / 5x3 / 160lb / progress: lp(5lb)",
      options
    );
    if ("error" in written) {
      throw new Error(written.error.message);
    }
    if (written.unchanged) {
      throw new Error("Expected a changed program");
    }
    expect(written.blurb).to.equal("T1: Squat / ...t1 / 160lb");
    expect(dayText(written.planner, 1, 1)).to.contain("T1: Squat / ...t1 / 160lb");
    expect(written.draft.localBlurb).to.equal("T1: Squat / ...t1 / 160lb");
    expect(ExerciseLiftoEditorDraft_isDirty(written.draft)).to.equal(false);
  });

  it("returns only the blurb when the panel writes a program equal to the current one", () => {
    const snapshot = open(reuseProgram, "T1: Squat");
    const draft = ExerciseLiftoEditorDraft_create(snapshot.blurb, snapshot.sharedSections);
    const written = ExerciseDraftToProgram_writePreview(
      snapshot,
      draft,
      "T1: Squat / 5x3 / 150lb / progress: lp(5lb)",
      options
    );
    expect(written).to.deep.equal({ blurb: "T1: Squat / ...t1", unchanged: true });
  });

  it("saves what a flushed panel write produced when Save reads the written planner", () => {
    const snapshot = open(
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
    const draft = ExerciseLiftoEditorDraft_create(snapshot.blurb, snapshot.sharedSections);
    const written = ExerciseDraftToProgram_writePreview(
      snapshot,
      draft,
      "T1: Squat / 5x3 / 150lb / warmup: 2x5 50%",
      options
    );
    if ("error" in written || written.unchanged) {
      throw new Error("Expected a changed program");
    }
    const decision = ExerciseLiftoEditorSave_decide({
      program: { ...snapshot.program, planner: written.planner },
      target: { exerciseKey: snapshot.declaration.key, day: snapshot.tappedDayData.day, selectedDayData: undefined },
      draft: written.draft,
      hasPendingPlanner: true,
      isFromWorkout: true,
      hasEditorDraft: false,
      progress: undefined,
      cachedScope: undefined,
      settings,
      detectSwap: options.detectSwap,
    });
    if (decision.kind !== "write") {
      throw new Error(`Expected a write, got ${decision.kind}`);
    }
    expect(dayText(decision.plan.updatedProgram.planner, 2, 1)).to.contain("T1: Squat / ...t1 / warmup: 2x5 50%");
  });

  it("reports a panel line that fails to parse", () => {
    const snapshot = open(reuseProgram, "T1: Squat");
    const draft = ExerciseLiftoEditorDraft_create(snapshot.blurb, snapshot.sharedSections);
    const written = ExerciseDraftToProgram_writePreview(snapshot, draft, "T1: Squat / 5x? / 150lb", options);
    expect("error" in written).to.equal(true);
  });
});
