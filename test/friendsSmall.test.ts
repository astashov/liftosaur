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
import {
  Follow_accessSummary,
  Follow_applyPermissionsPatch,
  Follow_defaultPermissions,
  Follow_displayName,
  Follow_needsNickname,
  Follow_parseNickname,
  Follow_parsePermissions,
  Follow_parsePermissionsPatch,
  Follow_setPermission,
} from "../src/models/follow";
import { FriendProgram_previewSettings } from "../src/models/friendProgram";
import { Exercise_createCustomExercise } from "../src/models/exercise";
import { ScreensWithoutProgram_allows } from "../src/navigation/screensWithoutProgram";

function follow(overrides: Partial<IFollowDao> = {}): IFollowDao {
  return {
    followerId: "a",
    followeeId: "b",
    status: "approved",
    requestId: "r1",
    permissions: { notes: false, programs: false },
    createdAt: 1,
    ...overrides,
  };
}

describe("ScreensWithoutProgram", () => {
  it("lets a user without a program reach the friend screens but not the program editor", () => {
    for (const screen of ["friends", "followInvite", "friendRequest", "friendFollower", "friendProfile"]) {
      expect(ScreensWithoutProgram_allows(screen)).to.equal(true);
    }
    expect(ScreensWithoutProgram_allows("programs")).to.equal(true);
    expect(ScreensWithoutProgram_allows("editProgram")).to.equal(false);
    expect(ScreensWithoutProgram_allows("programEdits")).to.equal(false);
  });
});

describe("Avatar", () => {
  it("takes initials from two words or the first two letters", () => {
    expect(Avatar_initials("marcus west")).to.equal("MW");
    expect(Avatar_initials("priyalifts")).to.equal("PR");
    expect(Avatar_initials("j")).to.equal("J");
  });

  it("shows a question mark without a nickname, never part of the user id", () => {
    expect(Avatar_initials(undefined)).to.equal("?");
    expect(Avatar_initials("   ")).to.equal("?");
  });

  it("asks for a non-empty nickname of at most 30 characters, and saves it trimmed", () => {
    expect(Follow_parseNickname("")).to.eql({ error: "Pick a nickname" });
    expect(Follow_parseNickname("   ")).to.eql({ error: "Pick a nickname" });
    expect(Follow_parseNickname("x".repeat(31)))
      .to.have.property("error")
      .that.contains("30");
    expect(Follow_parseNickname(`  ${"x".repeat(30)}  `)).to.eql({ nickname: "x".repeat(30) });
    expect(Follow_parseNickname(" Sam ")).to.eql({ nickname: "Sam" });
  });

  it("needs a nickname when it is missing or only spaces", () => {
    expect(Follow_needsNickname(undefined)).to.equal(true);
    expect(Follow_needsNickname("  ")).to.equal(true);
    expect(Follow_needsNickname("Sam")).to.equal(false);
  });

  it("names a friend without a nickname 'A friend'", () => {
    expect(Follow_displayName(undefined)).to.equal("A friend");
    expect(Follow_displayName("  ")).to.equal("A friend");
    expect(Follow_displayName("Sam")).to.equal("Sam");
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
    expect(FollowInviteLink_token("https://stage.liftosaur.com/f/abcDEF12_-x")).to.equal("abcDEF12_-x");
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
    expect(FollowAccess_permissions("b", "b", undefined)).to.eql({ notes: true, programs: true });
  });

  it("gives an approved follower the stored permissions", () => {
    const permissions = { notes: true, programs: false };
    expect(FollowAccess_permissions("a", "b", follow({ permissions }))).to.eql(permissions);
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

describe("Follow permissions", () => {
  it("parses rows saved before program permissions existed as no program access", () => {
    expect(Follow_parsePermissions({ notes: true })).to.eql({ notes: true, programs: false });
    expect(Follow_parsePermissions({ programs: true })).to.equal(undefined);
    expect(Follow_parsePermissions("yes")).to.equal(undefined);
  });

  it("turns only an old edit grant into program access, never a see-only one", () => {
    expect(Follow_parsePermissions({ notes: false, programs: true, programEdits: true })).to.eql({
      notes: false,
      programs: true,
    });
    expect(Follow_parsePermissions({ notes: false, programs: true, programEdits: false })).to.eql({
      notes: false,
      programs: false,
    });
    expect(Follow_parsePermissions({ notes: false, programs: true })).to.eql({ notes: false, programs: true });
    expect(Follow_parsePermissionsPatch({ programs: true, programEdits: false })).to.eql({ programs: false });
  });

  it("sets one permission without touching the other", () => {
    expect(Follow_setPermission(Follow_defaultPermissions, "programs", true)).to.eql({ notes: false, programs: true });
  });

  it("keeps permissions an older client does not send", () => {
    const all = { notes: true, programs: true };
    const fromOldClient = Follow_parsePermissionsPatch({ notes: false, future: "ignored" });
    expect(fromOldClient).to.eql({ notes: false });
    expect(Follow_applyPermissionsPatch(all, fromOldClient ?? {})).to.eql({ ...all, notes: false });
    expect(Follow_parsePermissionsPatch({ notes: "yes" })).to.equal(undefined);
    expect(Follow_parsePermissionsPatch({})).to.equal(undefined);
  });

  it("summarizes what a follower has access to", () => {
    expect(Follow_accessSummary(Follow_defaultPermissions)).to.equal("Sees workouts");
    expect(Follow_accessSummary({ notes: true, programs: false })).to.equal("Sees workouts and notes");
    expect(Follow_accessSummary({ notes: true, programs: true })).to.equal("Sees workouts and notes, edits programs");
  });
});

describe("FriendProgram_previewSettings", () => {
  it("computes weights from the owner's units, 1RMs and custom exercises, keeping the viewer's own preferences", () => {
    const viewer = { ...Settings_build("lb"), theme: "dark" as const };
    const custom = Exercise_createCustomExercise("Zercher Squat", [], [], []);
    const owner = {
      ...Settings_build("kg"),
      exercises: { [custom.id]: custom },
      exerciseData: { squat_barbell: { rm1: { value: 180, unit: "kg" as const } } },
    };
    const settings = FriendProgram_previewSettings(viewer, owner);
    expect(settings.units).to.equal("kg");
    expect(settings.exercises[custom.id]?.name).to.equal("Zercher Squat");
    expect(settings.exerciseData.squat_barbell?.rm1?.value).to.equal(180);
    expect(settings.theme).to.equal("dark");
  });

  it("uses the owner's 1RM formula with the owner's 1RMs, even when the viewer picked another", () => {
    const viewer = { ...Settings_build("lb"), rm1formula: "epley" as const };
    expect(
      FriendProgram_previewSettings(viewer, { ...Settings_build("lb"), rm1formula: "brzycki" }).rm1formula
    ).to.equal("brzycki");
    expect(FriendProgram_previewSettings(viewer, Settings_build("lb")).rm1formula).to.equal(undefined);
  });
});
