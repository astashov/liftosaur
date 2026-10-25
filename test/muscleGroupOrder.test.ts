import "mocha";
import { expect } from "chai";
import { MuscleGroupOrder_sections } from "../src/models/muscleGroupOrder";
import { Settings_build } from "../src/models/settings";
import { ISetSplit } from "../src/pages/planner/models/types";

function split(sets: number): ISetSplit {
  return { strength: 0, hypertrophy: sets, exercises: [], frequency: {} };
}

function names(sections: ReturnType<typeof MuscleGroupOrder_sections>): string[][] {
  return sections.map((rows) => rows.map((row) => row.muscleGroup));
}

describe("MuscleGroupOrder_sections", () => {
  it("lists every group by region, including the ones with no sets", () => {
    const sections = MuscleGroupOrder_sections({ calves: split(4), chest: split(9) }, Settings_build());
    expect(names(sections)).to.deep.equal([
      ["chest", "frontDelts", "sideDelts", "triceps"],
      ["lats", "upperBack", "rearDelts", "biceps"],
      ["quadriceps", "hamstrings", "glutes", "calves"],
      ["abs", "obliques", "lowerBack"],
      [
        "upperTraps",
        "rotatorCuff",
        "forearmFlexors",
        "forearmExtensors",
        "hipFlexors",
        "abductors",
        "adductors",
        "neck",
      ],
    ]);
    expect(sections[0][0].split.hypertrophy).to.equal(9);
    expect(sections[0][1].split.strength + sections[0][1].split.hypertrophy).to.equal(0);
  });

  it("skips hidden groups and puts custom groups last", () => {
    const settings = Settings_build();
    settings.muscleGroups.data.biceps = { isHidden: true };
    settings.muscleGroups.data.grip = { name: "Grip", muscles: ["Wrist Flexors"] };
    const sections = MuscleGroupOrder_sections({ biceps: split(5) }, settings);
    expect(names(sections)[1]).to.deep.equal(["lats", "upperBack", "rearDelts"]);
    expect(names(sections)[names(sections).length - 1]).to.deep.equal(["grip"]);
  });
});
