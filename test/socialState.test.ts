import "mocha";
import { expect } from "chai";
import {
  SocialState_applyFeedPage,
  SocialState_applyFeedRefresh,
  SocialState_isPageStale,
  SocialState_pageTtlMs,
  SocialState_startRefresh,
  SocialState_applyOwnReactions,
  SocialState_applyReaction,
  SocialState_empty,
  SocialState_feedOwners,
  SocialState_homePage,
  SocialState_needsProgramEdits,
  SocialState_forAccount,
  SocialState_pendingRequestCount,
  SocialState_restoreReaction,
  SocialState_applyProgramEdits,
  SocialState_isProgramEditsStale,
  SocialState_programEditLine,
  SocialState_unseenProgramEdits,
  SocialState_hasUnseenEditsFor,
  SocialState_unseenEditsInOtherPrograms,
  SocialState_programEditsFor,
  SocialState_programEditsKey,
  SocialState_failProgramEditsFor,
  SocialState_startFriendLoad,
  SocialState_applyProgramEditsFor,
  SocialState_applyFriendProgram,
  SocialState_applyFriendPrograms,
  SocialState_applyFollows,
  SocialState_failFriendProgram,
  SocialState_failFriendPrograms,
  SocialState_friendProgramKey,
  SocialState_applyInbound,
  SocialState_startReactionWrite,
  SocialState_settleReactionWrite,
} from "../src/models/socialState";
import { IProgramEditsResponse } from "../src/models/friendProgram";
import { IFollowsResponse } from "../src/models/follow";
import { Program_create } from "../src/models/program";
import { FeedWorkout_fromRecord, IFeedResponse } from "../src/models/feedWorkout";
import { Settings_build } from "../src/models/settings";
import { FriendsFixtures_record } from "./friendsFixtures";

function response(accountId: string, ids: number[], cursor?: string): IFeedResponse {
  return {
    accountId,
    workouts: ids.map((id) =>
      FeedWorkout_fromRecord(FriendsFixtures_record(id, `2026-11-0${id % 9}T10:00:00.000Z`), Settings_build(), "f1", {
        notes: false,
        programs: false,
      })
    ),
    reactions: {},
    owners: { f1: { nickname: "friend" } },
    cursor,
    failedOwners: [],
  };
}

