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
  SocialState_forAccount,
  SocialState_restoreReaction,
} from "../src/models/socialState";
import { FeedWorkout_fromRecord, IFeedResponse } from "../src/models/feedWorkout";
import { Settings_build } from "../src/models/settings";
import { FriendsFixtures_record } from "./friendsFixtures";

function response(accountId: string, ids: number[], cursor?: string): IFeedResponse {
  return {
    accountId,
    workouts: ids.map((id) =>
      FeedWorkout_fromRecord(FriendsFixtures_record(id, `2026-11-0${id % 9}T10:00:00.000Z`), Settings_build(), "f1", {
        notes: false,
      })
    ),
    reactions: {},
    owners: { f1: { nickname: "friend" } },
    cursor,
    failedOwners: [],
  };
}

describe("SocialState", () => {
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
});
