import "mocha";
import { expect } from "chai";
import { HealthSyncIdConflict_isSupersededByWatch } from "../src/utils/healthSyncIdConflict";

describe("HealthSyncIdConflict_isSupersededByWatch", () => {
  it("matches the add-samples failure after HealthKit ignored the phone's workout", () => {
    const error = new Error("Workout with UUID 6F1D2C3B-0A9E-4E1F-9D7C-2B3A4C5D6E7F has not yet been saved");
    expect(HealthSyncIdConflict_isSupersededByWatch(error)).to.equal(true);
  });

  it("does not match an authorization error", () => {
    const error = new Error("Not authorized to share HKWorkoutTypeIdentifier");
    expect(HealthSyncIdConflict_isSupersededByWatch(error)).to.equal(false);
  });

  it("does not match a value that is not an error", () => {
    expect(HealthSyncIdConflict_isSupersededByWatch(undefined)).to.equal(false);
  });
});