describe("SocialState", () => {
  it("asks for no feed or program edits once follows show nobody", () => {
    const permissions = { notes: false, programs: false };
    const nobody: IFollowsResponse = { accountId: "me", following: [], followers: [], incoming: [], outgoing: [] };
    const withFriends: IFollowsResponse = {
      ...nobody,
      following: [
        { userId: "sam", permissions },
        { userId: "kim", permissions },
      ],
      followers: [{ userId: "sam", permissions }],
    };
    const empty = SocialState_empty("me");
    expect(SocialState_feedOwners(empty, SocialState_homePage)).to.equal(undefined);
    expect(SocialState_needsProgramEdits(empty)).to.equal(true);
    expect(SocialState_feedOwners({ ...empty, follows: nobody }, SocialState_homePage)).to.eql([]);
    expect(SocialState_needsProgramEdits({ ...empty, follows: nobody })).to.equal(false);
    expect(SocialState_feedOwners({ ...empty, follows: withFriends }, SocialState_homePage)).to.equal(undefined);
    expect(
      SocialState_feedOwners({ ...empty, follows: withFriends, hiddenOwners: ["kim"] }, SocialState_homePage)
    ).to.eql(["sam"]);
    expect(SocialState_feedOwners({ ...empty, follows: nobody }, "sam")).to.eql(["sam"]);
    expect(SocialState_needsProgramEdits({ ...empty, follows: withFriends })).to.equal(true);
  });

  it("counts pending requests only for the signed-in account", () => {
    const request = { requestId: "r1", nickname: "Bob", createdAt: 1 };
    const social = {
      ...SocialState_empty("me"),
      follows: {
        accountId: "me",
        following: [],
        followers: [],
        incoming: [request, { ...request, requestId: "r2" }],
        outgoing: [],
      },
    };
    expect(SocialState_pendingRequestCount(social, "me")).to.equal(2);
    expect(SocialState_pendingRequestCount(social, "other")).to.equal(0);
    expect(SocialState_pendingRequestCount(SocialState_empty("me"), "me")).to.equal(0);
    expect(SocialState_pendingRequestCount(undefined, undefined)).to.equal(0);
  });

  it("appends pages without duplicating keys and tracks the cursor", () => {
    let state = SocialState_empty("me");
    state = SocialState_applyFeedPage(state, "home", response("me", [1, 2], "c1"), true);
    state = SocialState_applyFeedPage(state, "home", response("me", [2, 3]), false);
    expect(state.pages.home?.keys).to.eql(["f1:1", "f1:2", "f1:3"]);
    expect(state.pages.home?.hasMore).to.equal(false);
    expect(state.owners.f1?.nickname).to.equal("friend");
  });

  it("treats a page as stale after a minute, but never while it loads", () => {
    const loaded = SocialState_applyFeedPage(SocialState_empty("me"), "home", response("me", [1], "c1"), true, 1000);
    expect(SocialState_isPageStale(undefined, 0)).to.equal(true);
    expect(SocialState_isPageStale(loaded.pages.home, 1000 + SocialState_pageTtlMs)).to.equal(false);
    expect(SocialState_isPageStale(loaded.pages.home, 1001 + SocialState_pageTtlMs)).to.equal(true);
    const refreshing = SocialState_startRefresh(loaded, "home");
    expect(SocialState_isPageStale(refreshing.pages.home, 1001 + SocialState_pageTtlMs)).to.equal(false);
  });

  it("adds new workouts on refresh and keeps the loaded pages and cursor", () => {
    let state = SocialState_empty("me");
    state = SocialState_applyFeedPage(state, "home", response("me", [2, 3], "c1"), true, 1000);
    state = SocialState_applyFeedPage(state, "home", response("me", [4], "c2"), false, 2000);
    state = SocialState_applyFeedRefresh(state, "home", response("me", [1, 2], "fresh"), 90_000);
    expect(state.pages.home?.keys).to.eql(["f1:1", "f1:2", "f1:3", "f1:4"]);
    expect(state.pages.home?.cursor).to.equal("c2");
    expect(state.pages.home?.loadedAt).to.equal(90_000);
  });

  it("replaces the page on a first-page reload", () => {
    let state = SocialState_empty("me");
    state = SocialState_applyFeedPage(state, "home", response("me", [1, 2], "c1"), true);
    state = SocialState_applyFeedPage(state, "home", response("me", [3], "c2"), true);
    expect(state.pages.home?.keys).to.eql(["f1:3"]);
  });

  it("drops a response that belongs to another account", () => {
    const state = SocialState_empty("me");
    const next = SocialState_applyFeedPage(state, "home", response("someone-else", [1]), true);
    expect(next).to.equal(state);
  });

  it("resets on account change", () => {
    const switched = SocialState_forAccount(
      SocialState_applyFeedPage(SocialState_empty("a"), "home", response("a", [1]), true),
      "b"
    );
    expect(switched?.accountId).to.equal("b");
    expect(switched?.pages).to.eql({});
    expect(switched?.workouts).to.eql({});
    expect(SocialState_forAccount(switched, "b")).to.equal(switched);
  });

  it("clears friend data on logout", () => {
    expect(SocialState_forAccount(SocialState_empty("a"), undefined)).to.equal(undefined);
  });

  it("applies a reaction optimistically and restores it on failure", () => {
    const state = SocialState_applyOwnReactions(SocialState_empty("me"), "me", [5], {
      5: { counts: { dino_pr: 1 }, reactors: [{ nickname: "x" }], total: 1 },
    });
    const before = state.reactions["me:5"];
    const reacted = SocialState_applyReaction(state, "me:5", { userId: "me" }, "dino_fire");
    expect(reacted.reactions["me:5"]?.counts).to.eql({ dino_pr: 1, dino_fire: 1 });
    const restored = SocialState_restoreReaction(reacted, "me:5", before);
    expect(restored.reactions["me:5"]).to.equal(before);
  });

  it("clears a requested own workout whose last reaction was removed", () => {
    const summary = { counts: { dino_pr: 1 }, reactors: [{ nickname: "x" }], total: 1 };
    const loaded = SocialState_applyOwnReactions(SocialState_empty("me"), "me", [5, 6], { 5: summary, 6: summary });
    const refreshed = SocialState_applyOwnReactions(loaded, "me", [5], {});
    expect(refreshed.reactions["me:5"]).to.equal(undefined);
    expect(refreshed.reactions["me:6"]).to.equal(summary);
  });

  describe("program edits", () => {
    const hour = 60 * 60 * 1000;
    const now = 100 * 24 * hour;
    const edits = {
      accountId: "me",
      unseenCount: 2,
      programs: [
        {
          programId: "p1",
          programName: "5x5",
          unseen: 2,
          latest: { editorId: "c", nickname: "Sam", createdAt: now - 2 * hour },
        },
        { programId: "p2", programName: "Old", unseen: 0, latest: { editorId: "c", createdAt: now - 40 * 24 * hour } },
      ],
    };

    it("counts unseen edits for the signed-in account only, and ignores another account's response", () => {
      const ids = ["p1", "p2"];
      const state = SocialState_applyProgramEdits(SocialState_empty("me"), edits, now);
      expect(SocialState_unseenProgramEdits(SocialState_programEditsFor(state, "me", ids))).to.equal(2);
      expect(SocialState_unseenProgramEdits(SocialState_programEditsFor(state, "other", ids))).to.equal(0);
      const foreign = SocialState_applyProgramEdits(SocialState_empty("me"), { ...edits, accountId: "x" }, now);
      expect(SocialState_unseenProgramEdits(SocialState_programEditsFor(foreign, "me", ids))).to.equal(0);
    });

    it("ignores edits to programs the owner deleted, and keeps the same object when none were", () => {
      const state = SocialState_applyProgramEdits(SocialState_empty("me"), edits, now);
      const withoutP1 = SocialState_programEditsFor(state, "me", ["p2"]);
      expect(withoutP1?.programs.map((p) => p.programId)).to.eql(["p2"]);
      expect(SocialState_unseenProgramEdits(withoutP1)).to.equal(0);
      expect(SocialState_programEditsFor(state, "me", ["p1", "p2"])).to.equal(state.programEdits);
    });

    it("writes the program line for recent edits, and hides seen edits older than 30 days", () => {
      const state = SocialState_applyProgramEdits(SocialState_empty("me"), edits, now);
      expect(SocialState_programEditLine(state.programEdits, "p1", now)).to.eql({
        text: "Sam edited this program · 2h ago",
        isUnseen: true,
      });
      expect(SocialState_programEditLine(state.programEdits, "p2", now)).to.equal(undefined);
      expect(SocialState_programEditLine(state.programEdits, "p3", now)).to.equal(undefined);
    });

    it("keeps the line for unseen edits older than 30 days, so their dot can be cleared", () => {
      const oldUnseen = { ...edits, programs: [{ ...edits.programs[1], unseen: 1 }] };
      expect(SocialState_programEditLine(oldUnseen, "p2", now)?.isUnseen).to.equal(true);
    });

    it("refreshes after the TTL", () => {
      const state = SocialState_applyProgramEdits(SocialState_empty("me"), edits, now);
      expect(SocialState_isProgramEditsStale(state, now + 1000)).to.equal(false);
      expect(SocialState_isProgramEditsStale(state, now + SocialState_pageTtlMs + 1)).to.equal(true);
      expect(SocialState_isProgramEditsStale(SocialState_empty("me"), now)).to.equal(true);
    });

    it("counts unseen edits outside the current program, for the dot on the change-program button", () => {
      const withOther = {
        ...edits,
        programs: [...edits.programs, { ...edits.programs[1], programId: "p3", unseen: 3 }],
      };
      expect(SocialState_unseenEditsInOtherPrograms(withOther, "p1")).to.equal(3);
      expect(SocialState_unseenEditsInOtherPrograms(withOther, "p3")).to.equal(2);
      expect(SocialState_unseenEditsInOtherPrograms(edits, "p1")).to.equal(0);
      expect(SocialState_unseenEditsInOtherPrograms(undefined, "p1")).to.equal(0);
    });

    it("asks to mark seen when the summary has unseen edits the loaded page does not show", () => {
      const state = SocialState_applyProgramEdits(SocialState_empty("me"), edits, now);
      const seenPage = [{ id: "e1", programId: "p1", editorId: "c", createdAt: now, seen: true }];
      expect(SocialState_hasUnseenEditsFor(state, "p1", seenPage)).to.equal(true);
      expect(SocialState_hasUnseenEditsFor(state, "p2", seenPage)).to.equal(false);
      expect(SocialState_hasUnseenEditsFor(state, "p2", [{ ...seenPage[0], seen: false }])).to.equal(true);
    });
  });

  describe("friend programs", () => {
    const program = Program_create("5x5", "p1");
    const context = {
      ownerId: "sam",
      exported: { program, customExercises: {}, version: "1", settings: {} },
      settings: Settings_build(),
      base: "b",
    };
    function follows(programs: boolean): IFollowsResponse {
      const permissions = { notes: false, programs };
      return {
        accountId: "me",
        following: [{ userId: "sam", permissions }],
        followers: [],
        incoming: [],
        outgoing: [],
      };
    }

    it("replaces cached data with a message on failure, and clears the message on success", () => {
      let state = SocialState_applyFriendProgram(SocialState_empty("me"), context);
      state = SocialState_failFriendProgram(state, "sam", "p1", "not_found");
      const key = SocialState_friendProgramKey("sam", "p1");
      expect(state.friendProgram[key]).to.equal(undefined);
      expect(state.friendErrors[key]).to.contain("not be shared");
      expect(SocialState_failFriendPrograms(state, "sam", "network").friendErrors.sam).to.contain("connection");
      state = SocialState_applyFriendProgram(state, context);
      expect(state.friendErrors[key]).to.equal(undefined);
    });

    it("shows a retryable error for the changes list, and clears it when a load starts or succeeds", () => {
      const key = SocialState_programEditsKey("p1");
      const failed = SocialState_failProgramEditsFor(SocialState_empty("me"), "p1", "network");
      expect(failed.friendErrors[key]).to.contain("connection");
      expect(SocialState_failProgramEditsFor(failed, "p1", "http500").friendErrors[key]).to.contain("Try again");
      expect(SocialState_startFriendLoad(failed, key).friendErrors[key]).to.equal(undefined);
      const loaded = SocialState_applyProgramEditsFor(failed, { accountId: "me", programId: "p1", edits: [] });
      expect(loaded.friendErrors[key]).to.equal(undefined);
      expect(loaded.programEditsByProgram.p1).to.eql([]);
    });

    it("drops cached programs of people who stopped sharing them", () => {
      let state = SocialState_applyFriendPrograms(SocialState_empty("me"), "sam", [
        { id: "p1", name: "5x5", isCurrent: true },
      ]);
      state = SocialState_applyFriendProgram(state, context);
      const kept = SocialState_applyFollows(state, follows(true));
      expect(kept.friendPrograms.sam).to.have.length(1);
      const dropped = SocialState_applyFollows(state, follows(false));
      expect(dropped.friendPrograms.sam).to.equal(undefined);
      expect(dropped.friendProgram[SocialState_friendProgramKey("sam", "p1")]).to.equal(undefined);
    });
  });

  describe("inbound social and reaction writes", () => {
    const anna = { userId: "me", nickname: "Anna" };
    const fire = { counts: { dino_fire: 1 }, reactors: [{ nickname: "Carl" }], total: 1 };
    const edits = (unseenCount: number): IProgramEditsResponse => ({ accountId: "me", unseenCount, programs: [] });

    it("replaces own reactions from the window and keeps older ones", () => {
      let state = SocialState_empty("me");
      state = SocialState_applyOwnReactions(state, "me", [500, 1500], { "500": fire, "1500": fire }, 10);
      state = SocialState_applyInbound(state, { accountId: "me", reactions: { "2000": fire } }, 1000, 20);
      expect(Object.keys(state.reactions).sort()).to.eql(["me:2000", "me:500"]);
    });

    it("skips an inbound payload whose request started before the last one applied", () => {
      let state = SocialState_empty("me");
      state = SocialState_applyInbound(
        state,
        { accountId: "me", reactions: { "2000": fire }, programEdits: edits(0) },
        0,
        30
      );
      state = SocialState_applyInbound(state, { accountId: "me", reactions: {}, programEdits: edits(2) }, 0, 20);
      expect(state.reactions["me:2000"]).to.eql(fire);
      expect(state.programEdits?.unseenCount).to.equal(0);
    });

    it("ignores a payload for another account", () => {
      const state = SocialState_applyInbound(
        SocialState_empty("me"),
        { accountId: "other", reactions: { "2000": fire } },
        0,
        10
      );
      expect(state.reactions).to.eql({});
    });

    it("keeps a reaction through a refresh that started before the write settled", () => {
      let state = SocialState_empty("me");
      const started = SocialState_startReactionWrite(state, "f1:1", anna, "dino_pr");
      state = SocialState_settleReactionWrite(started.state, "f1:1", started.seq, true, 100);
      const stale = { ...response("me", [1]), reactions: { "f1:1": fire } };
      state = SocialState_applyFeedRefresh(state, "home", stale, 150, 90);
      expect(state.reactions["f1:1"]?.mine).to.equal("dino_pr");
      expect(state.reactions["f1:1"]?.total).to.equal(2);
      state = SocialState_applyFeedRefresh(state, "home", stale, 200, 110);
      expect(state.reactions["f1:1"]?.mine).to.equal(undefined);
      expect(state.reactionWrites?.["f1:1"]).to.equal(undefined);
    });

    it("lets only the newest write undo itself, back to the last confirmed reaction", () => {
      let state = SocialState_empty("me");
      const first = SocialState_startReactionWrite(state, "f1:1", anna, "dino_pr");
      const second = SocialState_startReactionWrite(first.state, "f1:1", anna, "dino_fire");
      state = SocialState_settleReactionWrite(second.state, "f1:1", first.seq, false, 100);
      expect(state.reactions["f1:1"]?.mine).to.equal("dino_fire");
      state = SocialState_settleReactionWrite(state, "f1:1", second.seq, false, 110);
      expect(state.reactions["f1:1"]?.mine).to.equal(undefined);
      expect(state.reactionWrites?.["f1:1"]).to.equal(undefined);
    });

    it("never reuses a write identity, so a late old failure cannot undo a newer tap", () => {
      let state = SocialState_empty("me");
      const a = SocialState_startReactionWrite(state, "f1:1", anna, "dino_pr");
      const b = SocialState_startReactionWrite(a.state, "f1:1", anna, "dino_fire");
      state = SocialState_settleReactionWrite(b.state, "f1:1", b.seq, false, 100);
      const c = SocialState_startReactionWrite(state, "f1:1", anna, "dino_hype");
      expect(c.seq).to.not.equal(a.seq);
      state = SocialState_settleReactionWrite(c.state, "f1:1", a.seq, false, 110);
      expect(state.reactions["f1:1"]?.mine).to.equal("dino_hype");
      expect(state.reactionWrites?.["f1:1"]?.seq).to.equal(c.seq);
    });

    it("keeps a settled write until a response that read that workout arrives", () => {
      let state = SocialState_empty("me");
      const started = SocialState_startReactionWrite(state, "f1:1", anna, "dino_pr");
      state = SocialState_settleReactionWrite(started.state, "f1:1", started.seq, true, 100);
      state = SocialState_applyInbound(state, { accountId: "me", reactions: {} }, 0, 110);
      expect(state.reactionWrites?.["f1:1"]).to.not.equal(undefined);
      const stale = { ...response("me", [1]), reactions: { "f1:1": fire } };
      state = SocialState_applyFeedRefresh(state, "home", stale, 120, 90);
      expect(state.reactions["f1:1"]?.mine).to.equal("dino_pr");
    });

    it("ignores an older response for a workout after a newer one was applied", () => {
      let state = SocialState_empty("me");
      const fresh = { ...response("me", [1]), reactions: { "f1:1": { ...fire, total: 5 } } };
      const old = { ...response("me", [1]), reactions: { "f1:1": fire } };
      state = SocialState_applyFeedRefresh(state, "home", fresh, 200, 150);
      state = SocialState_applyFeedRefresh(state, "home", old, 210, 100);
      expect(state.reactions["f1:1"]?.total).to.equal(5);
    });

    it("skips an older program edits response after a newer one", () => {
      let state = SocialState_empty("me");
      state = SocialState_applyProgramEdits(state, edits(0), 50, 50);
      state = SocialState_applyProgramEdits(state, edits(3), 60, 40);
      expect(state.programEdits?.unseenCount).to.equal(0);
    });
  });
});
