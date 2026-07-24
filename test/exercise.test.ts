import "mocha";
import { expect } from "chai";
import {
  Exercise_all,
  Exercise_allExpanded,
  Exercise_searchNames,
  Exercise_filterCustomExercises,
  Exercise_filterCustomExercisesByType,
  Exercise_findById,
  Exercise_findIdByName,
  Exercise_findByNameAndEquipment,
} from "../src/models/exercise";
import { IAllCustomExercises, ICustomExercise } from "../src/types";

function buildCustom(id: string, name: string, isDeleted: boolean): ICustomExercise {
  return {
    vtype: "custom_exercise",
    id: id as ICustomExercise["id"],
    name,
    isDeleted,
    meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [] },
  };
}

describe("Exercise — deleted custom exercises", () => {
  const customExercises: IAllCustomExercises = {
    "custom-active": buildCustom("custom-active", "Active Curl", false),
    "custom-deleted": buildCustom("custom-deleted", "Deleted Curl", true),
  };

  it("Exercise_all excludes deleted custom exercises", () => {
    const names = Exercise_all(customExercises).map((e) => e.name);
    expect(names).to.include("Active Curl");
    expect(names).to.not.include("Deleted Curl");
  });

  it("Exercise_allExpanded excludes deleted custom exercises", () => {
    const names = Exercise_allExpanded(customExercises).map((e) => e.name);
    expect(names).to.include("Active Curl");
    expect(names).to.not.include("Deleted Curl");
  });

  it("Exercise_searchNames excludes deleted custom exercises", () => {
    expect(Exercise_searchNames("Active Curl", customExercises)).to.include("Active Curl");
    expect(Exercise_searchNames("Deleted Curl", customExercises)).to.not.include("Deleted Curl");
  });

  it("Exercise_filterCustomExercises excludes deleted", () => {
    const filtered = Exercise_filterCustomExercises(customExercises, "Curl");
    expect(filtered["custom-active"]).to.exist;
    expect(filtered["custom-deleted"]).to.not.exist;
  });

  it("Exercise_filterCustomExercisesByType excludes deleted", () => {
    const settings = { exercises: customExercises } as Parameters<typeof Exercise_filterCustomExercisesByType>[1];
    const filtered = Exercise_filterCustomExercisesByType([], settings);
    expect(filtered["custom-deleted"]).to.not.exist;
  });

  it("name/id resolution still finds deleted custom exercises (history/import path)", () => {
    expect(Exercise_findIdByName("Deleted Curl", customExercises)).to.eql("custom-deleted");
    expect(Exercise_findById("custom-deleted" as ICustomExercise["id"], customExercises)?.name).to.eql("Deleted Curl");
  });
});

describe("Exercise — custom exercise wins over built-in on name collision", () => {
  const customExercises: IAllCustomExercises = {
    "custom-squat": buildCustom("custom-squat", "Squat", false),
  };

  it("Exercise_findIdByName prefers the custom exercise when the name matches a built-in", () => {
    expect(Exercise_findIdByName("Squat", customExercises)).to.eql("custom-squat");
  });

  it("Exercise_findIdByName resolves to the built-in when there is no colliding custom exercise", () => {
    expect(Exercise_findIdByName("Squat", {})).to.eql("squat");
  });

  it("Exercise_findByNameAndEquipment prefers the custom exercise (with and without equipment)", () => {
    expect(Exercise_findByNameAndEquipment("Squat", customExercises)?.id).to.eql("custom-squat");
    expect(Exercise_findByNameAndEquipment("Squat, Barbell", customExercises)?.id).to.eql("custom-squat");
  });

  it("Exercise_findByNameAndEquipment falls back to the built-in when no custom collides", () => {
    expect(Exercise_findByNameAndEquipment("Squat", {})?.id).to.eql("squat");
  });
});
