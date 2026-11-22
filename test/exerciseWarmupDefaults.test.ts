import "mocha";
import { expect } from "chai";
import {
  ExerciseWarmupDefaults_addSet,
  ExerciseWarmupDefaults_changeReps,
  ExerciseWarmupDefaults_changeThreshold,
  ExerciseWarmupDefaults_changeTimer,
  ExerciseWarmupDefaults_changeWeight,
  ExerciseWarmupDefaults_customize,
  ExerciseWarmupDefaults_get,
  ExerciseWarmupDefaults_removeSet,
  ExerciseWarmupDefaults_setText,
  ExerciseWarmupDefaults_thresholdLabel,
  ExerciseWarmupDefaults_weightInputValue,
  ExerciseWarmupDefaults_write,
} from "../src/models/exerciseWarmupDefaults";
import { Exercise_clearMuscleMultipliers } from "../src/models/exercise";
import { WarmupScheme_build } from "../src/models/warmupScheme";
import { Settings_build } from "../src/models/settings";
import { Weight_build, Weight_buildPct } from "../src/models/weight";
import { IExerciseType, IExerciseWarmupDefaultSet as IWarmupSchemeSet, ISettings } from "../src/types";

const squat: IExerciseType = { id: "squat", equipment: "barbell" };

function withWarmups(warmups: IWarmupSchemeSet[] | undefined): ISettings {
  const settings = Settings_build("lb");
  return { ...settings, exerciseData: ExerciseWarmupDefaults_write(settings.exerciseData, squat, warmups) };
}

