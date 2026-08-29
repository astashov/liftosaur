import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { Program_evaluate, Program_getAllProgramExercises } from "../src/models/program";
import {
  LiftoEditorBrain_exerciseFullName,
  LiftoEditorParseCache,
} from "../src/components/primitives/liftoEditorBrain";
import { IProgramExerciseSwap, ProgramExerciseSwap_detect } from "../src/models/programExerciseSwap";
import {
  IProgramExerciseSharedSection,
  IProgramExerciseTextError,
  ProgramExerciseText_apply,
  ProgramExerciseText_blurb,
  ProgramExerciseText_compose,
  ProgramExerciseText_findDeclaration,
  ProgramExerciseText_sharedRanges,
  ProgramExerciseText_sharedSections,
  ProgramExerciseText_split,
} from "../src/models/programExerciseText";
import { IPlannerProgram, IProgram } from "../src/types";
import { IPlannerProgramExercise } from "../src/pages/planner/models/types";

const settings = Settings_build();

function declarationOf(program: IProgram, key: string, week?: number): IPlannerProgramExercise {
  const evaluated = Program_evaluate(program, settings);
  const exercise = Program_getAllProgramExercises(evaluated).find(
    (e) => e.key === key && (week == null || e.dayData.week === week)
  );
  if (exercise == null) {
    throw new Error(`No exercise ${key}`);
  }
  return ProgramExerciseText_findDeclaration(evaluated, exercise);
}

function swapFor(text: string, declaration: IPlannerProgramExercise): IProgramExerciseSwap | undefined {
  const parsed = LiftoEditorBrain_exerciseFullName(new LiftoEditorParseCache(), text);
  return parsed != null ? ProgramExerciseSwap_detect(parsed, declaration, settings) : undefined;
}

function apply(
  program: IProgram,
  declaration: IPlannerProgramExercise,
  text: string,
  scope: "one" | "all" = "all"
): { planner: IPlannerProgram } | { error: IProgramExerciseTextError; notFound?: boolean } {
  return ProgramExerciseText_apply(
    program.planner!,
    declaration,
    text,
    [],
    swapFor(text, declaration),
    scope,
    settings
  );
}

function sharedOf(program: IProgram, declaration: IPlannerProgramExercise): IProgramExerciseSharedSection[] {
  return ProgramExerciseText_sharedSections(Program_evaluate(program, settings), declaration);
}

// What the sheet does end to end: compose the declaration with what it inherits, hand the
// result to the user, then split their edit back apart and save it.
function applyComposed(
  program: IProgram,
  declaration: IPlannerProgramExercise,
  edit: (composed: string) => string,
  scope: "one" | "all" = "all"
): { planner: IPlannerProgram } | { error: IProgramExerciseTextError; notFound?: boolean } {
  const shared = sharedOf(program, declaration);
  const edited = edit(ProgramExerciseText_compose(declaration.text, shared));
  const split = ProgramExerciseText_split(edited.trim(), shared);
  const localBlurb = split.localBlurb.trim();
  return ProgramExerciseText_apply(
    program.planner!,
    declaration,
    localBlurb,
    split.sharedEdits,
    swapFor(localBlurb, declaration),
    scope,
    settings
  );
}

function dayText(planner: IPlannerProgram, week: number, day: number): string {
  return planner.weeks[week - 1].days[day - 1].exerciseText.trim();
}

