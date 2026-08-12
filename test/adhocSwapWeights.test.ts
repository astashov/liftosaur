import "mocha";
import { expect } from "chai";
import { Progress_updateSetWeights, Progress_programWarmupsForExerciseType } from "../src/models/progress";
import { History_findLastEntryForExerciseType } from "../src/models/history";
import { Program_evaluate } from "../src/models/program";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { Exercise_toKey } from "../src/models/exercise";
import { IExerciseType, IHistoryEntry, IHistoryRecord, ISet, ISettings, IWeight } from "../src/types";
import { UidFactory_generateUid } from "../src/utils/generator";

const legPress: IExerciseType = { id: "legPress", equipment: "leverageMachine" };
const lateralRaise: IExerciseType = { id: "lateralRaise", equipment: "dumbbell" };

function lb(value: number): IWeight {
  return { value, unit: "lb" };
}

function targetSet(args: Partial<ISet>): ISet {
  return {
    vtype: "set",
    id: UidFactory_generateUid(6),
    index: 0,
    reps: 12,
    weight: lb(500),
    originalWeight: lb(500),
    isCompleted: false,
    ...args,
  };
}

function completedSet(reps: number, weight: IWeight, rpe?: number): ISet {
  return {
    vtype: "set",
    id: UidFactory_generateUid(6),
    index: 0,
    reps,
    weight,
    originalWeight: weight,
    rpe,
    isCompleted: true,
    completedReps: reps,
    completedWeight: weight,
    completedRpe: rpe,
  };
}

function entry(exercise: IExerciseType, sets: ISet[], warmupSets: ISet[] = []): IHistoryEntry {
  return {
    vtype: "history_entry",
    index: 0,
    id: UidFactory_generateUid(6),
    exercise,
    sets,
    warmupSets,
  };
}

function record(id: number, time: number, entries: IHistoryEntry[]): IHistoryRecord {
  return {
    vtype: "history_record",
    id,
    date: new Date(time).toISOString(),
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Day 1",
    startTime: time,
    endTime: time,
    entries,
  };
}

function withRm1(settings: ISettings, exercise: IExerciseType, rm1: IWeight): ISettings {
  return {
    ...settings,
    exerciseData: { ...settings.exerciseData, [Exercise_toKey(exercise)]: { rm1 } },
  };
}

