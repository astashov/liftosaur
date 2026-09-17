import "mocha";
import { expect } from "chai";
import { lb } from "lens-shmens";
import { Settings_build, Settings_withWeeklyRangeSetsBound } from "../src/models/settings";
import { ISettings, IScreenMuscle } from "../src/types";

describe("Settings_withWeeklyRangeSetsBound", () => {
  it("changes min and keeps max", () => {
    expect(Settings_withWeeklyRangeSetsBound([10, 12], "min", 5)).to.deep.equal([5, 12]);
  });

  it("changes max and keeps min", () => {
    expect(Settings_withWeeklyRangeSetsBound([10, 12], "max", 20)).to.deep.equal([10, 20]);
  });

  it("builds a range for a muscle group that has none", () => {
    expect(Settings_withWeeklyRangeSetsBound(undefined, "min", 5)).to.deep.equal([5, 0]);
    expect(Settings_withWeeklyRangeSetsBound(undefined, "max", 10)).to.deep.equal([0, 10]);
  });

  it("writes through the lens for a custom muscle group without a range", () => {
    const customMuscleGroup: IScreenMuscle = "custom-neck";
    const settings = Settings_build();
    expect(settings.planner.weeklyRangeSets[customMuscleGroup]).to.equal(undefined);

    const result = lb<ISettings>()
      .p("planner")
      .p("weeklyRangeSets")
      .p(customMuscleGroup)
      .recordModify((range) => Settings_withWeeklyRangeSetsBound(range, "max", 10))
      .fn(settings);

    expect(result.planner.weeklyRangeSets[customMuscleGroup]).to.deep.equal([0, 10]);
  });
});
