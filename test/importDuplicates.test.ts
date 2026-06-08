import "mocha";
import { expect } from "chai";
import { ImportUtils_findDuplicates, ImportUtils_summarize } from "../src/utils/importTypes";
import { ICustomExercise, IHistoryRecord } from "../src/types";

function buildRecord(id: number, startTime: number): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(startTime).toISOString(),
    programId: "emptyprogram",
    programName: "Adhoc",
    day: 1,
    dayName: "Workout",
    entries: [],
    startTime,
    id,
  };
}

const t = new Date(2026, 2, 1, 10, 0, 0).getTime();

describe("ImportUtils_findDuplicates", () => {
  it("flags exact startTime matches", () => {
    const duplicates = ImportUtils_findDuplicates([buildRecord(1, t)], [buildRecord(100, t)]);
    expect(Array.from(duplicates)).to.eql([1]);
  });

  it("flags near matches within 60 seconds", () => {
    const duplicates = ImportUtils_findDuplicates(
      [buildRecord(1, t + 30 * 1000), buildRecord(2, t - 59 * 1000)],
      [buildRecord(100, t)]
    );
    expect(Array.from(duplicates).sort()).to.eql([1, 2]);
  });

  it("does not flag distinct workouts", () => {
    const duplicates = ImportUtils_findDuplicates(
      [buildRecord(1, t + 2 * 60 * 1000), buildRecord(2, t - 24 * 60 * 60 * 1000)],
      [buildRecord(100, t)]
    );
    expect(duplicates.size).to.equal(0);
  });

  it("handles empty existing history", () => {
    const duplicates = ImportUtils_findDuplicates([buildRecord(1, t)], []);
    expect(duplicates.size).to.equal(0);
  });

  it("finds duplicates across a larger sorted set", () => {
    const existing = Array.from({ length: 50 }, (_, i) => buildRecord(1000 + i, t + i * 60 * 60 * 1000));
    const duplicates = ImportUtils_findDuplicates(
      [buildRecord(1, t + 25 * 60 * 60 * 1000 + 10 * 1000), buildRecord(2, t + 25.5 * 60 * 60 * 1000)],
      existing
    );
    expect(Array.from(duplicates)).to.eql([1]);
  });
});

describe("ImportUtils_summarize", () => {
  function buildCustomExercise(id: string, name: string): ICustomExercise {
    return {
      vtype: "custom_exercise",
      id,
      name,
      isDeleted: false,
      meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [] },
    };
  }

  it("computes counts, date range, custom names, and duplicates", () => {
    const summary = ImportUtils_summarize(
      {
        historyRecords: [buildRecord(1, t), buildRecord(2, t + 24 * 60 * 60 * 1000), buildRecord(3, t - 1000)],
        customExercises: { b: buildCustomExercise("b", "Bravo"), a: buildCustomExercise("a", "Alpha") },
        errors: [],
        warnings: [],
      },
      [buildRecord(100, t)]
    );
    expect(summary.workoutCount).to.equal(3);
    expect(summary.minStartTime).to.equal(t - 1000);
    expect(summary.maxStartTime).to.equal(t + 24 * 60 * 60 * 1000);
    expect(summary.customExerciseNames).to.eql(["Alpha", "Bravo"]);
    expect(Array.from(summary.duplicateIds).sort()).to.eql([1, 3]);
  });

  it("handles an empty result", () => {
    const summary = ImportUtils_summarize({ historyRecords: [], customExercises: {}, errors: [], warnings: [] }, []);
    expect(summary.workoutCount).to.equal(0);
    expect(summary.minStartTime).to.equal(undefined);
    expect(summary.customExerciseNames).to.eql([]);
    expect(summary.duplicateIds.size).to.equal(0);
  });
});
