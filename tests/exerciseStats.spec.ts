import { test, expect, Page } from "@playwright/test";
import { PlaywrightUtils_activeScreen } from "./playwrightUtils";
import {
  startpage,
  PlaywrightUtils_finishExercise,
  PlaywrightUtils_selectBuiltin,
  PlaywrightUtils_disableTours,
} from "./playwrightUtils";

async function switchBackToFirstDay(page: Page): Promise<void> {
  await page.getByTestId("footer-program").click({ force: true });
  await page.getByTestId("change-program-day").click();
  await page.getByTestId("menu-item-next-day-picker-1").first().scrollIntoViewIfNeeded();
  await page.getByTestId("menu-item-next-day-picker-1").first().click();
  await page.waitForTimeout(1000);
  await page.getByTestId("footer-home").click({ force: true });
}

test("works", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_selectBuiltin(page);
  await page.locator("button:has-text('Basic Beginner Routine')").click();
  await page.getByTestId("clone-program").click();
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("entry-bent-over-row").getByTestId("exercise-name").click();
  await expect(page.getByTestId("exercise-stats-image")).toBeVisible();
  await expect(page.getByTestId("max-weight-value")).not.toBeVisible();
  await expect(page.getByTestId("one-rm-value")).not.toBeVisible();
  await expect(page.getByTestId("history-entry-sets-completed")).not.toBeVisible();
  await expect(page.getByTestId("graph-data")).not.toBeVisible();

  await page.getByTestId("navbar-back").click();
  await PlaywrightUtils_finishExercise(page, "bent-over-row", [1, 1, { amrap: { reps: 5 } }]);

  await PlaywrightUtils_finishExercise(page, "bench-press", [1, 1, { amrap: { reps: 5 } }]);
  await PlaywrightUtils_finishExercise(page, "squat", [1, 1, { amrap: { reps: 5 } }]);
  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await switchBackToFirstDay(page);

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();
  await page.getByTestId("entry-bent-over-row").getByTestId("exercise-name").click();
  await expect(page.getByTestId("exercise-stats-image")).toBeVisible();
  await expect(page.getByTestId("max-weight-value").and(page.locator(":visible"))).toHaveText("95 lb");
  await expect(page.getByTestId("one-rm-value").and(page.locator(":visible"))).toHaveText("109.8 lb (5 x 95 lb)");
  await expect(page.getByTestId("history-entry-sets-completed").and(page.locator(":visible"))).toHaveText(
    "Weight, e1RM 🏆3 × 5 × 95lb"
  );
  await expect(page.getByTestId("graph-data")).not.toBeVisible();

  await page.getByTestId("navbar-back").click();
  await PlaywrightUtils_finishExercise(page, "bent-over-row", [1, 1, 1, { amrap: { reps: 5 } }]);

  await PlaywrightUtils_finishExercise(page, "bench-press", [1, 1, 1, { amrap: { reps: 5 } }]);
  await PlaywrightUtils_finishExercise(page, "squat", [1, 1, 1, { amrap: { reps: 5 } }]);
  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await switchBackToFirstDay(page);

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();
  await page.getByTestId("entry-bent-over-row").getByTestId("exercise-name").click();
  await expect(page.getByTestId("max-weight-value").and(page.locator(":visible"))).toHaveText("97.5 lb");
  await expect(page.getByTestId("one-rm-value").and(page.locator(":visible"))).toHaveText("112.7 lb (5 x 97.5 lb)");
  await expect(page.getByTestId("history-entry-weight").nth(0)).toHaveText("97.5lb");
  await page.getByTestId("exercise-stats-history-filter").and(page.locator(":visible")).click();
  await page.getByTestId("menu-item-name-ascending-sort-by-date").click();
  await expect(page.getByTestId("history-entry-weight").nth(0)).toHaveText("95lb");
  await expect(PlaywrightUtils_activeScreen(page).getByTestId("graph-data")).toBeVisible();
});
