import { test, expect, Page } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_typeKeyboard,
  PlaywrightUtils_swipeLeft,
  PlaywrightUtils_createProgram,
  PlaywrightUtils_createProgramWithCode,
  PlaywrightUtils_disableTours,
} from "./playwrightUtils";

async function createSetTimerProgram(page: Page, exercise: string): Promise<void> {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgramWithCode(
    page,
    "My Program",
    `# Week 1
## Day 1
${exercise} / warmup: none / progress: none`
  );
}

test("set timer - play, record, and show in history", async ({ page }) => {
  await createSetTimerProgram(page, "Bench Press / 3x1 100lb 30s|60s");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  // Timed sets show a play button instead of a checkmark.
  await expect(page.getByTestId("start-set-timer")).toHaveCount(3);
  await expect(page.getByTestId("complete-set")).toHaveCount(0);

  // Record the first set via the set-timer banner.
  await page.getByTestId("start-set-timer").first().click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();
  await page.getByTestId("set-timer-stop-record").click();

  await expect(page.getByTestId("set-timer-current")).toHaveCount(0);
  await expect(page.getByTestId("start-set-timer")).toHaveCount(2);
  await expect(page.getByTestId("set-timer-value")).toHaveCount(1);

  // Record the remaining two sets.
  await page.getByTestId("start-set-timer").first().click();
  await page.getByTestId("set-timer-stop-record").click();
  await page.getByTestId("start-set-timer").first().click();
  await page.getByTestId("set-timer-stop-record").click();

  await expect(page.getByTestId("start-set-timer")).toHaveCount(0);

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await expect(page.getByTestId("history-entry-set-timer").first()).toBeVisible();
});

test("set timer - discard does not record, log-keep records but keeps timing", async ({ page }) => {
  await createSetTimerProgram(page, "Bench Press / 2x1 100lb 30s|60s");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  // Discard leaves the set untouched.
  await page.getByTestId("start-set-timer").first().click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();
  await page.getByTestId("set-timer-discard").click();
  await expect(page.getByTestId("set-timer-current")).toHaveCount(0);
  await expect(page.getByTestId("start-set-timer")).toHaveCount(2);
  await expect(page.getByTestId("set-timer-value")).toHaveCount(0);

  // Log & keep timing records the set but keeps the banner open. Once logged, both record buttons are
  // hidden — only "Discard & close" remains.
  await page.getByTestId("start-set-timer").first().click();
  await page.getByTestId("set-timer-log-keep").click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();
  await expect(page.getByTestId("set-timer-log-keep")).toHaveCount(0);
  await expect(page.getByTestId("set-timer-stop-record")).toHaveCount(0);
  await page.getByTestId("set-timer-discard").click();

  await expect(page.getByTestId("set-timer-current")).toHaveCount(0);
  await expect(page.getByTestId("start-set-timer")).toHaveCount(1);
  await expect(page.getByTestId("set-timer-value")).toHaveCount(1);
});

test("set timer - edit recorded time after recording", async ({ page }) => {
  await createSetTimerProgram(page, "Bench Press / 1x1 100lb 30s|60s");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("start-set-timer").first().click();
  await page.getByTestId("set-timer-stop-record").click();

  await page.getByTestId("set-timer-value").click();
  await page.getByTestId("set-timer-edit-minutes-input").fill("1");
  await page.getByTestId("set-timer-edit-seconds-input").fill("30");
  await page.getByTestId("set-timer-edit-submit").click();

  await expect(page.getByTestId("set-timer-value")).toHaveText("01:30");
});

test("set timer - clear recorded time", async ({ page }) => {
  await createSetTimerProgram(page, "Bench Press / 1x1 100lb 30s|60s");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("start-set-timer").first().click();
  await page.getByTestId("set-timer-stop-record").click();

  await expect(page.getByTestId("set-timer-value")).toHaveCount(1);
  await page.getByTestId("set-timer-value").click();
  await page.getByTestId("set-timer-edit-clear").click();

  await expect(page.getByTestId("set-timer-value")).toHaveCount(0);
});

