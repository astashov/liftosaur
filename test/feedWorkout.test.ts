import "mocha";
import { expect } from "chai";
import { FeedWorkout_fromRecord, FeedWorkout_key } from "../src/models/feedWorkout";
import { Settings_build } from "../src/models/settings";
import { FriendsFixtures_entry, FriendsFixtures_record } from "./friendsFixtures";

describe("FeedWorkout_fromRecord", () => {
  const settings = Settings_build();

  it("drops workout and exercise notes without the notes permission", () => {
    const record = FriendsFixtures_record(1000, "2026-11-10T10:00:00.000Z", {
      notes: "felt tired",
      entries: [FriendsFixtures_entry({ notes: "elbow hurts" })],
    });
    const workout = FeedWorkout_fromRecord(record, settings, "owner", { notes: false });
    expect(workout.notes).to.equal(undefined);
    expect(workout.exercises[0].notes).to.equal(undefined);
  });

  it("keeps notes with the notes permission", () => {
    const record = FriendsFixtures_record(1000, "2026-11-10T10:00:00.000Z", {
      notes: "felt tired",
      entries: [FriendsFixtures_entry({ notes: "elbow hurts" })],
    });
    const workout = FeedWorkout_fromRecord(record, settings, "owner", { notes: true });
    expect(workout.notes).to.equal("felt tired");
    expect(workout.exercises[0].notes).to.equal("elbow hurts");
  });

  it("never copies program state, vars or debug snapshots", () => {
    const record = FriendsFixtures_record(1000, "2026-11-10T10:00:00.000Z", {
      entries: [
        FriendsFixtures_entry({
          state: { weight: 5 },
          vars: { rm: 2 },
          descriptionSnapshot: "secret",
          updatePrintLines: ["x"],
        }),
      ],
      userPromptedStateVars: {},
      intervals: [[1000, 2000]],
    });
    const workout = FeedWorkout_fromRecord(record, settings, "owner", { notes: true });
    const json = JSON.stringify(workout);
    expect(json).to.not.contain("secret");
    expect(json).to.not.contain("vars");
    expect(json).to.not.contain("intervals");
    expect(Object.keys(workout.exercises[0]).sort()).to.eql(
      ["exerciseType", "imageUrl", "name", "notes", "sets", "superset"].sort()
    );
  });

  it("computes duration from intervals, so pauses are not counted", () => {
    const record = FriendsFixtures_record(1000, "2026-11-10T10:00:00.000Z", {
      startTime: 0,
      endTime: 100000,
      intervals: [
        [0, 10000],
        [50000, 60000],
      ],
    });
    const workout = FeedWorkout_fromRecord(record, settings, "owner", { notes: false });
    expect(workout.stats.durationMs).to.equal(20000);
  });

  it("resolves the exercise name with equipment from the owner's settings", () => {
    const record = FriendsFixtures_record(1000, "2026-11-10T10:00:00.000Z");
    const workout = FeedWorkout_fromRecord(record, settings, "owner", { notes: false });
    expect(workout.exercises[0].name).to.equal("Bench Press, Barbell");
    expect(workout.exercises[0].exerciseType).to.eql({ id: "benchPress", equipment: "barbell" });
  });

  it("names custom exercises and leaves out the built-in type", () => {
    const custom = {
      ...settings,
      exercises: {
        abc123: {
          vtype: "custom_exercise" as const,
          id: "abc123",
          name: "Zercher Carry",
          isDeleted: false,
          meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [], sortedEquipment: [] },
          types: [],
          smallImageUrl: "https://example.com/z.png",
        },
      },
    };
    const record = FriendsFixtures_record(1000, "2026-11-10T10:00:00.000Z", {
      entries: [FriendsFixtures_entry({ exercise: { id: "abc123" } })],
    });
    const workout = FeedWorkout_fromRecord(record, custom, "owner", { notes: false });
    expect(workout.exercises[0].name).to.equal("Zercher Carry");
    expect(workout.exercises[0].exerciseType).to.equal(undefined);
    expect(workout.exercises[0].imageUrl).to.equal("https://example.com/z.png");
  });

  it("keys a workout by owner and record id", () => {
    expect(FeedWorkout_key("u1", 42)).to.equal("u1:42");
  });
});
