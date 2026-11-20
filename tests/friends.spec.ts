/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "@playwright/test";
import { localdomain, localport } from "../src/localdomain";
import {
  FriendsUtils_addWorkout,
  FriendsUtils_approve,
  FriendsUtils_befriend,
  FriendsUtils_close,
  FriendsUtils_createInvite,
  FriendsUtils_openFriends,
  FriendsUtils_openTab,
  FriendsUtils_requestFollow,
  FriendsUtils_signIn,
  FriendsUtils_activeFriends,
  FriendsUtils_visible,
  FriendsUtils_waitForHomeFeed,
  FriendsUtils_addProgram,
  FriendsUtils_api,
} from "./friendsUtils";

test.describe.configure({ mode: "serial", timeout: 180000 });

test("Invite, approve with follow-back, and see each other in the friends lists", async ({ browser }) => {
  const anna = await FriendsUtils_signIn(browser, { withProgram: true });
  const boris = await FriendsUtils_signIn(browser, { withProgram: true });

  const token = await FriendsUtils_createInvite(anna, "Anna");
  await FriendsUtils_requestFollow(boris, token, "Boris");

  await FriendsUtils_openFriends(anna.page);
  await expect(anna.page.getByTestId("friends-incoming").filter({ hasText: "Boris" })).toBeVisible({ timeout: 20000 });
  await FriendsUtils_approve(anna, { from: "Boris", programs: true });

  await FriendsUtils_openFriends(boris.page);
  await expect(boris.page.getByTestId("friends-following").filter({ hasText: "Anna" })).toBeVisible({
    timeout: 20000,
  });
  await FriendsUtils_approve(boris, { from: "Anna" });

  await FriendsUtils_openFriends(anna.page);
  await expect(anna.page.getByTestId("friends-following").filter({ hasText: "Boris" })).toBeVisible({
    timeout: 20000,
  });
  await expect(anna.page.getByTestId("friends-follower").filter({ hasText: "Boris" })).toContainText("edits programs");
  await FriendsUtils_close(anna, boris);
});

test("A follower sees the workout on Home and reacts; the owner sees the reaction", async ({ browser }) => {
  const anna = await FriendsUtils_signIn(browser, { withProgram: true });
  const boris = await FriendsUtils_signIn(browser, { withProgram: true });
  await FriendsUtils_befriend(anna, boris, { ownerNickname: "Anna", followerNickname: "Boris" });
  const recordId = await FriendsUtils_addWorkout(anna, new Date());

  await FriendsUtils_openTab(boris.page, "home");
  const card = boris.page.getByTestId("feed-workout").filter({ hasText: "Anna" });
  await expect(card).toBeVisible({ timeout: 20000 });
  const prefix = `reaction-${anna.userId}-${recordId}`;
  const react = async (reaction: string, method: "PUT" | "DELETE"): Promise<void> => {
    const saved = boris.page.waitForResponse(
      (r) => r.url().includes(`/api/reactions/${anna.userId}/${recordId}`) && r.request().method() === method
    );
    await card.getByTestId(`${prefix}-add`).click();
    await boris.page.getByTestId(`${prefix}-pick-${reaction}`).click();
    expect((await saved).ok()).toBe(true);
  };
  await react("dino_fire", "PUT");
  await expect(card.getByTestId(`${prefix}-pill-dino_fire`)).toContainText("1");

  await FriendsUtils_openTab(anna.page, "home");
  await expect(anna.page.getByTestId(`own-reaction-${recordId}-pill-dino_fire`)).toContainText("1", {
    timeout: 20000,
  });
  await expect(anna.page.getByText("Boris", { exact: false }).first()).toBeVisible();

  await react("dino_pr", "PUT");
  await expect(card.getByTestId(`${prefix}-pill-dino_pr`)).toContainText("1");
  await expect(card.getByTestId(`${prefix}-pill-dino_fire`)).toBeHidden();

  await react("dino_pr", "DELETE");
  await expect(card.getByTestId(`${prefix}-pill-dino_pr`)).toBeHidden();

  await FriendsUtils_openTab(anna.page, "home");
  await expect(anna.page.getByTestId("history-record").first()).toBeVisible({ timeout: 20000 });
  await expect(anna.page.getByTestId(`own-reaction-${recordId}-pill-dino_pr`)).toBeHidden();
  await expect(anna.page.getByTestId(`own-reaction-${recordId}-pill-dino_fire`)).toBeHidden();
  await FriendsUtils_close(anna, boris);
});

test("Declining and cancelling a request removes it on both sides", async ({ browser }) => {
  const anna = await FriendsUtils_signIn(browser, { withProgram: true });
  const boris = await FriendsUtils_signIn(browser, { withProgram: true });
  const token = await FriendsUtils_createInvite(anna, "Anna");

  await FriendsUtils_requestFollow(boris, token, "Boris");
  await FriendsUtils_openFriends(anna.page);
  const incoming = FriendsUtils_activeFriends(anna.page).getByTestId("friends-incoming").filter({ hasText: "Boris" });
  await incoming.getByTestId("friends-decline").click();
  await expect(incoming).toBeHidden({ timeout: 20000 });
  await FriendsUtils_openFriends(boris.page);
  await expect(FriendsUtils_activeFriends(boris.page).getByTestId("friends-outgoing")).toBeHidden();

  await FriendsUtils_requestFollow(boris, token);
  await FriendsUtils_openFriends(boris.page);
  const outgoing = FriendsUtils_activeFriends(boris.page).getByTestId("friends-outgoing").filter({ hasText: "Anna" });
  await outgoing.getByTestId("friends-cancel-request").click();
  await expect(outgoing).toBeHidden({ timeout: 20000 });
  await FriendsUtils_openFriends(anna.page);
  await expect(FriendsUtils_activeFriends(anna.page).getByTestId("friends-incoming")).toBeHidden();
  await FriendsUtils_close(anna, boris);
});

