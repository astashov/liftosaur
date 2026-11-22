import "mocha";
import { expect } from "chai";
import { Program_evaluate, Program_nextHistoryRecord } from "../src/models/program";
import { ProgramToPlanner } from "../src/models/programToPlanner";
import { PlannerProgram_generateFullText } from "../src/pages/planner/models/plannerProgram";
import { PlannerEvaluator_getFullEvaluatedWeeks } from "../src/pages/planner/plannerEvaluator";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { Weight_build } from "../src/models/weight";
import { Reps_displayWeight } from "../src/models/set";
import { Exercise_toKey } from "../src/models/exercise";
import { Progress_applyProgramDay, Progress_runInitialUpdateScripts } from "../src/models/progress";
import { LiftohistorySerializer_serialize } from "../src/liftohistory/liftohistorySerializer";
import { PlannerProgramExercise_createExerciseFromEntry } from "../src/pages/planner/models/plannerProgramExercise";
import { IHistoryRecord, ISet, ISettings } from "../src/types";

function firstRecord(text: string, settings: ISettings): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Program_nextHistoryRecord(program, settings, Stats_getEmpty());
}

function weights(sets: ISet[]): string[] {
  return sets.map((s) => (s.weight ? `${s.weight.value}${s.weight.unit}` : "none"));
}

function oneDay(body: string): string {
  return `# Week 1\n## Day 1\n${body}`;
}

function conflictMessage(text: string): string {
  const { evaluatedWeeks } = PlannerEvaluator_getFullEvaluatedWeeks(text, Settings_build());
  return evaluatedWeeks.success ? "" : evaluatedWeeks.error.message;
}

function week1Day1AndWeek2Day2(a: string, b: string): string {
  return `# Week 1\n## Day 1\nSquat / 3x5 100lb / ${a}\n\n# Week 2\n## Day 1\n## Day 2\nSquat / 3x5 100lb / ${b}\n`;
}

