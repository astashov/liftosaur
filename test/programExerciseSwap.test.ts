import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { Program_evaluate, Program_getAllProgramExercises } from "../src/models/program";
import { PlannerProgram_evaluate } from "../src/pages/planner/models/plannerProgram";
import {
  LiftoEditorBrain_exerciseFullName,
  LiftoEditorParseCache,
} from "../src/components/primitives/liftoEditorBrain";
import {
  IProgramExerciseParsedName,
  IProgramExerciseSwap,
  ProgramExerciseSwap_apply,
  ProgramExerciseSwap_detect,
  ProgramExerciseSwap_identity,
  ProgramExerciseSwap_revertedText,
  ProgramExerciseSwap_workoutRemap,
} from "../src/models/programExerciseSwap";
import { Progress_hasCompletedSetsForProgramExerciseId, Progress_remapProgramExerciseId } from "../src/models/progress";
import { IHistoryEntry, IHistoryRecord, IPlannerProgram, IProgram, ISettings } from "../src/types";
import { IPlannerProgramExercise } from "../src/pages/planner/models/types";

const settings = Settings_build();

function declarationOf(program: IProgram, key: string): IPlannerProgramExercise {
  const exercise = Program_getAllProgramExercises(Program_evaluate(program, settings)).find(
    (e) => e.key === key && !e.isRepeat
  );
  if (exercise == null) {
    throw new Error(`No declaration for ${key}`);
  }
  return exercise;
}

function parseName(text: string): IProgramExerciseParsedName {
  const parsed = LiftoEditorBrain_exerciseFullName(new LiftoEditorParseCache(), text);
  if (parsed == null) {
    throw new Error(`No exercise name in ${text}`);
  }
  return parsed;
}

function identity(fullName: string): ReturnType<typeof ProgramExerciseSwap_identity> {
  return ProgramExerciseSwap_identity(parseName(fullName), settings);
}

function detect(
  text: string,
  declaration: IPlannerProgramExercise,
  sett: ISettings = settings
): IProgramExerciseSwap | undefined {
  return ProgramExerciseSwap_detect(parseName(text), declaration, sett);
}

function dayTexts(planner: IPlannerProgram): string[] {
  return planner.weeks.flatMap((w) => w.days.map((d) => d.exerciseText.trim()));
}

function evalErrors(planner: IPlannerProgram): string[] {
  const { evaluatedWeeks } = PlannerProgram_evaluate(planner, settings);
  return evaluatedWeeks.flatMap((week) => week.flatMap((day) => (day.success ? [] : [day.error.message])));
}

function buildEntry(programExerciseId: string | undefined, overrides: Partial<IHistoryEntry> = {}): IHistoryEntry {
  return {
    vtype: "history_entry",
    index: 0,
    id: `entry-${programExerciseId ?? "none"}`,
    exercise: { id: "squat", equipment: "barbell" },
    programExerciseId,
    sets: [
      {
        vtype: "set",
        id: "set-1",
        index: 0,
        reps: 5,
        weight: { value: 100, unit: "lb" },
        originalWeight: { value: 100, unit: "lb" },
        isUnilateral: false,
      },
    ],
    warmupSets: [],
    ...overrides,
  };
}

function buildProgress(entries: IHistoryEntry[]): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(0).toISOString(),
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Day 1",
    entries,
    startTime: 0,
    id: 0,
  };
}

