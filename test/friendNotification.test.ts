import "mocha";
import { expect } from "chai";
import {
  FriendNotification_content,
  FriendNotification_isEnabled,
  FriendNotification_othersSummary,
  FriendNotification_parseTap,
  FriendNotification_tapData,
  FriendNotification_workoutLabel,
} from "../src/models/friendNotification";
import { IReactionSummary } from "../src/models/reactions";
import { FriendsFixtures_record } from "./friendsFixtures";

const ownerFirst: IReactionSummary = {
  counts: { dino_pr: 1, dino_fire: 2 },
  mine: "dino_pr",
  reactors: [{ userId: "boris", nickname: "Boris" }, { nickname: "Anna" }, { nickname: "Carl" }],
  total: 3,
};

describe("FriendNotification", () => {
  it("names the requester, or falls back to 'A friend'", () => {
    const event = { kind: "followRequest" as const, recipientId: "boris", actorId: "anna", requestId: "r1" };
    expect(FriendNotification_content(event, { anna: "Anna" }).body).to.equal("Anna wants to follow your training.");
    expect(FriendNotification_content(event, {}).body).to.equal("A friend wants to follow your training.");
  });

  it("mentions the follow back in the approval", () => {
    const event = {
      kind: "followApproved" as const,
      recipientId: "anna",
      actorId: "boris",
      requestId: "r1",
      isFollowBackRequested: true,
    };
    const content = FriendNotification_content(event, { boris: "Boris" });
    expect(content.body).to.equal("Boris accepted your request and wants to follow you back.");
    expect(content.target).to.eql({ screen: "friends" });
  });

  it("keeps one collapse key per request, and one per workout for reactions", () => {
    const request = FriendNotification_content(
      { kind: "followRequest", recipientId: "boris", actorId: "anna", requestId: "r1" },
      {}
    );
    const reactions = FriendNotification_content(
      { kind: "reactions", recipientId: "boris", recordId: 1000, workoutLabel: "5/3/1 · Day 2", summary: ownerFirst },
      {}
    );
    expect(request.collapseKey).to.equal("follow-r1");
    expect(reactions.collapseKey).to.equal("reactions-1000");
    expect(reactions.body).to.equal("5/3/1 · Day 2");
  });

  it("leaves the owner out of the reaction text", () => {
    expect(FriendNotification_othersSummary(ownerFirst).total).to.equal(2);
    const content = FriendNotification_content(
      { kind: "reactions", recipientId: "boris", recordId: 1000, workoutLabel: "", summary: ownerFirst },
      {}
    );
    expect(content.title).to.equal("Anna & Carl reacted to your workout");
  });

  it("labels the workout by program and day", () => {
    const record = { ...FriendsFixtures_record(1, "2026-11-01T10:00:00.000Z"), programName: "GZCLP", dayName: "Day 1" };
    expect(FriendNotification_workoutLabel(record)).to.equal("GZCLP · Day 1");
    expect(FriendNotification_workoutLabel({ ...record, programName: " " })).to.equal("Day 1");
  });

  it("checks the right switch for each kind", () => {
    expect(FriendNotification_isEnabled(undefined, "reactions")).to.equal(true);
    expect(FriendNotification_isEnabled({ reactions: false }, "reactions")).to.equal(false);
    expect(FriendNotification_isEnabled({ reactions: false }, "followRequest")).to.equal(true);
    expect(FriendNotification_isEnabled({ friendRequests: false }, "followApproved")).to.equal(false);
  });

  it("round-trips a tap and opens nothing for another account", () => {
    const content = FriendNotification_content(
      { kind: "reactions", recipientId: "boris", recordId: 1000, workoutLabel: "", summary: ownerFirst },
      {}
    );
    const data = FriendNotification_tapData(content);
    expect(FriendNotification_parseTap(data, "boris")).to.eql({ screen: "workout", historyRecordId: 1000 });
    expect(FriendNotification_parseTap(data, "anna")).to.equal(undefined);
    expect(FriendNotification_parseTap(data, undefined)).to.equal(undefined);
  });

  it("names the editor and the program, collapses per program, and opens the program's edits", () => {
    const content = FriendNotification_content(
      { kind: "programEdit", recipientId: "boris", actorId: "anna", programId: "p1", programName: "GZCLP" },
      { anna: "Coach Anna" }
    );
    expect(content.title).to.equal("Coach Anna edited your program");
    expect(content.body).to.equal("GZCLP");
    expect(content.collapseKey).to.equal("program-p1");
    expect(FriendNotification_parseTap(FriendNotification_tapData(content), "boris")).to.eql({
      screen: "programEdits",
      programId: "p1",
    });
    expect(FriendNotification_isEnabled({ programEdits: false }, "programEdit")).to.equal(false);
    expect(FriendNotification_isEnabled({ reactions: false }, "programEdit")).to.equal(true);
  });

  it("rejects malformed taps", () => {
    expect(FriendNotification_parseTap(undefined, "boris")).to.equal(undefined);
    expect(FriendNotification_parseTap("text", "boris")).to.equal(undefined);
    expect(FriendNotification_parseTap({ reason: "storage", recipientId: "boris" }, "boris")).to.equal(undefined);
    expect(
      FriendNotification_parseTap({ reason: "friend", recipientId: "boris", target: "workout" }, "boris")
    ).to.equal(undefined);
    expect(FriendNotification_parseTap({ reason: "friend", recipientId: "boris", target: "friends" }, "boris")).to.eql({
      screen: "friends",
    });
  });
});
