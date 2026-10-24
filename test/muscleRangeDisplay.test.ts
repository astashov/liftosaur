import "mocha";
import { expect } from "chai";
import {
  MuscleRangeDisplay_frequencyColor,
  MuscleRangeDisplay_intensity,
  MuscleRangeDisplay_status,
  MuscleRangeDisplay_weekIntensities,
} from "../src/models/muscleRangeDisplay";
import { Settings_build } from "../src/models/settings";

describe("MuscleRangeDisplay", () => {
  it("shows a plain count for a group with no range", () => {
    expect(MuscleRangeDisplay_status(14, undefined)).to.deep.equal({ colorClass: "", direction: "" });
    expect(MuscleRangeDisplay_frequencyColor(1, undefined)).to.equal("");
  });

  it("colors a ranged group", () => {
    expect(MuscleRangeDisplay_status(12, [10, 18])).to.deep.equal({ colorClass: "text-text-success", direction: "" });
    expect(MuscleRangeDisplay_status(8, [10, 18])).to.deep.equal({ colorClass: "text-icon-yellow", direction: "↑" });
    expect(MuscleRangeDisplay_status(40, [10, 18])).to.deep.equal({ colorClass: "text-text-error", direction: "↓" });
  });

  it("never divides by zero", () => {
    expect(MuscleRangeDisplay_intensity(0, undefined, 0)).to.equal(0);
    expect(MuscleRangeDisplay_intensity(5, [0, 0], 0)).to.equal(0);
    expect(MuscleRangeDisplay_intensity(5, [0, 0], 10)).to.equal(0.5);
  });

  it("scales an unranged group like the ranged groups, so a few sets do not look like the most work", () => {
    const planner = Settings_build().planner;
    const intensities = MuscleRangeDisplay_weekIntensities(
      { chest: { strength: 3, hypertrophy: 6 }, upperTraps: { strength: 0, hypertrophy: 3 } },
      {},
      planner
    ).groups;
    expect(intensities.chest).to.equal(0.5);
    expect(intensities.upperTraps).to.equal(3 / 18);
  });

  it("falls back to the largest count when no group on screen has a range", () => {
    const planner = { ...Settings_build().planner, weeklyRangeSets: {} };
    const intensities = MuscleRangeDisplay_weekIntensities(
      { neck: { strength: 0, hypertrophy: 4 }, upperTraps: { strength: 0, hypertrophy: 2 } },
      {},
      planner
    ).groups;
    expect(intensities.neck).to.equal(1);
    expect(intensities.upperTraps).to.equal(0.5);
  });
});