test("set timer - editor Set Time column and overflow round-trip to liftoscript", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("add-exercise").click();
  await page.getByTestId("exercise-filter-by-name").fill("Bench Press");
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("edit-exercise").click();

  await PlaywrightUtils_swipeLeft(page, page.getByTestId("set-x").nth(0));
  await page.getByTestId("edit-set").nth(0).click();
  await page.getByTestId("menu-item-name-set-time").click();
  await page.getByTestId("menu-item-name-rest").click();
  await page.getByTestId("bottom-sheet-close").and(page.locator(":visible")).click();

  await PlaywrightUtils_typeKeyboard(page, page.getByTestId("input-set-time-value-field"), "45");
  await PlaywrightUtils_typeKeyboard(page, page.getByTestId("input-timer-value-field"), "90");

  // Toggle "count up past target" (the `+` overflow) from the set-time keyboard addon.
  await page.getByTestId("input-set-time-value-field").click();
  await page.getByTestId("keyboard-addon-set-time-overflow").click();
  await page.getByTestId("keyboard-close").click();

  await page.getByTestId("save-program-exercise").click();
  await page.getByTestId("editor-v2-perday-program").click();

  await expect(page.getByTestId("planner-editor")).toContainText("45s+|90s");
});

test("set timer - editor bottom sheet renames Timer to Rest", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("add-exercise").click();
  await page.getByTestId("exercise-filter-by-name").fill("Bench Press");
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("edit-exercise").click();

  await PlaywrightUtils_swipeLeft(page, page.getByTestId("set-x").nth(0));
  await page.getByTestId("edit-set").nth(0).click();

  await expect(page.getByTestId("menu-item-name-rest")).toBeVisible();
  await expect(page.getByTestId("menu-item-name-set-time")).toBeVisible();
  await expect(page.getByTestId("menu-item-name-timer")).toHaveCount(0);
});

test("set timer - recording a timed set prompts the AMRAP modal (reps, weight, RPE)", async ({ page }) => {
  // `1+` (AMRAP reps) + `100lb+` (asks weight) + `@8+` (logs RPE) all funnel through the same modal.
  await createSetTimerProgram(page, "Bench Press / 1x1+ 100lb+ @8+ 30s|60s");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("start-set-timer").first().click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();
  await page.getByTestId("set-timer-stop-record").click();

  // The banner closes and the AMRAP modal opens with all three prompts.
  await expect(page.getByTestId("set-timer-current")).toHaveCount(0);
  await page.getByTestId("modal-amrap-input").fill("12");
  await page.getByTestId("modal-amrap-weight-input").fill("20");
  await page.getByTestId("modal-rpe-input").fill("9");
  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("start-set-timer")).toHaveCount(0);
  await expect(page.getByTestId("set-timer-value")).toHaveCount(1);
  await expect(page.getByTestId("rpe-value")).toHaveText("@9");

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await expect(page.getByTestId("history-entry-set-timer").first()).toBeVisible();
});

test("set timer - EMOM circuit auto-advances between sets (no rest)", async ({ page }) => {
  await createSetTimerProgram(page, "Power Clean / 2x5 135lb 30s|0s auto");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await expect(page.getByTestId("start-set-timer")).toHaveCount(2);

  await page.getByTestId("start-set-timer").first().click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();

  // With `auto` and no rest, recording advances straight to the next set in the same banner.
  await page.getByTestId("set-timer-stop-record").click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();
  await expect(page.getByTestId("start-set-timer")).toHaveCount(1);

  // Recording the last set finds no next timed set, so the banner closes.
  await page.getByTestId("set-timer-stop-record").click();
  await expect(page.getByTestId("set-timer-current")).toHaveCount(0);
  await expect(page.getByTestId("start-set-timer")).toHaveCount(0);
  await expect(page.getByTestId("set-timer-value")).toHaveCount(2);
});

