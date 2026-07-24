import "mocha";
import { expect } from "chai";
import { Exercise_getVolumeMultiplier } from "../src/models/exercise";
import { History_totalEntryWeight } from "../src/models/history";
import { Settings_build } from "../src/models/settings";
import { UidFactory_generateUid } from "../src/utils/generator";
import { IExerciseType, IHistoryEntry, ISet, ISettings } from "../src/types";

function buildSet(value: number, reps: number): ISet {
  return {
    vtype: "set",
    id: UidFactory_generateUid(6),
    index: 0,
    reps,
    weight: { value, unit: "lb" },
    originalWeight: { value, unit: "lb" },
    isUnilateral: false,
    isCompleted: true,
    completedReps: reps,
    completedWeight: { value, unit: "lb" },
  };
}

function buildEntry(exercise: IExerciseType, sets: ISet[]): IHistoryEntry {
  return {
    vtype: "history_entry",
    index: 0,
    id: UidFactory_generateUid(6),
    exercise,
    sets,
    warmupSets: [],
  };
}

describe("Exercise_getVolumeMultiplier", () => {
  const settings = Settings_build();

  it("is 1 for a barbell exercise even if it's in the two-dumbbell list", () => {
    expect(Exercise_getVolumeMultiplier({ id: "benchPress", equipment: "barbell" }, settings)).to.eql(1);
  });

  it("is 2 for a two-dumbbell exercise with dumbbell equipment", () => {
    expect(Exercise_getVolumeMultiplier({ id: "shoulderPress", equipment: "dumbbell" }, settings)).to.eql(2);
    expect(Exercise_getVolumeMultiplier({ id: "benchPress", equipment: "dumbbell" }, settings)).to.eql(2);
  });

  it("is 1 for a single-implement dumbbell exercise", () => {
    expect(Exercise_getVolumeMultiplier({ id: "gobletSquat", equipment: "dumbbell" }, settings)).to.eql(1);
  });

  it("is 1 for a single-implement (alternating) dumbbell curl", () => {
    expect(Exercise_getVolumeMultiplier({ id: "bicepCurl", equipment: "dumbbell" }, settings)).to.eql(1);
  });

  it("is 2 for a unilateral two-dumbbell exercise (both dumbbells loaded through the rep)", () => {
    expect(Exercise_getVolumeMultiplier({ id: "lunge", equipment: "dumbbell" }, settings)).to.eql(2);
    expect(Exercise_getVolumeMultiplier({ id: "bulgarianSplitSquat", equipment: "dumbbell" }, settings)).to.eql(2);
  });

  it("is 1 for a single-implement unilateral exercise", () => {
    expect(Exercise_getVolumeMultiplier({ id: "bentOverOneArmRow", equipment: "dumbbell" }, settings)).to.eql(1);
  });

  it("lets a user override win over the default", () => {
    const overridden: ISettings = {
      ...settings,
      exerciseData: { gobletSquat_dumbbell: { volumeMultiplier: 2 } },
    };
    expect(Exercise_getVolumeMultiplier({ id: "gobletSquat", equipment: "dumbbell" }, overridden)).to.eql(2);
  });

  it("lets a user override apply even to a unilateral exercise (multiplier is orthogonal)", () => {
    const overridden: ISettings = {
      ...settings,
      exerciseData: { bentOverOneArmRow_dumbbell: { volumeMultiplier: 2 } },
    };
    expect(Exercise_getVolumeMultiplier({ id: "bentOverOneArmRow", equipment: "dumbbell" }, overridden)).to.eql(2);
  });
});

describe("History_totalEntryWeight with volume multiplier", () => {
  const settings = Settings_build();

  it("doubles the total weight for a two-dumbbell exercise", () => {
    const entry = buildEntry({ id: "shoulderPress", equipment: "dumbbell" }, [buildSet(30, 10)]);
    expect(History_totalEntryWeight(entry, settings).value).to.eql(600);
  });

  it("does not double a barbell exercise", () => {
    const entry = buildEntry({ id: "shoulderPress", equipment: "barbell" }, [buildSet(30, 10)]);
    expect(History_totalEntryWeight(entry, settings).value).to.eql(300);
  });

  it("stacks the multiplier on top of unilateral left+right summing for a dumbbell lunge", () => {
    const set: ISet = { ...buildSet(30, 10), isUnilateral: true, completedRepsLeft: 10 };
    const entry = buildEntry({ id: "lunge", equipment: "dumbbell" }, [set]);
    // 30 * (10 left + 10 right) * 2 dumbbells
    expect(History_totalEntryWeight(entry, settings).value).to.eql(1200);
  });
});