describe("ad-hoc swap weights", () => {
  const settings = Settings_build();

  describe("with history for the new exercise", () => {
    it("returns the historical weight untouched when reps and RPE match", () => {
      const prev = entry(lateralRaise, [completedSet(12, lb(25), 8)]);
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 12, rpe: 8 })]),
        lateralRaise,
        settings,
        prev
      );
      expect(swapped.sets[0].weight).to.deep.equal(lb(25));
    });

    it("returns the historical weight when neither the program nor the history carries an RPE", () => {
      const prev = entry(lateralRaise, [completedSet(12, lb(25))]);
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 12, rpe: undefined })]),
        lateralRaise,
        settings,
        prev
      );
      expect(swapped.sets[0].weight).to.deep.equal(lb(25));
    });

    it("scales up when the target asks for fewer reps than the history", () => {
      const prev = entry(lateralRaise, [completedSet(12, lb(25))]);
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 5, rpe: undefined })]),
        lateralRaise,
        settings,
        prev
      );
      expect(swapped.sets[0].weight!.value).to.be.greaterThan(25);
    });

    it("scales down when the target asks for more reps than the history", () => {
      const prev = entry(lateralRaise, [completedSet(5, lb(40))]);
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 15, rpe: undefined })]),
        lateralRaise,
        settings,
        prev
      );
      expect(swapped.sets[0].weight!.value).to.be.lessThan(40);
    });

    it("reads the set closest in reps rather than the heaviest one", () => {
      const prev = entry(lateralRaise, [completedSet(5, lb(50)), completedSet(12, lb(25))]);
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 12, rpe: undefined })]),
        lateralRaise,
        settings,
        prev
      );
      expect(swapped.sets[0].weight).to.deep.equal(lb(25));
    });

    it("ignores sets that were never completed", () => {
      const prev = entry(lateralRaise, [
        { ...completedSet(12, lb(25)), isCompleted: false, completedWeight: undefined, completedReps: undefined },
      ]);
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 12, rpe: undefined })]),
        lateralRaise,
        withRm1(settings, lateralRaise, lb(100)),
        prev
      );
      expect(swapped.sets[0].weight).to.not.deep.equal(lb(25));
    });

    it("uses what was actually performed, not what was targeted", () => {
      const performed: ISet = {
        ...completedSet(12, lb(25)),
        weight: lb(25),
        completedWeight: lb(40),
        completedReps: 12,
      };
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 12, rpe: undefined })]),
        lateralRaise,
        settings,
        entry(lateralRaise, [performed])
      );
      expect(swapped.sets[0].weight).to.deep.equal(lb(40));
    });
  });

  describe("without history for the new exercise", () => {
    it("derives from an explicit 1RM when one is set", () => {
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 1, rpe: 10 })]),
        lateralRaise,
        withRm1(settings, lateralRaise, lb(50)),
        undefined
      );
      expect(swapped.sets[0].weight).to.deep.equal(lb(50));
    });

    it("falls back to the exercise's starting weight", () => {
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 1, rpe: 10 })]),
        lateralRaise,
        settings,
        undefined
      );
      expect(swapped.sets[0].weight).to.deep.equal(lb(15));
    });

    it("never leaves the old exercise's weight behind", () => {
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 12, rpe: undefined })]),
        lateralRaise,
        settings,
        undefined
      );
      expect(swapped.sets[0].weight!.value).to.be.lessThan(50);
    });
  });

  describe("what it leaves alone", () => {
    it("keeps completed sets", () => {
      const done = completedSet(12, lb(500));
      const swapped = Progress_updateSetWeights(entry(legPress, [done]), lateralRaise, settings, undefined);
      expect(swapped.sets[0].weight).to.deep.equal(lb(500));
      expect(swapped.sets[0].originalWeight).to.deep.equal(lb(500));
    });

    it("still evaluates percentage sets against the new exercise's 1RM", () => {
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 12, originalWeight: { value: 50, unit: "%" } })]),
        lateralRaise,
        withRm1(settings, lateralRaise, lb(50)),
        entry(lateralRaise, [completedSet(12, lb(25))])
      );
      expect(swapped.sets[0].weight).to.deep.equal(lb(25));
      expect(swapped.sets[0].originalWeight).to.deep.equal({ value: 50, unit: "%" });
    });

    it("still infers RPE-based sets from the new exercise's 1RM", () => {
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 1, rpe: 10, originalWeight: undefined })]),
        lateralRaise,
        withRm1(settings, lateralRaise, lb(50)),
        undefined
      );
      expect(swapped.sets[0].weight).to.deep.equal(lb(50));
      expect(swapped.sets[0].originalWeight).to.equal(undefined);
    });
  });

  describe("target display", () => {
    it("keeps originalWeight equal to weight so the rounding strikethrough stays off", () => {
      const prev = entry(lateralRaise, [completedSet(11, lb(23))]);
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 12, rpe: undefined })]),
        lateralRaise,
        settings,
        prev
      );
      expect(swapped.sets[0].originalWeight).to.deep.equal(swapped.sets[0].weight);
    });
  });

  describe("warmups", () => {
    it("rebuilds them from the new exercise's scheme", () => {
      const swapped = Progress_updateSetWeights(
        entry(
          legPress,
          [targetSet({ reps: 12, rpe: undefined })],
          [completedSet(10, lb(200))].map((s) => ({
            ...s,
            isCompleted: false,
            completedWeight: undefined,
            completedReps: undefined,
          }))
        ),
        lateralRaise,
        settings,
        entry(lateralRaise, [completedSet(12, lb(25))])
      );
      expect(swapped.warmupSets.every((s) => (s.weight?.value ?? 0) < 200)).to.equal(true);
    });

    it("leaves them alone once one has been completed", () => {
      const warmup = completedSet(10, lb(200));
      const swapped = Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 12, rpe: undefined })], [warmup]),
        lateralRaise,
        settings,
        entry(lateralRaise, [completedSet(12, lb(25))])
      );
      expect(swapped.warmupSets).to.deep.equal([warmup]);
    });
  });

  describe("program-authored warmups for the swapped-in exercise", () => {
    function programWarmups(text: string, exercise: IExerciseType): ISet[] {
      const { program } = PlannerTestUtils_get(text);
      const evaluated = Program_evaluate(program, settings);
      return Progress_updateSetWeights(
        entry(legPress, [targetSet({ reps: 12, rpe: undefined })]),
        exercise,
        settings,
        entry(exercise, [completedSet(12, lb(25))]),
        Progress_programWarmupsForExerciseType(evaluated, exercise, settings)
      ).warmupSets;
    }

    it("uses the program's warmups when it defines the swapped-in exercise", () => {
      const sets = programWarmups(
        "# Week 1\n## Day 1\nLeg Press, Leverage Machine / 3x12 / 500lb\nLateral Raise, Dumbbell / 3x12 / 25lb / warmup: 1x10 40%, 1x5 60%\n",
        lateralRaise
      );
      expect(sets.map((s) => s.reps)).to.eql([10, 5]);
      expect(sets.map((s) => s.weight)).to.eql([lb(10), lb(15)]);
    });

    it("honors an explicit `warmup: none` rather than falling back to the default", () => {
      const sets = programWarmups("# Week 1\n## Day 1\nSquat, Barbell / 3x5 / 225lb / warmup: none\n", {
        id: "squat",
        equipment: "barbell",
      });
      expect(sets).to.eql([]);
    });

    it("falls back to the exercise's default scheme when the program doesn't define it", () => {
      const sets = programWarmups("# Week 1\n## Day 1\nBench Press, Barbell / 3x5 / 135lb\n", lateralRaise);
      expect(sets.length).to.equal(1);
    });
  });

  describe("History_findLastEntryForExerciseType", () => {
    const history = [
      record(3, 300, [entry(lateralRaise, [completedSet(12, lb(30))])]),
      record(1, 100, [entry(lateralRaise, [completedSet(12, lb(20))])]),
      record(2, 200, [entry(lateralRaise, [completedSet(12, lb(25))])]),
    ];

    it("finds the most recent entry regardless of history order", () => {
      const found = History_findLastEntryForExerciseType(history, lateralRaise);
      expect(found?.sets[0].weight).to.deep.equal(lb(30));
    });

    it("skips the record being edited so a past workout can't seed from itself", () => {
      const found = History_findLastEntryForExerciseType(history, lateralRaise, 3);
      expect(found?.sets[0].weight).to.deep.equal(lb(25));
    });

    it("matches on equipment too", () => {
      const found = History_findLastEntryForExerciseType(history, { id: "lateralRaise", equipment: "cable" });
      expect(found).to.equal(undefined);
    });

    it("returns nothing when the exercise was never done", () => {
      expect(History_findLastEntryForExerciseType(history, legPress)).to.equal(undefined);
    });
  });
});
