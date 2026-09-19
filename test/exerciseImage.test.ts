import "mocha";
import { expect } from "chai";
import {
  ExerciseImageUtils_motionUrl,
  ExerciseImageUtils_existsMotion,
  ExerciseImageUtils_videoAspectRatio,
} from "../src/models/exerciseImage";
import { ICustomExercise, IExerciseType, ISettings } from "../src/types";

function customExercise(id: string, videoUrl?: string): ICustomExercise {
  return {
    vtype: "custom_exercise",
    id: id as ICustomExercise["id"],
    name: "My Exercise",
    isDeleted: false,
    meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [] },
    smallImageUrl: `https://www.liftosaur.com/userimages/small-${id}.png`,
    largeImageUrl: `https://www.liftosaur.com/userimages/large-${id}.png`,
    ...(videoUrl !== undefined ? { videoUrl } : {}),
  };
}

function settingsWith(exercise: ICustomExercise): ISettings {
  return { exercises: { [exercise.id]: exercise } } as unknown as ISettings;
}

describe("ExerciseImageUtils motion", () => {
  it("returns the videoUrl for a custom exercise with one", () => {
    const ex = customExercise("myvideo", "https://www.liftosaur.com/userimages/myvideo.mp4");
    const type: IExerciseType = { id: ex.id, equipment: "barbell" };
    expect(ExerciseImageUtils_motionUrl(type, settingsWith(ex))).to.equal(
      "https://www.liftosaur.com/userimages/myvideo.mp4"
    );
  });

  it("returns undefined for a custom exercise without a video", () => {
    const ex = customExercise("no-video");
    const type: IExerciseType = { id: ex.id, equipment: "barbell" };
    expect(ExerciseImageUtils_motionUrl(type, settingsWith(ex))).to.be.undefined;
  });

  it("returns undefined for a built-in exercise", () => {
    const ex = customExercise("somecustom", "https://www.liftosaur.com/userimages/somecustom.mp4");
    const type: IExerciseType = { id: "benchpress", equipment: "barbell" };
    expect(ExerciseImageUtils_motionUrl(type, settingsWith(ex))).to.be.undefined;
  });

  it("existsMotion is true only when videoUrl is set", () => {
    const withVideo = customExercise("mylunge", "https://www.liftosaur.com/userimages/mylunge.mp4");
    const without = customExercise("mycurl");
    expect(ExerciseImageUtils_existsMotion({ id: withVideo.id, equipment: "bodyweight" }, settingsWith(withVideo))).to
      .be.true;
    expect(ExerciseImageUtils_existsMotion({ id: without.id, equipment: "bodyweight" }, settingsWith(without))).to.be
      .false;
  });
});

describe("ExerciseImageUtils videoAspectRatio", () => {
  it("keeps a landscape ratio", () => {
    expect(ExerciseImageUtils_videoAspectRatio(1280, 720)).to.equal(1280 / 720);
  });

  it("keeps a square ratio", () => {
    expect(ExerciseImageUtils_videoAspectRatio(600, 600)).to.equal(1);
  });

  it("clamps a portrait ratio to 3/4", () => {
    expect(ExerciseImageUtils_videoAspectRatio(592, 1280)).to.equal(0.75);
  });

  it("falls back to 3/4 when the size is unknown", () => {
    expect(ExerciseImageUtils_videoAspectRatio(0, 0)).to.equal(0.75);
  });
});