describe("ProgramExerciseSwap", () => {
  describe("detect", () => {
    it("ignores edits that leave the exercise the same", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      const declaration = declarationOf(program, "squat_barbell");
      expect(detect("Squat / 3x8 100lb", declaration)).to.eql(undefined);
    });

    it("reports the name span so the rest of the edit survives the revert", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      const declaration = declarationOf(program, "squat_barbell");
      const swap = detect("Front Squat / 3x8 100lb", declaration);
      expect(swap?.oldKey).to.eql("squat_barbell");
      expect(swap?.newKey).to.eql("frontsquat_barbell");
      expect(swap?.isLadder).to.eql(false);
      expect(ProgramExerciseSwap_revertedText("Front Squat / 3x8 100lb", swap!)).to.eql("Squat / 3x8 100lb");
    });

    it("leaves a name that resolves to nothing to the evaluator", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      const declaration = declarationOf(program, "squat_barbell");
      expect(detect("Squatt / 3x5 100lb", declaration)).to.eql(undefined);
    });

    // A template is `used: none` on a name that is not a real exercise — the one thing that
    // can never enter a workout and never progresses, so it never de-reuses. `used: none` on
    // a real exercise is an ordinary exercise that is merely kept out of the day.
    it("allows an unresolved name when the text declares a template", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nAny Squat / used: none\n`);
      const declaration = declarationOf(program, "any squat");
      expect(detect("Any Squat Variation / used: none", declaration)?.newKey).to.eql("any squat variation");
    });

    it("judges the template rule on the edited text, not on what the exercise used to be", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nAny Squat / used: none\n`);
      const declaration = declarationOf(program, "any squat");
      // Dropping `used: none` while renaming is how a template stops being one. Treating this
      // as a template swap would hand replaceExercise a bare name, and it puts `used: none`
      // back — silently undoing the edit instead of reporting the unknown name.
      expect(detect("Any Squat Variation / 3x8 100lb", declaration)).to.eql(undefined);
    });

    it("treats a real exercise with used: none as a regular exercise", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nSquat / 3x5 100lb / used: none\n`);
      const declaration = declarationOf(program, "squat_barbell");
      expect(detect("Front Squat / 3x5 100lb / used: none", declaration)?.newKey).to.eql("frontsquat_barbell");
      // Still a typo, not a template, even though the line says `used: none`.
      expect(detect("Squatt / 3x5 100lb / used: none", declaration)?.newKey).to.eql("squatt");
    });

    it("doesn't mistake used: none inside a description for a template", () => {
      const { program } = PlannerTestUtils_get(
        `# Week 1\n## Day 1\n// when used: none of the plates fit\nSquat / 3x5 100lb\n`
      );
      const declaration = declarationOf(program, "squat_barbell");
      expect(detect("// when used: none of the plates fit\nSquatt / 3x5 100lb", declaration)).to.eql(undefined);
    });

    it("treats equipment and label changes as a different exercise", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      const declaration = declarationOf(program, "squat_barbell");
      expect(detect("Squat, Dumbbell / 3x5 100lb", declaration)?.newKey).to.eql("squat_dumbbell");
      expect(detect("A: Squat / 3x5 100lb", declaration)?.newKey).to.eql("a-squat_barbell");
    });

    it("flags a ladder change", () => {
      const { program } = PlannerTestUtils_get(`# Week 1\n## Day 1\nSquat / 3x5 100lb\n`);
      const declaration = declarationOf(program, "squat_barbell");
      expect(detect("Squat | Front Squat / 3x5 100lb", declaration)?.isLadder).to.eql(true);
    });
  });

  describe("identity", () => {
    it("reads the exercise out of the text, so reopening the picker shows the swapped one", () => {
      const abWheel = identity("Ab Wheel");
      expect(abWheel.exerciseType?.id).to.eql("abWheel");
      expect(abWheel.templateName).to.eql(undefined);
      const labelled = identity("A: Squat, Dumbbell");
      expect(labelled.exerciseType?.id).to.eql("squat");
      expect(labelled.exerciseType?.equipment).to.eql("dumbbell");
      expect(labelled.label).to.eql("A");
    });

    it("reports the current rung of a ladder", () => {
      expect(identity("Squat | !Front Squat").exerciseType?.id).to.eql("frontSquat");
    });

    // The rungs and the `!` come off the grammar, so spacing around the separator and the
    // marker is the parser's problem rather than something a split has to anticipate.
    it("reads rungs the way the parser does, whatever the spacing", () => {
      for (const name of ["Squat|!Front Squat", "Squat  |  ! Front Squat", "Squat | !Front Squat"]) {
        expect(identity(name).exerciseType?.id, name).to.eql("frontSquat");
      }
      const parsed = parseName("A: Squat, Dumbbell | !Front Squat");
      expect(parsed.variations.map((v) => `${v.text}${v.isCurrent ? "!" : ""}`)).to.eql([
        "A: Squat, Dumbbell",
        "Front Squat!",
      ]);
    });

    it("clears the exercise for a template name, so a stale one can't survive the swap", () => {
      expect(identity("Any Squat")).to.eql({
        exerciseType: undefined,
        label: undefined,
        templateName: "Any Squat",
      });
    });
  });

  describe("apply", () => {
    // A reuse by bare name needs the name to be unique in the program, so the reuse and the
    // multi-day cases can't share one fixture.
    const withReuse = `# Week 1
## Day 1
Squat / 3x5 100lb / progress: lp(5lb)

## Day 2
Bench Press / ...Squat
`;
    const twoDays = `# Week 1
## Day 1
Squat / 3x5 100lb / progress: lp(5lb)

## Day 2
Squat / 2x5 80lb
`;

    it("rewrites reuse references pointed at the renamed exercise", () => {
      const { program, planner } = PlannerTestUtils_get(withReuse);
      const declaration = declarationOf(program, "squat_barbell");
      const swap = detect("Front Squat / 3x5 100lb / progress: lp(5lb)", declaration)!;
      const applied = ProgramExerciseSwap_apply(planner, swap, "all", declaration.dayData, settings);
      expect("planner" in applied).to.eql(true);
      const result = (applied as { planner: IPlannerProgram }).planner;
      expect(evalErrors(result)).to.eql([]);
      expect(dayTexts(result)[1]).to.include("...Front Squat");
    });

    it("changes every day when the scope is the whole program", () => {
      const { program, planner } = PlannerTestUtils_get(twoDays);
      const declaration = declarationOf(program, "squat_barbell");
      const swap = detect("Front Squat / 3x5 100lb / progress: lp(5lb)", declaration)!;
      const result = (
        ProgramExerciseSwap_apply(planner, swap, "all", declaration.dayData, settings) as { planner: IPlannerProgram }
      ).planner;
      expect(evalErrors(result)).to.eql([]);
      expect(dayTexts(result)[0]).to.match(/^Front Squat/);
      expect(dayTexts(result)[1]).to.match(/^Front Squat/);
    });

    it("leaves the other days alone when the scope is one day", () => {
      const { program, planner } = PlannerTestUtils_get(twoDays);
      const declaration = declarationOf(program, "squat_barbell");
      const swap = detect("Front Squat / 3x5 100lb / progress: lp(5lb)", declaration)!;
      const result = (
        ProgramExerciseSwap_apply(planner, swap, "one", declaration.dayData, settings) as { planner: IPlannerProgram }
      ).planner;
      expect(evalErrors(result)).to.eql([]);
      expect(dayTexts(result)[0]).to.match(/^Front Squat/);
      expect(dayTexts(result)[1]).to.match(/^Squat/);
    });

    it("keeps a ladder identical on every instance", () => {
      const { program, planner } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Squat / 2x5 80lb
`);
      const declaration = declarationOf(program, "squat_barbell");
      const swap = detect("Squat | Front Squat / 3x5 100lb", declaration)!;
      const result = (
        ProgramExerciseSwap_apply(planner, swap, "one", declaration.dayData, settings) as { planner: IPlannerProgram }
      ).planner;
      expect(evalErrors(result)).to.eql([]);
      for (const day of dayTexts(result)) {
        expect(day).to.include("Squat | Front Squat");
      }
    });

    it("leaves each instance on the rung it had progressed to", () => {
      const { program, planner } = PlannerTestUtils_get(`# Week 1
## Day 1
!Leg Press | Hack Squat / 3x10 200lb

## Day 2
Leg Press | !Hack Squat / 3x8 180lb
`);
      const declaration = declarationOf(program, "legpress_leveragemachine_hacksquat_barbell");
      const swap = detect("!Leg Press | Front Squat / 3x10 200lb", declaration)!;
      const result = (
        ProgramExerciseSwap_apply(planner, swap, "all", declaration.dayData, settings) as { planner: IPlannerProgram }
      ).planner;
      expect(evalErrors(result)).to.eql([]);
      const variations = Program_getAllProgramExercises(
        Program_evaluate({ ...program, planner: result }, settings)
      ).map((e) => e.exerciseVariations?.map((v) => `${v.name}${v.isCurrent ? "!" : ""}`).join("|"));
      // The rungs match everywhere, but day 2 stays on the second one — the rung an instance
      // is on is its own progression, not part of the exercise's identity. Day 1 is on the
      // first rung, which serializes without a marker because that is the default.
      expect(variations).to.eql(["Leg Press|Front Squat", "Leg Press|Front Squat!"]);
    });

    it("de-conflicts a name the program already uses on another day", () => {
      const { program, planner } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Front Squat / 3x5 80lb
`);
      const declaration = declarationOf(program, "squat_barbell");
      const swap = detect("Front Squat / 3x5 100lb", declaration)!;
      const result = (
        ProgramExerciseSwap_apply(planner, swap, "all", declaration.dayData, settings) as { planner: IPlannerProgram }
      ).planner;
      expect(evalErrors(result)).to.eql([]);
      const keys = Program_getAllProgramExercises(Program_evaluate({ ...program, planner: result }, settings)).map(
        (e) => e.key
      );
      // Both exercises survive: the swapped one carries a generated label to stay distinct.
      expect(keys.filter((k) => k.endsWith("frontsquat_barbell")).length).to.eql(2);
      expect(keys).to.not.include("squat_barbell");
    });
  });
});

