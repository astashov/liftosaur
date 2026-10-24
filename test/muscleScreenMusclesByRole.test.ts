import "mocha";
import { expect } from "chai";
import { Muscle_getMuscleGroupName, Muscle_screenMusclesByRole } from "../src/models/muscle";
import { Settings_build } from "../src/models/settings";

describe("Muscle_screenMusclesByRole", () => {
  it("counts a curl set once for biceps even though its synergists are in the same group", () => {
    const { screenTargetMuscles, screenSynergistMuscles } = Muscle_screenMusclesByRole(
      { id: "bicepCurl", equipment: "dumbbell" },
      Settings_build()
    );
    expect(screenTargetMuscles).to.deep.equal(["biceps"]);
    expect(screenSynergistMuscles).to.deep.equal([]);
  });

  it("keeps synergist groups that hold no target muscle", () => {
    const { screenTargetMuscles, screenSynergistMuscles } = Muscle_screenMusclesByRole(
      { id: "benchPress", equipment: "barbell" },
      Settings_build()
    );
    expect(screenTargetMuscles).to.include("chest");
    expect(screenSynergistMuscles).to.include("triceps");
    expect(screenSynergistMuscles).to.not.include("chest");
  });
});

describe("Muscle_getMuscleGroupName", () => {
  it("names a built-in group", () => {
    expect(Muscle_getMuscleGroupName("sideDelts", Settings_build())).to.equal("Side Delts");
  });

  it("names a kept legacy custom group by its key", () => {
    const settings = Settings_build();
    settings.muscleGroups.data.shoulders = { muscles: ["Deltoid Lateral"] };
    expect(Muscle_getMuscleGroupName("shoulders", settings)).to.equal("Shoulders");
  });
});
