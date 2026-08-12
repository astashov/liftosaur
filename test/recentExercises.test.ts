import "mocha";
import { expect } from "chai";
import { Settings_withRecentSwap, settingsRecentExercisesLimit } from "../src/models/settings";
import { IExerciseType, ISettings } from "../src/types";

const legPress: IExerciseType = { id: "legPress", equipment: "leverageMachine" };
const benchPress: IExerciseType = { id: "benchPress", equipment: "barbell" };
const hackSquat: IExerciseType = { id: "hackSquat", equipment: "leverageMachine" };
const bulgarianSplitSquat: IExerciseType = { id: "bulgarianSplitSquat", equipment: "dumbbell" };
const gobletSquat: IExerciseType = { id: "gobletSquat", equipment: "kettlebell" };

function swapAll(swaps: [IExerciseType, IExerciseType][]): ISettings["recentExercises"] {
  return swaps.reduce<ISettings["recentExercises"]>(
    (recent, [from, to]) => Settings_withRecentSwap(recent, from, to),
    undefined
  );
}

describe("recent exercise swaps", () => {
  it("records the first swap under the exercise being swapped away from", () => {
    const recent = Settings_withRecentSwap(undefined, legPress, hackSquat);
    expect(recent).to.eql({ legPress_leverageMachine: ["hackSquat_leverageMachine"] });
  });

  it("puts the most recent swap first", () => {
    const recent = swapAll([
      [legPress, hackSquat],
      [legPress, gobletSquat],
    ]);
    expect(recent?.legPress_leverageMachine).to.eql(["gobletSquat_kettlebell", "hackSquat_leverageMachine"]);
  });

  it("moves a repeated target to the front instead of duplicating it", () => {
    const recent = swapAll([
      [legPress, hackSquat],
      [legPress, gobletSquat],
      [legPress, hackSquat],
    ]);
    expect(recent?.legPress_leverageMachine).to.eql(["hackSquat_leverageMachine", "gobletSquat_kettlebell"]);
  });

  it("drops the oldest target once the limit is reached", () => {
    const targets: IExerciseType[] = [
      hackSquat,
      gobletSquat,
      bulgarianSplitSquat,
      { id: "frontSquat", equipment: "barbell" },
      { id: "splitSquat", equipment: "dumbbell" },
      { id: "stepUp", equipment: "dumbbell" },
    ];
    const recent = swapAll(targets.map((to): [IExerciseType, IExerciseType] => [legPress, to]));
    const keys = recent?.legPress_leverageMachine ?? [];
    expect(keys.length).to.equal(settingsRecentExercisesLimit);
    expect(keys[0]).to.equal("stepUp_dumbbell");
    expect(keys).to.not.include("hackSquat_leverageMachine");
  });

  it("keeps a separate list per exercise being swapped away from", () => {
    const recent = swapAll([
      [legPress, hackSquat],
      [benchPress, gobletSquat],
    ]);
    expect(recent).to.eql({
      legPress_leverageMachine: ["hackSquat_leverageMachine"],
      benchPress_barbell: ["gobletSquat_kettlebell"],
    });
  });

  it("treats equipment as part of the identity on both ends", () => {
    const recent = swapAll([
      [legPress, { id: "benchPress", equipment: "barbell" }],
      [
        { id: "legPress", equipment: "smith" },
        { id: "benchPress", equipment: "dumbbell" },
      ],
    ]);
    expect(recent).to.eql({
      legPress_leverageMachine: ["benchPress_barbell"],
      legPress_smith: ["benchPress_dumbbell"],
    });
  });

  it("never deletes a source key, so removals can't fail to sync", () => {
    const recent = swapAll([
      [legPress, hackSquat],
      [benchPress, gobletSquat],
      [legPress, bulgarianSplitSquat],
    ]);
    expect(Object.keys(recent ?? {}).sort()).to.eql(["benchPress_barbell", "legPress_leverageMachine"]);
  });
});
