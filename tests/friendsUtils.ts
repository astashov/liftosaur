/* eslint-disable @typescript-eslint/no-explicit-any */
import { Browser, BrowserContext, Locator, Page, expect, test } from "@playwright/test";
import { localapidomain, localapiport } from "../src/localdomain";
import { PlaywrightUtils_activeScreen, startpage } from "./playwrightUtils";

const apiHost = `https://${localapidomain}.liftosaur.com:${localapiport}`;
const slowMs = 20000;

export interface IFriendsUser {
  context: BrowserContext;
  page: Page;
  userId: string;
}

// forceuseremail makes WhatsNew_newUpdates return nothing, so the "What's new" modal never covers the
// tab bar. Sign-in goes through debugLogin, so nothing else reads the parameter.
export function FriendsUtils_appUrl(params: Record<string, string> = {}): string {
  const query = new URLSearchParams({ skipintro: "1", forceuseremail: "playwright", ...params });
  return `${startpage}?${query.toString()}`;
}

export function FriendsUtils_visible(page: Page, testId: string): Locator {
  return page.getByTestId(testId).and(page.locator(":visible")).first();
}

export async function FriendsUtils_waitForHomeFeed(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const home = (window as any).state?.social?.pages?.home;
      return home != null && !home.isLoading && home.loadedAt != null;
    },
    undefined,
    { timeout: slowMs }
  );
}

export function FriendsUtils_activeFriends(page: Page): Locator {
  return PlaywrightUtils_activeScreen(page);
}

async function waitForApp(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as any).state?.storage != null);
  await page.waitForTimeout(2500);
  for (const id of ["hear-about-us-skip", "modal-close"]) {
    const button = page.getByTestId(id);
    if (await button.isVisible()) {
      await button.click();
      await expect(button).toBeHidden();
    }
  }
}

export async function FriendsUtils_signIn(browser: Browser, args: { withProgram: boolean }): Promise<IFriendsUser> {
  const { baseURL: _baseURL, ...contextOptions } = test.info().project.use;
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(FriendsUtils_appUrl());
  await page.waitForFunction(() => (window as any).debugLogin != null && (window as any).state?.storage != null);
  const result = await page.evaluate(() => (window as any).debugLogin());
  expect(result.userId, JSON.stringify(result)).toMatch(/^test_/);
  await expect(page.getByTestId("program-select-adhoc")).toBeVisible({ timeout: slowMs });
  if (args.withProgram) {
    await page.getByTestId("program-select-adhoc").click();
    await expect.poll(() => page.evaluate(() => (window as any).state.storage.currentProgramId)).toBeTruthy();
  }
  return { context, page, userId: result.userId };
}

export async function FriendsUtils_setNicknameInGate(page: Page, nickname: string): Promise<void> {
  await FriendsUtils_visible(page, "nickname-gate-input").fill(nickname);
  await FriendsUtils_visible(page, "nickname-gate-save").click();
}

export async function FriendsUtils_openTab(page: Page, tab: "home" | "me"): Promise<void> {
  await page.goto(FriendsUtils_appUrl());
  await waitForApp(page);
  await page.getByTestId(`footer-${tab}`).click();
}

export async function FriendsUtils_openFriends(page: Page): Promise<void> {
  await FriendsUtils_openTab(page, "me");
  await PlaywrightUtils_activeScreen(page).getByTestId("menu-item-friends").click();
  await expect(PlaywrightUtils_activeScreen(page).getByTestId("friends-invite")).toBeVisible({ timeout: slowMs });
}

export async function FriendsUtils_createInvite(user: IFriendsUser, nickname: string): Promise<string> {
  await FriendsUtils_openFriends(user.page);
  await PlaywrightUtils_activeScreen(user.page).getByTestId("friends-invite").click();
  await FriendsUtils_setNicknameInGate(user.page, nickname);
  await expect(user.page.getByTestId("friend-invite-share")).toBeVisible({ timeout: slowMs });
  const response = await user.context.request.post(`${apiHost}/api/follow/invites`, { data: {} });
  expect(response.ok()).toBe(true);
  return (await response.json()).data.token;
}

export async function FriendsUtils_openInvite(user: IFriendsUser, token: string): Promise<void> {
  await user.page.goto(FriendsUtils_appUrl({ followInvite: token }));
  await waitForApp(user.page);
}

export async function FriendsUtils_requestFollow(user: IFriendsUser, token: string, nickname?: string): Promise<void> {
  await FriendsUtils_openInvite(user, token);
  if (nickname != null) {
    await FriendsUtils_setNicknameInGate(user.page, nickname);
  }
  await user.page.getByTestId("follow-invite-send").click();
  await expect(user.page.getByText(/Request sent/)).toBeVisible({ timeout: slowMs });
}

export async function FriendsUtils_approve(
  user: IFriendsUser,
  args: { from: string; programs?: boolean; followBack?: boolean }
): Promise<void> {
  await FriendsUtils_openFriends(user.page);
  await PlaywrightUtils_activeScreen(user.page)
    .getByTestId("friends-incoming")
    .filter({ hasText: args.from })
    .getByTestId("friends-approve")
    .click();
  await expect(user.page.getByTestId("follow-approve")).toBeVisible();
  if (args.programs) {
    await user.page.getByTestId("follow-permission-programs").click();
  }
  if (args.followBack === false) {
    await user.page.getByTestId("follow-back").click();
  }
  await user.page.getByTestId("follow-approve").click();
  await expect(
    PlaywrightUtils_activeScreen(user.page).getByTestId("friends-follower").filter({ hasText: args.from })
  ).toBeVisible({ timeout: slowMs });
}

async function apiKey(user: IFriendsUser): Promise<string> {
  const response = await user.context.request.post(`${apiHost}/api/apikeys`, { data: { name: "playwright" } });
  expect(response.ok()).toBe(true);
  return (await response.json()).data.key;
}

export async function FriendsUtils_api(
  user: IFriendsUser,
  method: "GET" | "POST",
  path: string,
  data?: unknown
): Promise<any> {
  const response = await user.context.request.fetch(`${apiHost}${path}`, { method, data });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

export async function FriendsUtils_addProgram(user: IFriendsUser, name: string, text: string): Promise<string> {
  const key = await apiKey(user);
  const response = await user.context.request.post(`${apiHost}/api/v1/programs`, {
    headers: { Authorization: `Bearer ${key}` },
    data: { name, text },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).data.id;
}

export async function FriendsUtils_addWorkout(user: IFriendsUser, date: Date): Promise<number> {
  const key = await apiKey(user);
  const stamp = date
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, " +00:00");
  const response = await user.context.request.post(`${apiHost}/api/v1/history`, {
    headers: { Authorization: `Bearer ${key}` },
    data: { text: `${stamp} / exercises: {\n  Squat / 3x5 100lb\n}` },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).data.id;
}

export async function FriendsUtils_befriend(
  owner: IFriendsUser,
  follower: IFriendsUser,
  args: { ownerNickname: string; followerNickname: string; programs?: boolean }
): Promise<void> {
  const token = await FriendsUtils_createInvite(owner, args.ownerNickname);
  await FriendsUtils_requestFollow(follower, token, args.followerNickname);
  await FriendsUtils_approve(owner, { from: args.followerNickname, programs: args.programs, followBack: false });
}

export async function FriendsUtils_close(...users: IFriendsUser[]): Promise<void> {
  await Promise.all(users.map((u) => u.context.close()));
}