describe("ProgramExerciseSwap.workoutRemap", () => {
  // Week 1 Day 1 is day 1, Week 1 Day 2 is day 2 — the workout below is on day 1.
  const { program } = PlannerTestUtils_get(`# Week 1
## Day 1
Front Squat / 3x5 100lb

## Day 2
Front Squat / 2x5 80lb
`);
  const exercises = Program_getAllProgramExercises(Program_evaluate(program, settings));
  // Before the swap the workout's day held Squat; after it holds Front Squat instead.
  const { program: original } = PlannerTestUtils_get(`# Week 1
## Day 1
Squat / 3x5 100lb

## Day 2
Squat / 2x5 80lb
`);
  const before = Program_getAllProgramExercises(Program_evaluate(original, settings));
  const onWorkoutDay = exercises.filter((e) => e.dayData.day === 1);
  const onOtherDay = exercises.filter((e) => e.dayData.day === 2);
  const progress = buildProgress([buildEntry("squat_barbell")]);

  it("carries the workout over when the swap landed on the day being worked out", () => {
    expect(
      ProgramExerciseSwap_workoutRemap(progress, "p", before, onWorkoutDay, "squat_barbell", "frontsquat_barbell")
    ).to.eql({ oldKey: "squat_barbell", newKey: "frontsquat_barbell", needsConfirmation: false });
  });

  it("leaves the workout alone when the swap only changed another day", () => {
    expect(
      ProgramExerciseSwap_workoutRemap(progress, "p", before, onOtherDay, "squat_barbell", "frontsquat_barbell")
    ).to.eql(undefined);
  });

  it("ignores a workout that belongs to a different program", () => {
    expect(
      ProgramExerciseSwap_workoutRemap(progress, "other", before, onWorkoutDay, "squat_barbell", "frontsquat_barbell")
    ).to.eql(undefined);
  });

  it("does nothing when nothing changed, or when there is no workout", () => {
    expect(ProgramExerciseSwap_workoutRemap(progress, "p", before, onWorkoutDay, "squat_barbell", undefined)).to.eql(
      undefined
    );
    expect(
      ProgramExerciseSwap_workoutRemap(progress, "p", before, onWorkoutDay, "squat_barbell", "squat_barbell")
    ).to.eql(undefined);
    expect(
      ProgramExerciseSwap_workoutRemap(undefined, "p", before, onWorkoutDay, "squat_barbell", "frontsquat_barbell")
    ).to.eql(undefined);
  });

  it("does nothing when no entry follows this program exercise", () => {
    const unrelated = buildProgress([buildEntry("benchpress_barbell")]);
    const handSwapped = buildProgress([buildEntry("squat_barbell", { changed: true })]);
    expect(
      ProgramExerciseSwap_workoutRemap(unrelated, "p", before, onWorkoutDay, "squat_barbell", "frontsquat_barbell")
    ).to.eql(undefined);
    expect(
      ProgramExerciseSwap_workoutRemap(handSwapped, "p", before, onWorkoutDay, "squat_barbell", "frontsquat_barbell")
    ).to.eql(undefined);
  });

  // Reported in review: the new exercise may have been on the workout's day all along, so
  // "is newKey here?" is not evidence that this workout's exercise was the one swapped.
  it("leaves the workout alone when the new exercise was already on that day", () => {
    const withNeighbour = `# Week 1
## Day 1
Squat / 3x5 100lb
Front Squat / 3x5 80lb

## Day 2
Squat / 3x5 100lb
`;
    const { program: neighbourProgram } = PlannerTestUtils_get(withNeighbour);
    const evaluated = Program_evaluate(neighbourProgram, settings);
    const day2 = Program_getAllProgramExercises(evaluated).find(
      (e) => e.key === "squat_barbell" && e.dayData.dayInWeek === 2
    )!;
    const swap = detect("Front Squat / 3x5 100lb", day2)!;
    const applied = ProgramExerciseSwap_apply(neighbourProgram.planner!, swap, "one", day2.dayData, settings) as {
      planner: IPlannerProgram;
    };
    const after = Program_getAllProgramExercises(
      Program_evaluate({ ...neighbourProgram, planner: applied.planner }, settings)
    );
    // Day 1 still has its own Squat, untouched — the workout must keep following it.
    const workout = buildProgress([buildEntry("squat_barbell"), buildEntry("frontsquat_barbell")]);
    expect(
      ProgramExerciseSwap_workoutRemap(
        workout,
        "p",
        Program_getAllProgramExercises(evaluated),
        after,
        "squat_barbell",
        "frontsquat_barbell"
      )
    ).to.eql(undefined);
  });

  it("asks first when sets are already logged", () => {
    const logged = buildProgress([
      buildEntry("squat_barbell", {
        sets: [
          {
            vtype: "set",
            id: "set-1",
            index: 0,
            reps: 5,
            completedReps: 5,
            isCompleted: true,
            weight: { value: 100, unit: "lb" },
            originalWeight: { value: 100, unit: "lb" },
            isUnilateral: false,
          },
        ],
      }),
    ]);
    expect(
      ProgramExerciseSwap_workoutRemap(logged, "p", before, onWorkoutDay, "squat_barbell", "frontsquat_barbell")
        ?.needsConfirmation
    ).to.eql(true);
  });
});

