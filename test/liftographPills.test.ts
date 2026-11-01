import "mocha";
import { expect } from "chai";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { LiftographPills_apply, LiftographPills_forCaret } from "../src/liftograph/liftographPills";

function labelsAt(text: string, caret: number = text.length): string[] {
  return LiftographPills_forCaret(LiftographDocument_parse(text), text, caret).map((p) => p.label);
}

describe("LiftographPills", () => {
  it("offers widgets on an empty line", () => {
    expect(labelsAt("")).to.eql(["graph {", "value", "row {", "// text"]);
  });

  it("offers sources after source:", () => {
    expect(labelsAt("value / source: ")).to.eql(["exercise(", "workout", "stats(weight)"]);
  });

  it("offers the presets of the line's source after y:", () => {
    expect(labelsAt("value / source: workout / y: ")).to.eql(["volume", "duration", "muscleSets(", "muscleVolume("]);
    expect(labelsAt("value / source: exercise(Squat) / y: ")).to.eql(["e1rm", "maxWeight", "volume", "maxReps"]);
  });

  it("offers script names inside a script", () => {
    const text = "value / source: exercise(Squat) {~  ~}";
    expect(labelsAt(text, text.indexOf("~}") - 1)).to.include("point(");
  });

  it("offers the keys a series line does not have yet", () => {
    expect(labelsAt("value / name: A / source: workout")).to.eql(["y:", "group:", "smooth:", "mark:", "axis:"]);
  });

  it("inserts at the caret without doubling the space", () => {
    expect(LiftographPills_apply("value ", 6, { label: "y:", insert: " / y: " })).to.eql({
      from: 6,
      to: 6,
      insert: "/ y: ",
      caret: 11,
    });
  });
});
