import "mocha";
import { expect } from "chai";
import { ISet } from "../src/types";
import { Settings_build } from "../src/models/settings";
import { WorkoutSetPlates_line } from "../src/utils/workoutSetPlates";

function set(weight: number | undefined, completedWeight?: number): ISet {
  return {
    vtype: "set",
    id: "s1",
    index: 0,
    reps: 5,
    isCompleted: completedWeight != null,
    weight: weight != null ? { value: weight, unit: "lb" } : undefined,
    completedWeight: completedWeight != null ? { value: completedWeight, unit: "lb" } : undefined,
  };
}

describe("WorkoutSetPlates", () => {
  const settings = Settings_build();

  it("formats one side for a barbell exercise and flags an exact match", () => {
    expect(WorkoutSetPlates_line(set(135), settings, { id: "squat", equipment: "barbell" })).to.eql({
      plates: "45",
      sidePlates: [{ value: 45, unit: "lb" }],
      isMatch: true,
    });
  });

  it("prefers the completed weight and flags a weight the plates cannot reach", () => {
    const line = WorkoutSetPlates_line(set(135, 137), settings, { id: "squat", equipment: "barbell" });
    expect(line?.isMatch).to.eql(false);
  });

  it("returns nothing without a weight, without equipment, or when the bar alone is enough", () => {
    expect(WorkoutSetPlates_line(set(undefined), settings, { id: "squat", equipment: "barbell" })).to.eql(undefined);
    expect(WorkoutSetPlates_line(set(135), settings, { id: "pushUp", equipment: "bodyweight" })).to.eql(undefined);
    expect(WorkoutSetPlates_line(set(45), settings, { id: "squat", equipment: "barbell" })).to.eql(undefined);
  });
});
