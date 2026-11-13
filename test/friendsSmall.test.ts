import "mocha";
import { expect } from "chai";
import { Avatar_colorIndex, Avatar_initials, Avatar_paletteSize } from "../src/models/avatar";
import { RecordShare_settingsWithoutNotes, RecordShare_withoutNotes } from "../src/models/recordShare";
import { FollowAccess_canDecide, FollowAccess_canReact, FollowAccess_permissions } from "../lambda/utils/followAccess";
import { IFollowDao } from "../lambda/dao/followDao";
import { Settings_build } from "../src/models/settings";
import { FriendsFixtures_entry, FriendsFixtures_record } from "./friendsFixtures";
import { FollowInviteLink_token } from "../src/models/followInviteLink";
import { RelativeTime_ago } from "../src/utils/relativeTime";

function follow(overrides: Partial<IFollowDao> = {}): IFollowDao {
  return {
    followerId: "a",
    followeeId: "b",
    status: "approved",
    requestId: "r1",
    permissions: { notes: false },
    createdAt: 1,
    ...overrides,
  };
}

describe("Avatar", () => {
  it("takes initials from two words or the first two letters", () => {
    expect(Avatar_initials("marcus west", "x")).to.equal("MW");
    expect(Avatar_initials("priyalifts", "x")).to.equal("PR");
    expect(Avatar_initials("j", "x")).to.equal("J");
  });

  it("falls back to the given id when there is no nickname", () => {
    expect(Avatar_initials(undefined, "k7q2p5x9m3")).to.equal("K7");
    expect(Avatar_initials("   ", "b4n6")).to.equal("B4");
  });

  it("picks a stable color from the seed", () => {
    expect(Avatar_colorIndex("abc")).to.equal(Avatar_colorIndex("abc"));
    expect(Avatar_colorIndex("abc")).to.be.within(0, Avatar_paletteSize - 1);
  });
});

describe("RecordShare", () => {
  it("removes workout and exercise notes", () => {
    const record = FriendsFixtures_record(1, "2026-11-10T10:00:00.000Z", {
      notes: "private",
      entries: [FriendsFixtures_entry({ notes: "private too" })],
    });
    const json = JSON.stringify(RecordShare_withoutNotes(record));
    expect(json).to.not.contain("private");
  });

  it("removes per-exercise notes from settings and keeps the rest", () => {
    const settings = Settings_build();
    settings.exerciseData = { benchPress_barbell: { notes: "shoulder", rm1: { value: 200, unit: "lb" } } };
    const result = RecordShare_settingsWithoutNotes(settings);
    expect(result.exerciseData.benchPress_barbell?.notes).to.equal(undefined);
    expect(result.exerciseData.benchPress_barbell?.rm1).to.eql({ value: 200, unit: "lb" });
  });
});

describe("FollowInviteLink_token", () => {
  it("reads the token from an invite path or query", () => {
    expect(FollowInviteLink_token("https://www.liftosaur.com/f/abcDEF12_-x")).to.equal("abcDEF12_-x");
    expect(FollowInviteLink_token("https://liftosaur.com/app/?followInvite=abcdefgh12")).to.equal("abcdefgh12");
  });

  it("ignores other hosts, other paths and malformed tokens", () => {
    expect(FollowInviteLink_token("https://evil.com/f/abcdefgh12")).to.equal(undefined);
    expect(FollowInviteLink_token("https://www.liftosaur.com/p/abcdefgh12")).to.equal(undefined);
    expect(FollowInviteLink_token("https://www.liftosaur.com/f/short")).to.equal(undefined);
    expect(FollowInviteLink_token("https://www.liftosaur.com/f/has%20space12")).to.equal(undefined);
    expect(FollowInviteLink_token("not a url")).to.equal(undefined);
  });

  it("accepts any host for the web app's own address", () => {
    expect(FollowInviteLink_token("https://local18.liftosaur.com:8250/app/?followInvite=abcdefgh12", true)).to.equal(
      "abcdefgh12"
    );
  });
});

describe("RelativeTime_ago", () => {
  it("formats minutes, hours, days and weeks", () => {
    const now = 100 * 24 * 60 * 60 * 1000;
    expect(RelativeTime_ago(now - 30 * 1000, now)).to.equal("just now");
    expect(RelativeTime_ago(now - 5 * 60 * 1000, now)).to.equal("5m ago");
    expect(RelativeTime_ago(now - 2 * 60 * 60 * 1000, now)).to.equal("2h ago");
    expect(RelativeTime_ago(now - 30 * 60 * 60 * 1000, now)).to.equal("yesterday");
    expect(RelativeTime_ago(now - 3 * 24 * 60 * 60 * 1000, now)).to.equal("3d ago");
    expect(RelativeTime_ago(now - 14 * 24 * 60 * 60 * 1000, now)).to.equal("2w ago");
  });
});

describe("FollowAccess", () => {
  it("gives the owner full access", () => {
    expect(FollowAccess_permissions("b", "b", undefined)).to.eql({ notes: true });
  });

  it("gives an approved follower the stored permissions", () => {
    expect(FollowAccess_permissions("a", "b", follow({ permissions: { notes: true } }))).to.eql({ notes: true });
  });

  it("denies a pending follower, a stranger and a mismatched row", () => {
    expect(FollowAccess_permissions("a", "b", follow({ status: "pending" }))).to.equal(undefined);
    expect(FollowAccess_permissions("a", "b", undefined)).to.equal(undefined);
    expect(FollowAccess_permissions("c", "b", follow())).to.equal(undefined);
    expect(FollowAccess_canReact("a", "c", follow())).to.equal(false);
  });

  it("lets only the followee approve and only the follower cancel", () => {
    const pending = follow({ status: "pending" });
    expect(FollowAccess_canDecide("b", pending)).to.equal("approve");
    expect(FollowAccess_canDecide("a", pending)).to.equal("cancel");
    expect(FollowAccess_canDecide("c", pending)).to.equal(undefined);
    expect(FollowAccess_canDecide("b", follow())).to.equal(undefined);
  });
});
