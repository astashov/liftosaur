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
