import "mocha";
import { expect } from "chai";
import { FriendProjection_settings } from "../src/models/friendProjection";
import { Settings_build } from "../src/models/settings";
import { Follow_defaultPermissions } from "../src/models/follow";

function ownerSettings(): ReturnType<typeof Settings_build> {
  return {
    ...Settings_build("kg"),
    nickname: "Sam",
    theme: "dark",
    appleHealthAnchor: "anchor-secret",
    starredExercises: { squat: true },
    exerciseData: { squat_barbell: { rm1: { value: 180, unit: "kg" }, notes: "SECRET knee" } },
  };
}

describe("FriendProjection_settings", () => {
  it("hides exercise notes without the notes permission and keeps 1RMs", () => {
    const projected = FriendProjection_settings(ownerSettings(), Follow_defaultPermissions);
    expect(projected.exerciseData.squat_barbell?.rm1?.value).to.equal(180);
    expect(projected.exerciseData.squat_barbell?.notes).to.equal(undefined);
    expect(JSON.stringify(projected)).to.not.contain("SECRET");
  });

  it("shows exercise notes with the notes permission", () => {
    const projected = FriendProjection_settings(ownerSettings(), { ...Follow_defaultPermissions, notes: true });
    expect(projected.exerciseData.squat_barbell?.notes).to.equal("SECRET knee");
  });

  it("replaces private fields with defaults and keeps public ones", () => {
    const projected = FriendProjection_settings(ownerSettings(), Follow_defaultPermissions);
    expect(projected.units).to.equal("kg");
    expect(projected.nickname).to.equal("Sam");
    expect(projected.theme).to.equal(undefined);
    expect(projected.appleHealthAnchor).to.equal(undefined);
    expect(projected.starredExercises).to.equal(undefined);
    expect(projected.gyms).to.deep.equal(Settings_build("kg").gyms);
  });

  it("drops stored fields the map does not know", () => {
    const stored = { ...ownerSettings(), legacySecret: "SECRET" };
    const projected = FriendProjection_settings(stored, Follow_defaultPermissions);
    expect(JSON.stringify(projected)).to.not.contain("SECRET");
  });
});