describe("ProgramExerciseText", () => {
  describe("findDeclaration", () => {
    it("resolves a repeat instance back to the line that declares it", () => {
      const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat[1-3] / 3x5 100lb

# Week 2
## Day 1

# Week 3
## Day 1
`);
      const evaluated = Program_evaluate(program, settings);
      const repeat = Program_getAllProgramExercises(evaluated).find((e) => e.isRepeat && e.dayData.week === 3);
      expect(repeat).to.not.eql(undefined);
      expect(ProgramExerciseText_findDeclaration(evaluated, repeat!).dayData.week).to.eql(1);
    });
  });

  describe("apply", () => {
    it("edits the week it was asked for when identical lines repeat across weeks", () => {
      const text = `# Week 1
## Day 1
Squat / 3x5 100lb

# Week 2
## Day 1
Squat / 3x5 100lb
`;
      const { program } = PlannerTestUtils_get(text);
      const week2 = declarationOf(program, "squat_barbell", 2);
      const result = apply(program, week2, "Squat / 5x5 100lb");
      expect("planner" in result).to.eql(true);
      const planner = (result as { planner: IPlannerProgram }).planner;
      expect(dayText(planner, 1, 1)).to.eql("Squat / 3x5 100lb");
      expect(dayText(planner, 2, 1)).to.eql("Squat / 5x5 100lb");
    });

    it("reports an error inside the blurb with blurb-local offsets", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      const declaration = declarationOf(program, "squat_barbell");
      const result = apply(program, declaration, "Squat / 3x5 100lb / progress: nosuchfn(5lb)");
      const error = (result as { error: IProgramExerciseTextError }).error;
      expect(error.from).to.be.a("number");
      // Offsets are relative to the blurb, so they land on the offending text within it.
      expect("Squat / 3x5 100lb / progress: nosuchfn(5lb)".slice(error.from, error.to)).to.include("nosuchfn");
    });

    it("rebases in-blurb offsets past a swapped name, which the evaluator never saw", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nOverhead Press / 3x5 100lb\n`);
      const declaration = declarationOf(program, "overheadpress_barbell");
      const edited = "Ab Wheel / 3x5 100lb / progress: nosuchfn(5lb)";
      const result = apply(program, declaration, edited);
      const error = (result as { error: IProgramExerciseTextError }).error;
      expect(edited.slice(error.from, error.to)).to.include("nosuchfn");
    });

    it("saves a rename that a reuse elsewhere points at, instead of refusing it", () => {
      const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Bench Press / ...Squat
`);
      const declaration = declarationOf(program, "squat_barbell");
      const result = apply(program, declaration, "Front Squat / 3x5 100lb");
      expect("planner" in result).to.eql(true);
      expect(dayText((result as { planner: IPlannerProgram }).planner, 1, 2)).to.include("...Front Squat");
    });

    it("still refuses an edit that breaks another day on its own", () => {
      const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Bench Press / ...Squat
`);
      const declaration = declarationOf(program, "squat_barbell");
      // Turning the reuse target into a reuse itself is not something renaming can repair.
      const result = apply(program, declaration, "Squat / ...Bench Press");
      expect("error" in result).to.eql(true);
    });

    it("reports notFound when the declaration is no longer in the program", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      const declaration = { ...declarationOf(program, "squat_barbell"), text: "Deadlift / 1x5 200lb" };
      const result = apply(program, declaration, "Squat / 5x5 100lb");
      expect((result as { notFound?: boolean }).notFound).to.eql(true);
    });

    it("refuses a declaration whose line has moved rather than finding its text further down", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nBench Press / 3x8\nSquat / 3x5 100lb\n`);
      // What a declaration resolved before something above it changed looks like: the line it
      // names holds a different exercise now. Searching the day for its text would find it one
      // line down and rewrite it anyway — on a day with the same exercise written twice, that is
      // an edit to a line nobody was looking at.
      const moved = { ...declarationOf(program, "squat_barbell"), line: 1 };
      const result = apply(program, moved, "Squat / 5x5 100lb");
      expect((result as { notFound?: boolean }).notFound).to.eql(true);
    });
  });

  describe("blurb", () => {
    it("takes the description lines above the exercise, and the blank lines between them", () => {
      const { program, planner } = PlannerTestUtils_get(
        `# Week 1\n## Day 1\n// First\n\n// ! Second\nSquat / 3x5 100lb\n`
      );
      const declaration = declarationOf(program, "squat_barbell");
      expect(ProgramExerciseText_blurb(planner, declaration)).to.eql("// First\n\n// ! Second\nSquat / 3x5 100lb");
    });

    it("leaves the blank lines that only space the day out to the day", () => {
      const { program, planner } = PlannerTestUtils_get(
        `# Week 1\n## Day 1\nBench Press / 3x5\n\n\n// Note\nSquat / 3x5 100lb\n`
      );
      const declaration = declarationOf(program, "squat_barbell");
      expect(ProgramExerciseText_blurb(planner, declaration)).to.eql("// Note\nSquat / 3x5 100lb");
    });

    it("stops at a `///` comment, which belongs to the day rather than to the exercise", () => {
      const { program, planner } = PlannerTestUtils_get(
        `# Week 1\n## Day 1\n/// Accessories\n// Note\nSquat / 3x5 100lb\n`
      );
      const declaration = declarationOf(program, "squat_barbell");
      expect(ProgramExerciseText_blurb(planner, declaration)).to.eql("// Note\nSquat / 3x5 100lb");
    });

    it("saves an edited description back onto the lines above the exercise", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\n// Old note\nSquat / 3x5 100lb\n`);
      const declaration = declarationOf(program, "squat_barbell");
      const result = apply(program, declaration, "// New note\nSquat / 5x5 100lb");
      expect("planner" in result).to.eql(true);
      expect(dayText((result as { planner: IPlannerProgram }).planner, 1, 1)).to.eql("// New note\nSquat / 5x5 100lb");
    });

    it("doesn't touch the description of the exercise above when the blurb drops its own", () => {
      const { program } = PlannerTestUtils_get(
        `# Week 1\n## Day 1\n// Bench note\nBench Press / 3x5\n\n// Squat note\nSquat / 3x5 100lb\n`
      );
      const declaration = declarationOf(program, "squat_barbell");
      const result = apply(program, declaration, "Squat / 5x5 100lb");
      expect("planner" in result).to.eql(true);
      expect(dayText((result as { planner: IPlannerProgram }).planner, 1, 1)).to.eql(
        "// Bench note\nBench Press / 3x5\n\nSquat / 5x5 100lb"
      );
    });

    it("writes a description onto an exercise that had none", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nBench Press / 3x5\nSquat / 3x5 100lb\n`);
      const declaration = declarationOf(program, "squat_barbell");
      const result = apply(program, declaration, "// Pause at the bottom\nSquat / 3x5 100lb");
      expect("planner" in result).to.eql(true);
      expect(dayText((result as { planner: IPlannerProgram }).planner, 1, 1)).to.eql(
        "Bench Press / 3x5\n// Pause at the bottom\nSquat / 3x5 100lb"
      );
    });

    it("edits the week it was asked for when the same description repeats across weeks", () => {
      const text = `# Week 1\n## Day 1\n// Note\nSquat / 3x5 100lb\n\n# Week 2\n## Day 1\n// Note\nSquat / 3x5 100lb\n`;
      const { program } = PlannerTestUtils_get(text);
      const week2 = declarationOf(program, "squat_barbell", 2);
      const result = apply(program, week2, "// Week 2 note\nSquat / 3x5 100lb");
      expect("planner" in result).to.eql(true);
      const planner = (result as { planner: IPlannerProgram }).planner;
      expect(dayText(planner, 1, 1)).to.eql("// Note\nSquat / 3x5 100lb");
      expect(dayText(planner, 2, 1)).to.eql("// Week 2 note\nSquat / 3x5 100lb");
    });
  });

  describe("shared properties", () => {
    const multiweek = `# Week 1
## Day 1
Squat / 5x5 100lb / warmup: 2x5 45lb / progress: lp(5lb)

# Week 2
## Day 1
Squat / 3x8 90lb
`;

    it("reports what a later week inherits, and from where", () => {
      const { program } = PlannerTestUtils_get(multiweek);
      const shared = sharedOf(program, declarationOf(program, "squat_barbell", 2));
      expect(shared.map((s) => s.property)).to.eql(["warmup", "progress"]);
      expect(shared.map((s) => s.text)).to.eql(["warmup: 2x5 45lb", "progress: lp(5lb)"]);
      expect(shared.every((s) => s.owners[0].dayData.week === 1)).to.eql(true);
    });

    it("reports nothing on the week that declares them", () => {
      const { program } = PlannerTestUtils_get(multiweek);
      expect(sharedOf(program, declarationOf(program, "squat_barbell", 1))).to.eql([]);
    });

    it("doesn't reach across exercises for a property inherited through reuse", () => {
      const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 5x5 100lb / progress: lp(5lb)
Bench Press / ...Squat
`);
      expect(sharedOf(program, declarationOf(program, "benchpress_barbell"))).to.eql([]);
    });

    it("composes and splits back to the original", () => {
      const { program } = PlannerTestUtils_get(multiweek);
      const declaration = declarationOf(program, "squat_barbell", 2);
      const shared = sharedOf(program, declaration);
      const composed = ProgramExerciseText_compose(declaration.text, shared);
      expect(composed).to.eql("Squat / 3x8 90lb / warmup: 2x5 45lb / progress: lp(5lb)");
      const split = ProgramExerciseText_split(composed, shared);
      expect(split.localBlurb).to.eql("Squat / 3x8 90lb");
      expect(split.sharedEdits.map((e) => e.text)).to.eql(["warmup: 2x5 45lb", "progress: lp(5lb)"]);
    });

    it("tints the shared sections including their separators", () => {
      const composed = "Squat / 3x8 90lb / warmup: 2x5 45lb / progress: lp(5lb)";
      const ranges = ProgramExerciseText_sharedRanges(composed, ["warmup", "progress"]);
      expect(ranges.map((r) => composed.slice(r.start, r.end))).to.eql(["/ warmup: 2x5 45lb", "/ progress: lp(5lb)"]);
    });

    it("writes an edit to the inherited progress into the week that declares it", () => {
      const { program } = PlannerTestUtils_get(multiweek);
      const result = applyComposed(program, declarationOf(program, "squat_barbell", 2), (composed) =>
        composed.replace("lp(5lb)", "lp(10lb)")
      );
      expect("planner" in result).to.eql(true);
      const planner = (result as { planner: IPlannerProgram }).planner;
      expect(dayText(planner, 1, 1)).to.eql("Squat / 5x5 100lb / warmup: 2x5 45lb / progress: lp(10lb)");
      expect(dayText(planner, 2, 1)).to.eql("Squat / 3x8 90lb");
    });

    it("keeps a local edit local while the inherited sections stay untouched", () => {
      const { program } = PlannerTestUtils_get(multiweek);
      const result = applyComposed(program, declarationOf(program, "squat_barbell", 2), (composed) =>
        composed.replace("3x8 90lb", "4x8 95lb")
      );
      const planner = (result as { planner: IPlannerProgram }).planner;
      expect(dayText(planner, 1, 1)).to.eql("Squat / 5x5 100lb / warmup: 2x5 45lb / progress: lp(5lb)");
      expect(dayText(planner, 2, 1)).to.eql("Squat / 4x8 95lb");
    });

    it("rewrites both declared properties in one pass when they share a line", () => {
      const { program } = PlannerTestUtils_get(multiweek);
      const result = applyComposed(program, declarationOf(program, "squat_barbell", 2), (composed) =>
        composed.replace("2x5 45lb", "3x5 45lb").replace("lp(5lb)", "lp(2.5lb)")
      );
      const planner = (result as { planner: IPlannerProgram }).planner;
      expect(dayText(planner, 1, 1)).to.eql("Squat / 5x5 100lb / warmup: 3x5 45lb / progress: lp(2.5lb)");
    });

    it("leaves the declaration alone when a shared section is missing from the text", () => {
      const { program } = PlannerTestUtils_get(multiweek);
      // The sheet doesn't offer removing a shared property — the editor hides the delete
      // affordance for them — so a text without one is a hidden section, never a deletion.
      const result = applyComposed(program, declarationOf(program, "squat_barbell", 2), (composed) =>
        composed.replace(" / progress: lp(5lb)", "")
      );
      const planner = (result as { planner: IPlannerProgram }).planner;
      expect(dayText(planner, 1, 1)).to.eql("Squat / 5x5 100lb / warmup: 2x5 45lb / progress: lp(5lb)");
      expect(dayText(planner, 2, 1)).to.eql("Squat / 3x8 90lb");
    });

    it("routes a property the user adds here to its owner rather than declaring it twice", () => {
      const { program } = PlannerTestUtils_get(multiweek);
      const declaration = declarationOf(program, "squat_barbell", 2);
      const shared = sharedOf(program, declaration);
      // Nothing composed it in — this is the "Add progress" pill pressed on a week that
      // already inherits one, which used to save an unresolvable duplicate.
      const split = ProgramExerciseText_split("Squat / 3x8 90lb / progress: dp(5lb, 8, 12)", shared);
      expect(split.localBlurb).to.eql("Squat / 3x8 90lb");
      const result = ProgramExerciseText_apply(
        program.planner!,
        declaration,
        split.localBlurb,
        split.sharedEdits,
        undefined,
        "all",
        settings
      );
      const planner = (result as { planner: IPlannerProgram }).planner;
      expect(dayText(planner, 1, 1)).to.include("progress: dp(5lb, 8, 12)");
      expect(dayText(planner, 1, 1)).to.not.include("lp(5lb)");
      expect(dayText(planner, 2, 1)).to.eql("Squat / 3x8 90lb");
    });

    it("finds the declaring line when the two weeks sit in the same day text", () => {
      const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Bench Press / 3x8 90lb
Squat / 5x5 100lb / progress: lp(5lb)

# Week 2
## Day 1
Bench Press / 3x8 90lb
Squat / 3x8 90lb
`);
      const result = applyComposed(program, declarationOf(program, "squat_barbell", 2), (composed) =>
        composed.replace("lp(5lb)", "lp(10lb)")
      );
      const planner = (result as { planner: IPlannerProgram }).planner;
      expect(dayText(planner, 1, 1)).to.eql("Bench Press / 3x8 90lb\nSquat / 5x5 100lb / progress: lp(10lb)");
      expect(dayText(planner, 2, 1)).to.eql("Bench Press / 3x8 90lb\nSquat / 3x8 90lb");
    });

    it("leaves a hidden section alone instead of reading its absence as a deletion", () => {
      const { program } = PlannerTestUtils_get(multiweek);
      const declaration = declarationOf(program, "squat_barbell", 2);
      const shared = sharedOf(program, declaration);
      // Collapsed is the default, so the text is the local line only — the state every save
      // starts from. Treating that as "the user removed progress" would wipe it every time.
      const split = ProgramExerciseText_split("Squat / 4x8 95lb", shared);
      expect(split.sharedEdits).to.eql([]);
      const result = ProgramExerciseText_apply(
        program.planner!,
        declaration,
        split.localBlurb,
        split.sharedEdits,
        undefined,
        "all",
        settings
      );
      const planner = (result as { planner: IPlannerProgram }).planner;
      expect(dayText(planner, 1, 1)).to.eql("Squat / 5x5 100lb / warmup: 2x5 45lb / progress: lp(5lb)");
      expect(dayText(planner, 2, 1)).to.eql("Squat / 4x8 95lb");
    });

    it("never reads an absent section as a deletion, shown or not", () => {
      const { program } = PlannerTestUtils_get(multiweek);
      const shared = sharedOf(program, declarationOf(program, "squat_barbell", 2));
      // warmup is on screen and edited; progress isn't there at all. Removing a shared property
      // is not something the sheet offers, so its absence can only mean untouched.
      const split = ProgramExerciseText_split("Squat / 3x8 90lb / warmup: 3x5 45lb", shared);
      expect(split.sharedEdits.map((e) => [e.property, e.text])).to.eql([["warmup", "warmup: 3x5 45lb"]]);
    });

    it("keeps every declaration of a property, not just the first", () => {
      const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 5x5 100lb / progress: lp(5lb)

# Week 2
## Day 1
Squat / 4x5 105lb / progress: lp(5lb)

# Week 3
## Day 1
Squat / 3x5 110lb
`);
      const shared = sharedOf(program, declarationOf(program, "squat_barbell", 3));
      expect(shared).to.have.length(1);
      expect(shared[0].owners.map((o) => o.dayData.week)).to.eql([1, 2]);
    });

    it("rewrites every declaration so they can't disagree afterwards", () => {
      const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 5x5 100lb / progress: lp(5lb)

# Week 2
## Day 1
Squat / 4x5 105lb / progress: lp(5lb)

# Week 3
## Day 1
Squat / 3x5 110lb
`);
      const result = applyComposed(program, declarationOf(program, "squat_barbell", 3), (composed) =>
        composed.replace("lp(5lb)", "lp(10lb)")
      );
      expect("planner" in result).to.eql(true);
      const planner = (result as { planner: IPlannerProgram }).planner;
      expect(dayText(planner, 1, 1)).to.eql("Squat / 5x5 100lb / progress: lp(10lb)");
      expect(dayText(planner, 2, 1)).to.eql("Squat / 4x5 105lb / progress: lp(10lb)");
      expect(dayText(planner, 3, 1)).to.eql("Squat / 3x5 110lb");
    });

    it("composes a section written with a trailing line continuation into valid text", () => {
      const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 5x5 100lb / warmup: none \\
  / progress: lp(5lb)

# Week 2
## Day 1
Squat / 3x8 90lb
`);
      const declaration = declarationOf(program, "squat_barbell", 2);
      const shared = sharedOf(program, declaration);
      const composed = ProgramExerciseText_compose(declaration.text, shared);
      // The "\\" is a wrapper for where the section currently sits, not part of it.
      expect(composed).to.not.include("\\");
      expect(composed).to.eql("Squat / 3x8 90lb / warmup: none / progress: lp(5lb)");
    });

    it("keeps progress: none on the week it was added, instead of overwriting the declaration", () => {
      const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 5x5 100lb / progress: custom() {~ weights += 5lb ~}

# Week 2
## Day 1
Squat / 3x8 90lb
`);
      const declaration = declarationOf(program, "squat_barbell", 2);
      const shared = sharedOf(program, declaration);
      // The evaluator only registers progress with type !== "none", so `progress: none` is a
      // per-day opt-out — routing it to Week 1 would replace that week's real progression.
      const split = ProgramExerciseText_split("Squat / 3x8 90lb / progress: none", shared);
      expect(split.sharedEdits).to.eql([]);
      expect(split.localBlurb).to.eql("Squat / 3x8 90lb / progress: none");
      const result = ProgramExerciseText_apply(
        program.planner!,
        declaration,
        split.localBlurb,
        split.sharedEdits,
        undefined,
        "all",
        settings
      );
      const planner = (result as { planner: IPlannerProgram }).planner;
      expect(dayText(planner, 1, 1)).to.eql("Squat / 5x5 100lb / progress: custom() {~ weights += 5lb ~}");
      expect(dayText(planner, 2, 1)).to.eql("Squat / 3x8 90lb / progress: none");
    });

    it("doesn't treat another week's progress: none as the declaration", () => {
      const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 5x5 100lb / progress: none

# Week 2
## Day 1
Squat / 4x5 105lb / progress: lp(5lb)

# Week 3
## Day 1
Squat / 3x5 110lb
`);
      const shared = sharedOf(program, declarationOf(program, "squat_barbell", 3));
      expect(shared.map((s) => s.property)).to.eql(["progress"]);
      expect(shared[0].owners.map((o) => o.dayData.week)).to.eql([2]);
    });

    it("does not treat id as inherited, because the evaluator never propagates tags", () => {
      const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 5x5 100lb / id: tags(5) / progress: lp(5lb)

# Week 2
## Day 1
Squat / 3x8 90lb
`);
      const evaluated = Program_evaluate(program, settings);
      const week2 = declarationOf(program, "squat_barbell", 2);
      // fillSingleProperties copies warmup/progress/update/notused onto every instance, but not
      // tags — so Week 2 genuinely has none, and surfacing Week 1's id here would route an edit
      // to the wrong line.
      expect(Program_getAllProgramExercises(evaluated).find((e) => e.dayData.week === 2)?.tags).to.eql([]);
      expect(sharedOf(program, week2).map((s) => s.property)).to.eql(["progress"]);
    });

    it("still reports an error in the local part, pointing inside the local text", () => {
      const { program } = PlannerTestUtils_get(multiweek);
      const result = applyComposed(program, declarationOf(program, "squat_barbell", 2), (composed) =>
        composed.replace("3x8 90lb", "3x8 90lb / ...Nonexistent")
      );
      const error = (result as { error: IProgramExerciseTextError }).error;
      expect(error).to.not.eql(undefined);
      if (error.from != null && error.to != null) {
        expect("Squat / 3x8 90lb / ...Nonexistent".slice(error.from, error.to)).to.include("Nonexistent");
      }
    });
  });
});