test("Unfollowing and removing a follower take the workouts off the feed", async ({ browser }) => {
  const anna = await FriendsUtils_signIn(browser, { withProgram: true });
  const boris = await FriendsUtils_signIn(browser, { withProgram: true });
  const carl = await FriendsUtils_signIn(browser, { withProgram: true });
  const token = await FriendsUtils_createInvite(anna, "Anna");
  await FriendsUtils_requestFollow(boris, token, "Boris");
  await FriendsUtils_requestFollow(carl, token, "Carl");
  await FriendsUtils_approve(anna, { from: "Boris", followBack: false });
  await FriendsUtils_approve(anna, { from: "Carl", followBack: false });
  await FriendsUtils_addWorkout(anna, new Date());

  await FriendsUtils_openFriends(boris.page);
  await FriendsUtils_activeFriends(boris.page).getByTestId("friends-following").filter({ hasText: "Anna" }).click();
  const unfollowed = boris.page.waitForResponse(
    (r) => r.url().includes(`/api/follows/following/${anna.userId}`) && r.request().method() === "DELETE"
  );
  await boris.page.getByTestId("friend-unfollow").click();
  expect((await unfollowed).ok()).toBe(true);
  await FriendsUtils_openTab(boris.page, "home");
  await FriendsUtils_waitForHomeFeed(boris.page);
  await expect(boris.page.getByTestId("feed-workout")).toBeHidden();

  await FriendsUtils_openFriends(anna.page);
  await FriendsUtils_activeFriends(anna.page).getByTestId("friends-follower").filter({ hasText: "Carl" }).click();
  const removed = anna.page.waitForResponse(
    (r) => r.url().includes(`/api/follows/followers/${carl.userId}`) && r.request().method() === "DELETE"
  );
  await anna.page.getByTestId("follower-remove").click();
  expect((await removed).ok()).toBe(true);
  await FriendsUtils_openTab(carl.page, "home");
  await FriendsUtils_waitForHomeFeed(carl.page);
  await expect(carl.page.getByTestId("feed-workout")).toBeHidden();
  await FriendsUtils_close(anna, boris, carl);
});

test("A user without a program follows from an invite and can still reach the Me screen", async ({ browser }) => {
  const anna = await FriendsUtils_signIn(browser, { withProgram: true });
  const dan = await FriendsUtils_signIn(browser, { withProgram: false });
  const token = await FriendsUtils_createInvite(anna, "Anna");

  await FriendsUtils_requestFollow(dan, token, "Dan");
  await FriendsUtils_visible(dan.page, "navbar-back").click();
  await expect(FriendsUtils_activeFriends(dan.page).getByTestId("friends-outgoing")).toBeVisible({ timeout: 20000 });
  await FriendsUtils_visible(dan.page, "navbar-back").click();
  await expect(FriendsUtils_visible(dan.page, "menu-item-friends")).toBeVisible();

  await FriendsUtils_approve(anna, { from: "Dan" });
  await FriendsUtils_visible(dan.page, "menu-item-friends").click();
  await FriendsUtils_activeFriends(dan.page)
    .getByTestId("friends-incoming")
    .filter({ hasText: "Anna" })
    .getByTestId("friends-approve")
    .click();
  await expect(dan.page.getByTestId("follow-approve")).toBeVisible();
  await expect(dan.page.getByTestId("program-select-adhoc")).toBeHidden();
  await FriendsUtils_close(anna, dan);
});

test("A coach edits a friend's program on the web, and the owner sees the edit", async ({ browser }) => {
  const anna = await FriendsUtils_signIn(browser, { withProgram: true });
  const boris = await FriendsUtils_signIn(browser, { withProgram: true });
  await FriendsUtils_befriend(anna, boris, { ownerNickname: "Anna", followerNickname: "Boris", programs: true });
  const programId = await FriendsUtils_addProgram(anna, "Coached", "# Week 1\n## Day 1\nSquat / 3x5 / 100lb");

  await boris.page.goto(`https://${localdomain}.liftosaur.com:${localport}/planner/friend/${anna.userId}/${programId}`);
  await expect(boris.page.getByTestId("planner-editor").locator(".cm-content").first()).toBeVisible({ timeout: 20000 });
  await boris.page.evaluate(() => {
    const cmContent = document.querySelector("[data-testid=planner-editor] .cm-content") as any;
    const view = cmContent.cmView.view;
    const text: string = view.state.doc.toString();
    view.update([view.state.update({ changes: { from: 0, to: text.length, insert: text.replace("100lb", "110lb") } })]);
  });
  const saved = boris.page.waitForResponse(
    (r) => r.url().includes(`/api/friends/${anna.userId}/programs/${programId}`) && r.request().method() === "POST"
  );
  await boris.page.getByTestId("web-save-planner").click();
  expect((await saved).ok()).toBe(true);

  const edits = await FriendsUtils_api(anna, "GET", "/api/program-edits");
  expect(edits.data.unseenCount).toBe(1);
  expect(edits.data.programs[0].latest.nickname).toBe("Boris");
  const detail = await FriendsUtils_api(anna, "GET", `/api/program-edits/${programId}`);
  expect(detail.data.edits[0].after).toContain("110lb");
  expect(detail.data.edits[0].before).toContain("100lb");
  await FriendsUtils_close(anna, boris);
});
