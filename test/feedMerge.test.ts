import "mocha";
import { expect } from "chai";
import { FeedMerge_rowKey, FeedMerge_rows } from "../src/models/feedMerge";
import { FeedWorkout_fromRecord, FeedWorkout_key, IFeedWorkout } from "../src/models/feedWorkout";
import { Settings_build } from "../src/models/settings";
import { FriendsFixtures_record } from "./friendsFixtures";

function friend(ownerId: string, id: number, date: string): IFeedWorkout {
  return FeedWorkout_fromRecord(FriendsFixtures_record(id, date), Settings_build(), ownerId, { notes: false });
}

function byKey(workouts: IFeedWorkout[]): Partial<Record<string, IFeedWorkout>> {
  const result: Partial<Record<string, IFeedWorkout>> = {};
  for (const w of workouts) {
    result[FeedWorkout_key(w.ownerId, w.recordId)] = w;
  }
  return result;
}

describe("FeedMerge_rows", () => {
  const own = [
    FriendsFixtures_record(30, "2026-11-10T10:00:00.000Z"),
    FriendsFixtures_record(10, "2026-10-01T10:00:00.000Z"),
  ];
  const friends = [friend("f1", 20, "2026-11-05T10:00:00.000Z")];

  it("merges own and friend workouts newest first", () => {
    const rows = FeedMerge_rows({
      own,
      friendKeys: ["f1:20"],
      workouts: byKey(friends),
      hasMoreFriends: false,
      hiddenOwners: [],
      selfId: "me",
    });
    expect(rows.map(FeedMerge_rowKey)).to.eql(["own:30", "f1:20", "own:10"]);
  });

  it("hides own workouts older than the loaded friend page while more pages exist", () => {
    const rows = FeedMerge_rows({
      own,
      friendKeys: ["f1:20"],
      workouts: byKey(friends),
      hasMoreFriends: true,
      hiddenOwners: [],
      selfId: "me",
    });
    expect(rows.map(FeedMerge_rowKey)).to.eql(["own:30", "f1:20"]);
  });

  it("shows all own workouts before any friend page loads", () => {
    const rows = FeedMerge_rows({ own, friendKeys: [], workouts: {}, hasMoreFriends: true, hiddenOwners: [] });
    expect(rows.map(FeedMerge_rowKey)).to.eql(["own:30", "own:10"]);
  });

  it("filters hidden friends and hidden self", () => {
    const rows = FeedMerge_rows({
      own,
      friendKeys: ["f1:20"],
      workouts: byKey(friends),
      hasMoreFriends: false,
      hiddenOwners: ["f1", "me"],
      selfId: "me",
    });
    expect(rows).to.eql([]);
  });

  it("keeps two owners' workouts with the same record id apart", () => {
    const a = friend("a", 50, "2026-11-01T10:00:00.000Z");
    const b = friend("b", 50, "2026-11-01T10:00:00.000Z");
    const rows = FeedMerge_rows({
      own: [],
      friendKeys: ["a:50", "b:50"],
      workouts: byKey([a, b]),
      hasMoreFriends: false,
      hiddenOwners: [],
    });
    expect(rows.map(FeedMerge_rowKey).sort()).to.eql(["a:50", "b:50"]);
  });
});
