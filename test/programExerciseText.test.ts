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
  IProgramExerciseTextError,
  ProgramExerciseText_apply,
  ProgramExerciseText_findDeclaration,
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
  return ProgramExerciseText_apply(program.planner!, declaration, text, swapFor(text, declaration), scope, settings);
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
  });
});