describe("Warmup regressions", function () {
  this.timeout(5000);

  it("a 0% warmup on a 20kg barbell is the empty bar, whatever the reps", () => {
    const settings = Settings_build("kg");
    const six = firstRecord(oneDay("Squat / 1x5 100kg / warmup: 1x6 0%"), settings).entries[0].warmupSets;
    const two = firstRecord(oneDay("Squat / 1x5 100kg / warmup: 1x2 0%"), settings).entries[0].warmupSets;
    expect(weights(six)).to.eql(["20kg"]);
    expect(weights(two)).to.eql(["20kg"]);
  });

  it("a warmup over 100% is not capped at the working weight", () => {
    const settings = Settings_build("kg");
    const warmups = firstRecord(oneDay("Squat / 1x5 100kg / warmup: 1x1 120%"), settings).entries[0].warmupSets;
    expect(weights(warmups)).to.eql(["120kg"]);
  });

  it("warmup 2x10 50% survives a round trip", () => {
    const { program } = PlannerTestUtils_get(oneDay("Squat / 3x5 200lb / warmup: 2x10 50%"));
    const settings = Settings_build();
    const text = PlannerProgram_generateFullText(
      new ProgramToPlanner(Program_evaluate(program, settings), settings).convertToPlanner().weeks
    );
    expect(text).to.contain("warmup: 2x10 50%");
  });

  it("a fixed-weight warmup appears on RPE and % sets with no 1RM", () => {
    const settings = Settings_build("kg");
    const rpe = firstRecord(oneDay("Bench Press / 3x5 @8 / warmup: 1x5 40kg"), settings).entries[0];
    const pct = firstRecord(oneDay("Bench Press / 3x5 75% / warmup: 1x5 40kg"), settings).entries[0];
    expect(weights(rpe.warmupSets)).to.eql(["40kg"]);
    expect(weights(pct.warmupSets)).to.eql(["40kg"]);
  });

  it("an edited warmup set serializes without an @0 RPE tag", () => {
    const settings = Settings_build();
    const record = firstRecord(oneDay("Squat / 3x5 200lb"), settings);
    const entry = record.entries[0];
    const done = (s: ISet): ISet => ({ ...s, completedReps: s.reps, completedWeight: s.weight, isCompleted: true });
    const warmupSets = entry.warmupSets.map((s, i) =>
      i === 0 ? { ...s, completedReps: 8, completedWeight: Weight_build(50, "lb"), isCompleted: true } : done(s)
    );
    const text = LiftohistorySerializer_serialize(
      { ...record, endTime: record.startTime + 1000, entries: [{ ...entry, warmupSets, sets: entry.sets.map(done) }] },
      settings
    );
    expect(text).to.not.contain("@0");
  });

  it("a program made from history keeps each warmup's rest time", () => {
    const settings = Settings_build();
    const entry = firstRecord(
      oneDay("Squat / 3x5 200lb / warmup: 1x5 100lb 30s, 1x5 100lb 90s, 1x5 100lb 0s"),
      settings
    ).entries[0];
    const exercise = PlannerProgramExercise_createExerciseFromEntry(
      entry,
      { week: 1, dayInWeek: 1, day: 1 },
      settings,
      0
    );
    expect(exercise.warmupSets?.map((s) => [s.numberOfSets, s.timer])).to.eql([
      [1, 30],
      [1, 90],
      [1, 0],
    ]);
  });

  describe("conflict messages name the real week and day of the first location", () => {
    it("update", () => {
      const msg = conflictMessage(
        week1Day1AndWeek2Day2("update: custom() {~ weights += 5lb ~}", "update: custom() {~ weights += 10lb ~}")
      );
      expect(msg).to.contain("both in week 1, day 1 and week 2, day 2");
    });

    it("progress", () => {
      const msg = conflictMessage(week1Day1AndWeek2Day2("progress: lp(5lb)", "progress: lp(10lb)"));
      expect(msg).to.contain("both in week 1, day 1 and week 2, day 2");
    });

    it("id", () => {
      const msg = conflictMessage(week1Day1AndWeek2Day2("id: tags(1)", "id: tags(2)"));
      expect(msg).to.contain("both in week 1, day 1 and week 2, day 2");
    });
  });

  it("percentage warmups appear when update sets the first weight at workout start (#619)", () => {
    const squat = { id: "squat" as const, equipment: "barbell" as const };
    const base = Settings_build();
    const settings = {
      ...base,
      exerciseData: { ...base.exerciseData, [Exercise_toKey(squat)]: { rm1: Weight_build(400, "lb") } },
    };
    const text = oneDay(`tAscend: Squat Row / used: none / 2x5, 1x5 @5 / update: custom() {~
  if (setIndex == 0) {
    weights[1] = roundWeight(weights[ns] * 0.83)
    weights[2] = roundWeight(weights[ns] * 0.915)
  }
~}

Squat / 2x5, 1x5 @5 / warmup: 1x5 60%, 1x3 80%, 1x1 90% / update: custom() { ...tAscend: Squat Row }`);
    const entry = firstRecord(text, settings).entries.find((e) => e.exercise.id === "squat")!;
    expect(entry.sets[0].weight).to.not.equal(undefined);
    expect(entry.warmupSets.length).to.equal(3);
  });

  describe("program changes during a workout", () => {
    const before = oneDay("Squat / 3x5 200lb / warmup: 1x5 30%, 1x5 50%");

    function applyChange(record: IHistoryRecord, newText: string): IHistoryRecord {
      const settings = Settings_build();
      const { program } = PlannerTestUtils_get(newText);
      const evaluated = Program_evaluate(program, settings);
      const applied = Progress_applyProgramDay(record, evaluated, record.day, settings, {});
      return Progress_runInitialUpdateScripts(
        applied,
        undefined,
        record.day,
        evaluated,
        settings,
        Stats_getEmpty(),
        record
      );
    }

    it("rebuilds untouched warmups when the program changes the first working weight", () => {
      const record = firstRecord(before, Settings_build());
      const after = applyChange(record, oneDay("Squat / 3x5 100lb / warmup: 1x5 30%, 1x5 50%"));
      expect(weights(after.entries[0].warmupSets)).to.eql(["45lb", "50lb"]);
      expect(after.entries[0].warmupSets.map((s) => s.id)).to.eql(record.entries[0].warmupSets.map((s) => s.id));
    });

    it("keeps warmups once one of them is completed", () => {
      const record = firstRecord(before, Settings_build());
      const entry = record.entries[0];
      const started = {
        ...record,
        entries: [{ ...entry, warmupSets: entry.warmupSets.map((s, i) => ({ ...s, isCompleted: i === 0 })) }],
      };
      const after = applyChange(started, oneDay("Squat / 3x5 100lb / warmup: 1x5 30%, 1x5 50%"));
      expect(weights(after.entries[0].warmupSets)).to.eql(weights(entry.warmupSets));
    });
  });

  describe("Reps_displayWeight", () => {
    const set: ISet = { vtype: "set", id: "a", index: 0, reps: 5, weight: Weight_build(60, "kg"), isUnilateral: false };

    it("shows the edited weight when there is one", () => {
      expect(Reps_displayWeight({ ...set, completedWeight: Weight_build(65, "kg") })).to.eql(Weight_build(65, "kg"));
    });

    it("falls back to the planned weight", () => {
      expect(Reps_displayWeight(set)).to.eql(Weight_build(60, "kg"));
    });
  });
});