describe("Progress program exercise keys", () => {
  it("carries the ongoing workout over to the new key", () => {
    const progress = buildProgress([buildEntry("squat_barbell"), buildEntry("benchpress_barbell")]);
    const result = Progress_remapProgramExerciseId(progress, "squat_barbell", "frontsquat_barbell");
    expect(result.entries.map((e) => e.programExerciseId)).to.eql(["frontsquat_barbell", "benchpress_barbell"]);
  });

  it("leaves entries the user already swapped by hand alone", () => {
    const progress = buildProgress([buildEntry("squat_barbell", { changed: true })]);
    const result = Progress_remapProgramExerciseId(progress, "squat_barbell", "frontsquat_barbell");
    expect(result.entries[0].programExerciseId).to.eql("squat_barbell");
  });

  it("reports logged sets, so the swap can be confirmed instead of assumed", () => {
    const untouched = buildProgress([buildEntry("squat_barbell")]);
    expect(Progress_hasCompletedSetsForProgramExerciseId(untouched, "squat_barbell")).to.eql(false);
    const logged = buildProgress([
      buildEntry("squat_barbell", {
        sets: [
          {
            vtype: "set",
            id: "set-1",
            index: 0,
            reps: 5,
            completedReps: 5,
            isCompleted: true,
            weight: { value: 100, unit: "lb" },
            originalWeight: { value: 100, unit: "lb" },
            isUnilateral: false,
          },
        ],
      }),
    ]);
    expect(Progress_hasCompletedSetsForProgramExerciseId(logged, "squat_barbell")).to.eql(true);
  });
});
