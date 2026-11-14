import "mocha";
import { expect } from "chai";
import { FriendRecord_project } from "../src/models/friendRecord";
import { LiftohistorySerializer_serialize } from "../src/liftohistory/liftohistorySerializer";
import { Settings_build } from "../src/models/settings";
import { emptyProgramId } from "../src/models/program";
import { FriendsFixtures_entry, FriendsFixtures_record, FriendsFixtures_set } from "./friendsFixtures";

const date = "2026-11-10T10:00:00.000Z";

function privateRecord(): ReturnType<typeof FriendsFixtures_record> {
  return FriendsFixtures_record(1000, date, {
    programId: "secret-program-id",
    notes: "slept badly",
    changes: ["order"],
    userPromptedStateVars: { "bench|barbell": { rm1: { value: 200, unit: "lb" } } },
    entries: [
      FriendsFixtures_entry({
        notes: "left shoulder hurt",
        programExerciseId: "secret-exercise",
        state: { weight: { value: 100, unit: "lb" } },
        vars: { rm1: { value: 200, unit: "lb" } },
        updatePrintLines: ["private debug line"],
        descriptionSnapshot: "private description",
        warmupSets: [FriendsFixtures_set(0, { completedReps: 10, completedWeight: { value: 45, unit: "lb" } })],
      }),
    ],
  });
}

describe("FriendRecord_project", () => {
  it("serializes a record full of private fields like a minimal one", () => {
    const settings = Settings_build();
    const projected = FriendRecord_project(privateRecord(), { notes: false });
    const minimal = FriendsFixtures_record(1000, date, {
      programId: "friend",
      entries: [
        FriendsFixtures_entry({
          warmupSets: [FriendsFixtures_set(0, { completedReps: 10, completedWeight: { value: 45, unit: "lb" } })],
        }),
      ],
    });
    expect(LiftohistorySerializer_serialize(projected, settings)).to.equal(
      LiftohistorySerializer_serialize(minimal, settings)
    );
  });

  it("drops private fields and the owner's program id", () => {
    const projected = FriendRecord_project(privateRecord(), { notes: false });
    expect(projected.programId).to.equal("friend");
    expect(projected.changes).to.equal(undefined);
    expect(projected.userPromptedStateVars).to.equal(undefined);
    const entry = projected.entries[0];
    expect(entry.programExerciseId).to.equal(undefined);
    expect(entry.state).to.equal(undefined);
    expect(entry.vars).to.equal(undefined);
    expect(entry.updatePrintLines).to.equal(undefined);
    expect(entry.descriptionSnapshot).to.equal(undefined);
  });

  it("keeps notes only with the notes permission", () => {
    const hidden = LiftohistorySerializer_serialize(
      FriendRecord_project(privateRecord(), { notes: false }),
      Settings_build()
    );
    const shown = LiftohistorySerializer_serialize(
      FriendRecord_project(privateRecord(), { notes: true }),
      Settings_build()
    );
    expect(hidden).to.not.contain("slept badly");
    expect(hidden).to.not.contain("left shoulder hurt");
    expect(shown).to.contain("// slept badly");
    expect(shown).to.contain("// left shoulder hurt");
  });

  it("keeps an ad hoc workout ad hoc", () => {
    const record = FriendsFixtures_record(1000, date, { programId: emptyProgramId });
    expect(FriendRecord_project(record, { notes: false }).programId).to.equal(emptyProgramId);
  });
});