test("set timer - Tabata circuit reopens the banner after the rest timer", async ({ page }) => {
  // Short rest so the auto-advance after rest fires quickly; long work timer so it never auto-fires
  // while the test is interacting with the banner.
  await createSetTimerProgram(page, "Plank / 2x1+ 30s|2s auto");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await expect(page.getByTestId("start-set-timer")).toHaveCount(2);

  await page.getByTestId("start-set-timer").first().click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();
  await page.getByTestId("set-timer-stop-record").click();

  // AMRAP + bodyweight prompt, then the banner closes and the rest timer runs.
  await page.getByTestId("modal-amrap-input").fill("10");
  await page.getByTestId("modal-amrap-weight-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();
  await expect(page.getByTestId("set-timer-current")).toHaveCount(0);

  // When the rest timer expires, the circuit auto-reopens the banner for the next set.
  await expect(page.getByTestId("set-timer-current")).toBeVisible({ timeout: 4000 });

  await page.getByTestId("set-timer-stop-record").click();
  await page.getByTestId("modal-amrap-input").fill("8");
  await page.getByTestId("modal-amrap-weight-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("start-set-timer")).toHaveCount(0);
  await expect(page.getByTestId("set-timer-value")).toHaveCount(2);
});

test("set timer - non-overflow set auto-completes when it reaches the target", async ({ page }) => {
  // Short 2s target so the test can wait for the auto-completion.
  await createSetTimerProgram(page, "Bench Press / 1x1 100lb 2s|60s");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("start-set-timer").first().click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();

  // A non-overflow timed set has a fixed work duration: once the target elapses it records and
  // completes on its own, with no manual "Stop & record".
  await expect(page.getByTestId("set-timer-current")).toHaveCount(0, { timeout: 5000 });
  await expect(page.getByTestId("start-set-timer")).toHaveCount(0);
  await expect(page.getByTestId("set-timer-value")).toHaveCount(1);
});

test("set timer - overflow set counts up past the target without auto-completing", async ({ page }) => {
  await createSetTimerProgram(page, "Bench Press / 1x1 100lb 2s+|60s");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("start-set-timer").first().click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();

  // The `+` overflow keeps counting past the target — the banner stays open until stopped manually.
  await page.waitForTimeout(3000);
  await expect(page.getByTestId("set-timer-current")).toBeVisible();

  await page.getByTestId("set-timer-stop-record").click();
  await expect(page.getByTestId("set-timer-current")).toHaveCount(0);
  await expect(page.getByTestId("start-set-timer")).toHaveCount(0);
  await expect(page.getByTestId("set-timer-value")).toHaveCount(1);
});

test("set timer - log & keep timing still auto-closes at the target", async ({ page }) => {
  await createSetTimerProgram(page, "Bench Press / 1x1 100lb 3s|60s");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("start-set-timer").first().click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();

  // Log & keep timing logs the set but keeps the clock running underneath.
  await page.getByTestId("set-timer-log-keep").click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();

  // The kept clock still reaches the non-overflow target — it must close the banner and start rest on its
  // own instead of running forever.
  await expect(page.getByTestId("set-timer-current")).toHaveCount(0, { timeout: 6000 });
  await expect(page.getByTestId("start-set-timer")).toHaveCount(0);
  await expect(page.getByTestId("set-timer-value")).toHaveCount(1);
});

test("set timer - log & keep timing on an AMRAP set keeps the clock through the modal", async ({ page }) => {
  await createSetTimerProgram(page, "Bench Press / 1x1+ 100lb+ @8+ 30s|60s");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("start-set-timer").first().click();
  await expect(page.getByTestId("set-timer-current")).toBeVisible();

  // Log & keep timing records, opens the AMRAP modal on top, and keeps the clock running underneath.
  await page.getByTestId("set-timer-log-keep").click();
  await expect(page.getByTestId("set-timer-current")).toHaveCount(0);

  await page.getByTestId("modal-amrap-input").fill("12");
  await page.getByTestId("modal-amrap-weight-input").fill("20");
  await page.getByTestId("modal-rpe-input").fill("9");
  await page.getByTestId("modal-amrap-submit").click();

  // The clock survives the AMRAP resolution — the banner is shown again, still timing.
  await expect(page.getByTestId("set-timer-current")).toBeVisible();
  await expect(page.getByTestId("rpe-value")).toHaveText("@9");

  // The set is logged now, so the record buttons are hidden — only Discard remains.
  await expect(page.getByTestId("set-timer-stop-record")).toHaveCount(0);
  await expect(page.getByTestId("set-timer-log-keep")).toHaveCount(0);
  await page.getByTestId("set-timer-discard").click();
  await expect(page.getByTestId("set-timer-current")).toHaveCount(0);
  await expect(page.getByTestId("modal-amrap-input")).toHaveCount(0);
  await expect(page.getByTestId("start-set-timer")).toHaveCount(0);
  await expect(page.getByTestId("set-timer-value")).toHaveCount(1);
});
