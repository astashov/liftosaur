import { test, expect, Page } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_createProgramWithCode,
  PlaywrightUtils_disableTours,
  PlaywrightUtils_typeKeyboard,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
} from "./playwrightUtils";

interface IWarmup {
  weight: number | undefined;
  done: boolean;
}

function squatWarmups(page: Page): Promise<IWarmup[]> {
  return page.evaluate(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const entries = (window as any).state.storage.progress?.[0]?.entries ?? [];
    const entry = entries.find((e: any) => e.exercise?.id === "squat");
    return (entry?.warmupSets ?? []).map((s: any) => ({ weight: s.weight?.value, done: !!s.isCompleted }));
  });
}

function weights(warmups: IWarmup[]): (number | undefined)[] {
  return warmups.map((w) => w.weight);
}

async function startWithProgram(page: Page, code: string): Promise<void> {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgramWithCode(page, "My Program", `# Week 1\n## Day 1\n${code}`);
}

async function startWorkout(page: Page): Promise<void> {
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();
}

async function editSquatFromWorkout(page: Page, text: string): Promise<void> {
  await page.getByTestId("exercise-options").first().click();
  await page.getByTestId("exercise-edit-mode").click();
  const sheet = page.getByTestId("exercise-liftoeditor");
  await expect(sheet.getByTestId("planner-editor")).toContainText("Squat");
  await PlaywrightUtils_clearCodeMirror(page, "exercise-liftoeditor");
  await PlaywrightUtils_typeCodeMirror(page, "exercise-liftoeditor", text);
  await sheet.getByTestId("exercise-liftoeditor-save").click();
  await expect(sheet).toBeHidden();
}

async function openSquatStats(page: Page): Promise<void> {
  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-exercises").click();
  await page.getByTestId("menu-item-squat").click();
  await expect(page.getByTestId("exercise-stats-image")).toBeVisible();
}

test("default warmups from Exercise Stats reach the workout, with their thresholds", async ({ page }) => {
  await startWithProgram(page, "Squat / 3x5 200lb / progress: none");

  await openSquatStats(page);
  await page.getByTestId("customize-default-warmups").click();
  const rows = page.getByTestId("default-warmup-set");
  await expect(rows).toHaveCount(3);
  await PlaywrightUtils_typeKeyboard(page, rows.first().getByTestId("input-default-warmup-weight-field"), "40");
  await PlaywrightUtils_typeKeyboard(page, rows.first().getByTestId("input-default-warmup-threshold-field"), "150");
  await expect
    .poll(() => page.evaluate(() => (window as any).state.storage.settings.exerciseData.squat_barbell?.warmups?.[0]))
    .toEqual({ numberOfSets: 1, reps: 5, percentage: 40, threshold: { value: 150, unit: "lb" } });

  await startWorkout(page);
  await expect.poll(async () => weights(await squatWarmups(page))).toEqual([80, 100, 160]);

  await editSquatFromWorkout(page, "Squat / 3x5 100lb / progress: none");
  await expect.poll(async () => weights(await squatWarmups(page))).toEqual([50, 80]);
});

test("Use built-in works when the screen opens with a custom scheme", async ({ page }) => {
  await startWithProgram(page, "Squat / 3x5 200lb / progress: none");
  await openSquatStats(page);
  await page.getByTestId("customize-default-warmups").click();
  await expect(page.getByTestId("default-warmup-set")).toHaveCount(3);

  await page.getByTestId("navbar-back").and(page.locator(":visible")).last().click();
  await page.getByTestId("menu-item-squat").click();
  await expect(page.getByTestId("default-warmup-set")).toHaveCount(3);
  await page.getByTestId("builtin-default-warmups").click();

  await expect(page.getByTestId("default-warmup-set")).toHaveCount(0);
  await expect(page.getByTestId("builtin-warmup-set")).toHaveCount(3);
  await expect(page.getByTestId("builtin-warmup-set").first()).toContainText("skip if first set ≤ 120lb");
  await expect(page.getByTestId("customize-default-warmups")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as any).state.storage.settings.exerciseData.squat_barbell?.warmups))
    .toBeUndefined();
});

test("a warmup's own rest time starts the rest timer", async ({ page }) => {
  await startWithProgram(page, "Squat / 3x5 200lb / warmup: 1x5 50% 30s, 1x3 80% / progress: none");
  await startWorkout(page);

  await page.getByTestId("complete-set").first().click();
  await expect.poll(async () => (await squatWarmups(page)).map((w) => w.done)).toEqual([true, false]);
  await page.getByTestId("rest-timer-collapsed").click();
  await expect(page.getByTestId("rest-timer-total")).toHaveText("00:30");
});

test("warmups follow a program change until one of them is completed", async ({ page }) => {
  await startWithProgram(page, "Squat / 3x5 200lb / warmup: 1x5 50%, 1x3 80% / progress: none");
  await startWorkout(page);
  await expect.poll(async () => weights(await squatWarmups(page))).toEqual([100, 160]);

  await editSquatFromWorkout(page, "Squat / 3x5 300lb / warmup: 1x5 50%, 1x3 80% / progress: none");
  await expect.poll(async () => weights(await squatWarmups(page))).toEqual([150, 240]);

  await page.getByTestId("complete-set").first().click();
  await expect.poll(async () => (await squatWarmups(page)).map((w) => w.done)).toEqual([true, false]);

  await editSquatFromWorkout(page, "Squat / 3x5 200lb / warmup: 1x5 50%, 1x3 80% / progress: none");
  await expect.poll(async () => weights(await squatWarmups(page))).toEqual([150, 240]);
});

test("an update script sets a warmup weight at workout start", async ({ page }) => {
  await startWithProgram(
    page,
    "Squat / 3x5 200lb / warmup: 1x5 50%, 1x3 80% / progress: none / update: custom() {~ if (setIndex == 0) { warmupWeights[1] = 60lb } ~}"
  );
  await startWorkout(page);
  await expect.poll(async () => weights(await squatWarmups(page))).toEqual([60, 160]);
});
