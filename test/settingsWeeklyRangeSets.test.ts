import "mocha";
import { expect } from "chai";
import { lb } from "lens-shmens";
import { Settings_build } from "../src/models/settings";
import {
  MuscleGroupSettings_setAllBound,
  MuscleGroupSettings_setAllFrequency,
  MuscleGroupSettings_summary,
  MuscleGroupSettings_withBound,
} from "../src/models/muscleGroupSettings";
import {
  MuscleRangePresets_apply,
  MuscleRangePresets_current,
  MuscleRangePresets_frequency,
} from "../src/models/muscleRangePresets";
import { Muscle_getAvailableMuscleGroups } from "../src/models/muscle";
import { ISettings, IScreenMuscle } from "../src/types";

describe("MuscleGroupSettings_withBound", () => {
  it("changes min and keeps max", () => {
    expect(MuscleGroupSettings_withBound([10, 12], "min", 5)).to.deep.equal([5, 12]);
  });

  it("changes max and keeps min", () => {
    expect(MuscleGroupSettings_withBound([10, 12], "max", 20)).to.deep.equal([10, 20]);
  });

  it("builds a sane range for a muscle group that has none", () => {
    expect(MuscleGroupSettings_withBound(undefined, "min", 8)).to.deep.equal([8, 8]);
    expect(MuscleGroupSettings_withBound(undefined, "max", 10)).to.deep.equal([0, 10]);
  });

  it("writes through the lens for a custom muscle group without a range", () => {
    const customMuscleGroup: IScreenMuscle = "custom-neck";
    const settings = Settings_build();
    expect(settings.planner.weeklyRangeSets[customMuscleGroup]).to.equal(undefined);

    const result = lb<ISettings>()
      .p("planner")
      .p("weeklyRangeSets")
      .p(customMuscleGroup)
      .recordModify((range) => MuscleGroupSettings_withBound(range, "max", 10))
      .fn(settings);

    expect(result.planner.weeklyRangeSets[customMuscleGroup]).to.deep.equal([0, 10]);
  });
});

describe("MuscleGroupSettings bulk edits", () => {
  const settings = Settings_build();
  const groups = Muscle_getAvailableMuscleGroups(settings);

  it("changes only ranged groups and keeps the legacy keys old builds read", () => {
    const ranges = MuscleGroupSettings_setAllBound(settings.planner, groups, "min", 7);
    expect(ranges.chest).to.deep.equal([7, 18]);
    expect(ranges.neck).to.equal(undefined);
    expect(ranges.shoulders).to.deep.equal([10, 12]);
  });

  it("sets frequency only on ranged groups", () => {
    const frequency = MuscleGroupSettings_setAllFrequency(settings.planner, groups, 4);
    expect(frequency.abs).to.equal(4);
    expect(frequency.neck).to.equal(undefined);
    expect(frequency.back).to.equal(2);
  });

  it("summarizes listed ranged groups and ignores legacy keys", () => {
    expect(MuscleGroupSettings_summary(settings.planner, groups)).to.deep.equal({ min: 10, max: 18, frequency: 2 });
  });
});

describe("MuscleRangePresets", () => {
  it("derives frequency from the per-session limit with a floor of 2", () => {
    expect(MuscleRangePresets_frequency(10)).to.equal(2);
    expect(MuscleRangePresets_frequency(18)).to.equal(2);
    expect(MuscleRangePresets_frequency(30)).to.equal(3);
  });

  it("writes the 13 ranged groups and keeps a hand-set neck range", () => {
    const planner = { ...Settings_build().planner };
    planner.weeklyRangeSets = { ...planner.weeklyRangeSets, neck: [2, 4] };
    const result = MuscleRangePresets_apply(planner, "high");
    expect(result.weeklyRangeSets.sideDelts).to.deep.equal([18, 30]);
    expect(result.weeklyFrequency.sideDelts).to.equal(3);
    expect(result.weeklyRangeSets.neck).to.deep.equal([2, 4]);
    expect(MuscleRangePresets_current(result)).to.equal("high");
  });

  it("starts new accounts on Moderate", () => {
    expect(MuscleRangePresets_current(Settings_build().planner)).to.equal("moderate");
  });
});
