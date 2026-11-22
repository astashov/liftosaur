import "mocha";
import { expect } from "chai";
import { RestTimer_forSet } from "../src/models/restTimer";
import { Settings_build } from "../src/models/settings";
import { ISet, ISettings } from "../src/types";

function settingsWithTimers(timers: Partial<ISettings["timers"]>): ISettings {
  const settings = Settings_build();
  return { ...settings, timers: { ...settings.timers, ...timers } };
}

const set: ISet = { vtype: "set", id: "a", index: 0, reps: 5, isUnilateral: false };

describe("RestTimer_forSet", () => {
  it("uses a warmup set's own timer", () => {
    expect(RestTimer_forSet({ ...set, timer: 30 }, "warmup", false, settingsWithTimers({ warmup: 90 }))).to.equal(30);
  });

  it("falls back to the global warmup timer", () => {
    expect(RestTimer_forSet(set, "warmup", false, settingsWithTimers({ warmup: 90 }))).to.equal(90);
  });

  it("keeps an explicit 0, which means no rest", () => {
    expect(RestTimer_forSet({ ...set, timer: 0 }, "warmup", false, settingsWithTimers({ warmup: 90 }))).to.equal(0);
  });

  it("does not use the superset timer for warmups", () => {
    expect(RestTimer_forSet(set, "warmup", true, settingsWithTimers({ warmup: 90, superset: 20 }))).to.equal(90);
  });

  it("uses the superset timer for a working set in a superset", () => {
    expect(RestTimer_forSet(set, "workout", true, settingsWithTimers({ workout: 180, superset: 20 }))).to.equal(20);
  });

  it("prefers a working set's own timer over the superset timer", () => {
    expect(RestTimer_forSet({ ...set, timer: 120 }, "workout", true, settingsWithTimers({ superset: 20 }))).to.equal(
      120
    );
  });

  it("returns undefined when nothing is set", () => {
    expect(RestTimer_forSet(set, "warmup", false, settingsWithTimers({ warmup: null }))).to.equal(undefined);
  });
});