describe("ExerciseWarmupDefaults", () => {
  it("reports built-in, custom and none", () => {
    const settings = Settings_build("lb");
    expect(ExerciseWarmupDefaults_get(squat, settings, undefined).state).to.equal("builtin");
    expect(ExerciseWarmupDefaults_get(squat, settings, [{ numberOfSets: 1, reps: 5 }]).state).to.equal("custom");
    expect(ExerciseWarmupDefaults_get(squat, settings, []).state).to.equal("none");
  });

  it("reads only the warmups it is given, so stale settings cannot bring back a custom scheme", () => {
    const stale = withWarmups([{ numberOfSets: 1, reps: 5, percentage: 50 }]);
    expect(ExerciseWarmupDefaults_get(squat, stale, undefined).state).to.equal("builtin");
  });

  it("splits a grouped set into one row per set", () => {
    const defaults = ExerciseWarmupDefaults_get(squat, Settings_build("lb"), [
      { numberOfSets: 3, reps: 5, percentage: 50 },
    ]);
    expect(defaults).to.eql({
      state: "custom",
      sets: [1, 2, 3].map(() => ({ numberOfSets: 1, reps: 5, percentage: 50 })),
    });
  });

  it("ignores an empty reps or weight input, and clears the rest time on an empty input", () => {
    const sets: IWarmupSchemeSet[] = [{ numberOfSets: 1, reps: 5, percentage: 50, timer: 60 }];
    expect(ExerciseWarmupDefaults_changeReps(sets, 0, undefined)).to.equal(undefined);
    expect(ExerciseWarmupDefaults_changeReps(sets, 0, NaN)).to.equal(undefined);
    expect(ExerciseWarmupDefaults_changeWeight(sets, 0, undefined)).to.equal(undefined);
    expect(ExerciseWarmupDefaults_changeTimer(sets, 0, NaN)).to.eql([{ numberOfSets: 1, reps: 5, percentage: 50 }]);
  });

  it("shows the percentage first in the weight input, as the workout uses it", () => {
    const set: IWarmupSchemeSet = { numberOfSets: 1, reps: 5, percentage: 80, weight: Weight_build(45, "lb") };
    expect(ExerciseWarmupDefaults_weightInputValue(set)).to.eql(Weight_buildPct(80));
    expect(ExerciseWarmupDefaults_weightInputValue({ numberOfSets: 1, reps: 5 })).to.equal(undefined);
  });

  it("customizes from the built-in scheme, one row per set, with its thresholds", () => {
    const sets = ExerciseWarmupDefaults_customize(squat, Settings_build("lb"));
    expect(sets).to.eql([
      { numberOfSets: 1, reps: 5, percentage: 30, threshold: Weight_build(120, "lb") },
      { numberOfSets: 1, reps: 5, percentage: 50, threshold: Weight_build(90, "lb") },
      { numberOfSets: 1, reps: 5, percentage: 80, threshold: Weight_build(45, "lb") },
    ]);
  });

  it("gives the same warmups after Customize as the built-in scheme, on light and heavy days", () => {
    const builtin = Settings_build("lb");
    const custom = withWarmups(ExerciseWarmupDefaults_customize(squat, builtin));
    for (const weight of [45, 95, 135, 225]) {
      const first = Weight_build(weight, "lb");
      const before = WarmupScheme_build(squat, first, builtin, undefined).map((s) => s.weight?.value);
      const after = WarmupScheme_build(squat, first, custom, undefined).map((s) => s.weight?.value);
      expect(after).to.eql(before);
    }
  });

  it("skips a default set when the first working set is at or below its threshold", () => {
    const settings = withWarmups([
      { numberOfSets: 1, reps: 5, percentage: 50, threshold: Weight_build(100, "lb") },
      { numberOfSets: 1, reps: 3, percentage: 80 },
    ]);
    const reps = (weight: number): (number | undefined)[] =>
      WarmupScheme_build(squat, Weight_build(weight, "lb"), settings, undefined).map((s) => s.reps);
    expect(reps(100)).to.eql([3]);
    expect(reps(105)).to.eql([5, 3]);
  });

  it("sets and clears a threshold, and ignores a percentage or zero", () => {
    const sets: IWarmupSchemeSet[] = [{ numberOfSets: 1, reps: 5, percentage: 50 }];
    const withThreshold = ExerciseWarmupDefaults_changeThreshold(sets, 0, Weight_build(95, "lb"));
    expect(withThreshold[0].threshold).to.eql(Weight_build(95, "lb"));
    expect(ExerciseWarmupDefaults_changeThreshold(withThreshold, 0, undefined)).to.eql(sets);
    expect(ExerciseWarmupDefaults_changeThreshold(withThreshold, 0, Weight_build(0, "lb"))).to.eql(sets);
    expect(ExerciseWarmupDefaults_changeThreshold(sets, 0, Weight_buildPct(50))).to.eql(sets);
  });

  it("prints a set as reps and its percentage or weight", () => {
    expect(ExerciseWarmupDefaults_setText({ numberOfSets: 1, reps: 5, percentage: 30 })).to.equal("5 × 30%");
    expect(ExerciseWarmupDefaults_setText({ numberOfSets: 1, reps: 3, weight: Weight_build(45, "lb") })).to.equal(
      "3 × 45lb"
    );
    expect(ExerciseWarmupDefaults_setText({ numberOfSets: 1, reps: 5 })).to.equal("5 reps");
  });

  it("labels each built-in set with its threshold", () => {
    const defaults = ExerciseWarmupDefaults_get(squat, Settings_build("lb"), undefined);
    const labels = defaults.state === "builtin" ? defaults.sets.map(ExerciseWarmupDefaults_thresholdLabel) : [];
    expect(labels).to.eql(["skip if first set ≤ 120lb", "skip if first set ≤ 90lb", "skip if first set ≤ 45lb"]);
    expect(ExerciseWarmupDefaults_thresholdLabel({ numberOfSets: 1, reps: 5, percentage: 50 })).to.equal(undefined);
  });

  it("adds a copy of the last set, or 1x5 50% when empty", () => {
    expect(ExerciseWarmupDefaults_addSet([])).to.eql([{ numberOfSets: 1, reps: 5, percentage: 50 }]);
    expect(ExerciseWarmupDefaults_addSet([{ numberOfSets: 1, reps: 3, percentage: 80, timer: 60 }])).to.eql([
      { numberOfSets: 1, reps: 3, percentage: 80, timer: 60 },
      { numberOfSets: 1, reps: 3, percentage: 80, timer: 60 },
    ]);
  });

  it("edits reps, weight, rest and removes a set", () => {
    let sets: IWarmupSchemeSet[] = [
      { numberOfSets: 1, reps: 5, percentage: 50 },
      { numberOfSets: 1, reps: 3, percentage: 80 },
    ];
    sets = ExerciseWarmupDefaults_changeReps(sets, 0, 8) ?? sets;
    sets = ExerciseWarmupDefaults_changeWeight(sets, 1, Weight_build(135, "lb")) ?? sets;
    sets = ExerciseWarmupDefaults_changeTimer(sets, 1, 90);
    expect(sets).to.eql([
      { numberOfSets: 1, reps: 8, percentage: 50 },
      { numberOfSets: 1, reps: 3, weight: Weight_build(135, "lb"), timer: 90 },
    ]);
    sets = ExerciseWarmupDefaults_changeWeight(sets, 1, Weight_buildPct(70)) ?? sets;
    sets = ExerciseWarmupDefaults_changeTimer(sets, 1, undefined);
    expect(sets[1]).to.eql({ numberOfSets: 1, reps: 3, percentage: 70 });
    expect(ExerciseWarmupDefaults_removeSet(sets, 0)).to.eql([sets[1]]);
  });

  it("writes and clears the field without touching other fields", () => {
    const settings = Settings_build("lb");
    const withNotes = { ...settings.exerciseData, squat_barbell: { notes: "depth" } };
    const written = ExerciseWarmupDefaults_write(withNotes, squat, []);
    expect(written.squat_barbell).to.eql({ notes: "depth", warmups: [] });
    expect(ExerciseWarmupDefaults_write(written, squat, undefined).squat_barbell).to.eql({ notes: "depth" });
    expect(ExerciseWarmupDefaults_write({ squat_barbell: { warmups: [] } }, squat, undefined)).to.eql({});
  });

  it("is used for warmups when the program has none, without the built-in thresholds", () => {
    const settings = withWarmups([{ numberOfSets: 1, reps: 5, percentage: 100 }]);
    expect(WarmupScheme_build(squat, Weight_build(45, "lb"), settings, undefined).map((s) => s.weight?.value)).to.eql([
      45,
    ]);
    expect(WarmupScheme_build(squat, Weight_build(200, "lb"), withWarmups([]), undefined)).to.eql([]);
  });

  it("loses to a program's warmup: none", () => {
    const settings = withWarmups([{ numberOfSets: 1, reps: 5, percentage: 50 }]);
    expect(WarmupScheme_build(squat, Weight_build(200, "lb"), settings, [])).to.eql([]);
  });

  it("loses to the program's own warmups", () => {
    const settings = withWarmups([]);
    const sets = WarmupScheme_build(squat, Weight_build(200, "lb"), settings, [
      { numberOfSets: 1, reps: 5, percentage: 50 },
    ]);
    expect(sets.map((s) => s.weight?.value)).to.eql([100]);
  });
});

describe("Exercise_clearMuscleMultipliers", () => {
  it("keeps the exercise's other fields, including default warmups", () => {
    const data = { squat_barbell: { muscleMultipliers: { quads: 1 }, warmups: [] } };
    expect(Exercise_clearMuscleMultipliers(data, squat)).to.eql({ squat_barbell: { warmups: [] } });
  });

  it("drops the entry when nothing else is left", () => {
    expect(Exercise_clearMuscleMultipliers({ squat_barbell: { muscleMultipliers: { quads: 1 } } }, squat)).to.eql({});
  });
});
