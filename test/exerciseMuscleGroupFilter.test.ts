import "mocha";
import { expect } from "chai";
import {
  Exercise_filterExercisesByNameAndType,
  Exercise_filterExercisesByType,
  Exercise_targetMusclesGroups,
} from "../src/models/exercise";
import { Settings_build } from "../src/models/settings";

describe("Exercise_filterExercisesByType", () => {
  it("matches a muscle group by its display name", () => {
    const settings = Settings_build();
    const squat = { id: "squat", equipment: "barbell" } as const;
    expect(Exercise_filterExercisesByType([squat], ["Quads"], settings)).to.deep.equal([squat]);
    const row = { id: "bentOverRow", equipment: "barbell" } as const;
    expect(Exercise_filterExercisesByType([row], ["Upper Back"], settings)).to.deep.equal([row]);
  });

  it("matches a renamed group by its new name only", () => {
    const settings = Settings_build();
    settings.muscleGroups.data.quadriceps = { name: "Thighs" };
    const squat = { id: "squat", equipment: "barbell" } as const;
    expect(Exercise_filterExercisesByType([squat], ["Thighs"], settings)).to.deep.equal([squat]);
    expect(Exercise_filterExercisesByType([squat], ["Quads"], settings)).to.deep.equal([]);
  });

  it("puts exercises that target the filtered group first", () => {
    const settings = Settings_build();
    const exercises = Exercise_filterExercisesByNameAndType(settings, "", ["Quads"], false);
    expect(exercises.length).to.be.greaterThan(1);
    const targets = exercises.map((e) => Exercise_targetMusclesGroups(e, settings).includes("quadriceps"));
    expect(targets.indexOf(false)).to.not.equal(-1);
    expect(targets.slice(targets.indexOf(false))).to.not.include(true);
  });
});
