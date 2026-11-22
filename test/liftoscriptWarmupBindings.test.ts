import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import {
  Program_evaluate,
  Program_getProgramDay,
  Program_getProgramDayUsedExercises,
  Program_nextHistoryRecord,
  Program_runAllFinishDayScripts,
} from "../src/models/program";
import { Progress_getDayData, Progress_runUpdateScriptForEntry } from "../src/models/progress";
import { PlannerEvaluator_getFullEvaluatedWeeks } from "../src/pages/planner/plannerEvaluator";
import { PlannerProgram_generateFullText } from "../src/pages/planner/models/plannerProgram";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord, ISet, ISettings } from "../src/types";

function settingsWithRm1(): ISettings {
  const settings = Settings_build("lb");
  return { ...settings, exerciseData: { ...settings.exerciseData, squat_barbell: { rm1: Weight_build(300, "lb") } } };
}

function oneDay(body: string): string {
  return `# Week 1\n## Day 1\n${body}`;
}

function start(text: string, day: number = 1): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Program_nextHistoryRecord(program, settingsWithRm1(), Stats_getEmpty(), day);
}

function warmups(sets: ISet[]): string[] {
  return sets.map((s) => `${s.reps}x${s.weight?.value ?? "-"}${s.timer != null ? `/${s.timer}s` : ""}`);
}

function errorOf(text: string): string {
  const { evaluatedWeeks } = PlannerEvaluator_getFullEvaluatedWeeks(text, settingsWithRm1());
  return evaluatedWeeks.success ? "" : evaluatedWeeks.error.message;
}

describe("Liftoscript warmup bindings", function () {
  this.timeout(5000);

  it("sets a warmup to a percentage of 1RM, and the rebuild keeps it", () => {
    const record = start(
      oneDay(`Squat / 3x5 200lb / warmup: 1x5 30%, 1x3 60%, 1x1 80% / update: custom() {~
  if (setIndex == 0) {
    weights = 210lb
    warmupWeights[3] = 90%
  }
~}`)
    );
    expect(warmups(record.entries[0].warmupSets)).to.eql(["5x60", "3x120", "1x270"]);
  });

  it("changes warmup reps and rest times", () => {
    const record = start(
      oneDay(`Squat / 3x5 200lb / warmup: 1x5 50%, 1x3 80% / update: custom() {~
  if (setIndex == 0) {
    warmupReps += 2
    warmupTimers[2] = 90
  }
~}`)
    );
    expect(warmups(record.entries[0].warmupSets)).to.eql(["7x100", "5x160/90s"]);
  });

  it("drops warmups in a deload week", () => {
    const text = `# Week 1
## Day 1
Squat / 3x5 200lb / warmup: 1x5 50% / update: custom() {~
  if (setIndex == 0 && week == 2) {
    numberOfWarmupSets = 0
  }
~}

# Week 2
## Day 1
Squat / 3x5 150lb
`;
    expect(warmups(start(text, 1).entries[0].warmupSets)).to.eql(["5x100"]);
    expect(start(text, 2).entries[0].warmupSets).to.eql([]);
  });

  it("adds warmup sets by copying the last one", () => {
    const record = start(
      oneDay(`Squat / 3x5 200lb / warmup: 1x5 50% / update: custom() {~
  if (setIndex == 0) {
    numberOfWarmupSets = 3
  }
~}`)
    );
    expect(warmups(record.entries[0].warmupSets)).to.eql(["5x100", "5x100", "5x100"]);
  });

  describe("with a completed warmup", () => {
    const text = oneDay(`Squat / 3x5 200lb / warmup: 1x5 50%, 1x3 80% / update: custom() {~
  if (setIndex == 1) {
    warmupWeights = 45lb
    numberOfWarmupSets = 0
  }
~}`);

    function completeFirstWarmupAndSet(): IHistoryRecord {
      const settings = settingsWithRm1();
      const { program } = PlannerTestUtils_get(text);
      const evaluated = Program_evaluate(program, settings);
      const record = Program_nextHistoryRecord(program, settings, Stats_getEmpty());
      const entry = record.entries[0];
      const done = {
        ...entry,
        warmupSets: entry.warmupSets.map((s, i) => (i === 0 ? { ...s, isCompleted: true, completedReps: 5 } : s)),
        sets: entry.sets.map((s, i) => (i === 0 ? { ...s, isCompleted: true, completedReps: 5 } : s)),
      };
      const programExercise = Program_getProgramDayUsedExercises(Program_getProgramDay(evaluated, 1)!)[0];
      const updated = Progress_runUpdateScriptForEntry(
        done,
        Progress_getDayData(record),
        programExercise,
        evaluated.states,
        0,
        settings,
        Stats_getEmpty()
      );
      return { ...record, entries: [updated] };
    }

    it("never rewrites or removes it", () => {
      const record = completeFirstWarmupAndSet();
      expect(warmups(record.entries[0].warmupSets)).to.eql(["5x100"]);
      expect(record.entries[0].warmupSets[0].isCompleted).to.equal(true);
    });
  });

  it("lets a progress script read finished warmups", () => {
    const settings = settingsWithRm1();
    const { program } = PlannerTestUtils_get(
      oneDay(
        "Squat / 3x5 200lb / warmup: 1x5 50%, 1x3 80% / progress: custom(seen: 0) {~ state.seen = completedNumberOfWarmupSets ~}"
      )
    );
    const record = Program_nextHistoryRecord(program, settings, Stats_getEmpty());
    const entry = record.entries[0];
    const done = (s: ISet): ISet => ({ ...s, isCompleted: true, completedReps: s.reps, completedWeight: s.weight });
    const finished = {
      ...record,
      entries: [{ ...entry, warmupSets: entry.warmupSets.map(done), sets: entry.sets.map(done) }],
    };
    const { program: newProgram } = Program_runAllFinishDayScripts(program, finished, Stats_getEmpty(), settings);
    expect(PlannerProgram_generateFullText(newProgram.planner!.weeks)).to.contain("custom(seen: 2)");
  });

  it("rejects warmup writes in a progress script, with = and +=", () => {
    expect(errorOf(oneDay("Squat / 3x5 200lb / progress: custom() {~ warmupWeights[1] = 100lb ~}"))).to.contain(
      "can only be changed in update scripts"
    );
    expect(errorOf(oneDay("Squat / 3x5 200lb / progress: custom() {~ warmupReps += 1 ~}"))).to.contain(
      "can only be changed in update scripts"
    );
  });
});
