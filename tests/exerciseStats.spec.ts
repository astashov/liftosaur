import { test, expect, Page } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

async function finishExercise(page: Page, name: string): Promise<void> {
  const exerciseSets = page.locator(`[data-cy^=exercise-]:has-text('${name}') [data-cy^=set-]`);
  PlaywrightUtils.clickAll(exerciseSets);
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();
}

async function switchBackToFirstDay(page: Page): Promise<void> {
  await page.getByTestId("footer-program").click({ force: true });
  await page.getByTestId("menu-item-name-next-day").click({ force: true });
  await page.getByTestId("scroll-barrel-item-week-1---workout-a").first().scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-week-1---workout-a").first().click();
  await page.waitForTimeout(1000);
  await page.getByTestId("navbar-back").click({ force: true });
}

test("works", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.locator("button:has-text('Basic Beginner Routine')").click({ force: true });
  await page.getByTestId("clone-program").click({ force: true });
  await page.getByTestId("start-workout").click({ force: true });
  await page.getByTestId("entry-bent-over-row").getByTestId("exercise-name").click({ force: true });
  await expect(page.getByTestId("exercise-stats-image")).toBeVisible();
  await expect(page.getByTestId("max-weight-value")).not.toBeVisible();
  await expect(page.getByTestId("one-rm-value")).not.toBeVisible();
  await expect(page.getByTestId("history-entry-sets-completed")).not.toBeVisible();
  await expect(page.getByTestId("graph-data")).not.toBeVisible();

  await page.getByTestId("navbar-back").click({ force: true });
  await finishExercise(page, "Bent Over Row");
  await finishExercise(page, "Bench Press");
  await finishExercise(page, "Squat");
  await page.getByRole("button", { name: "Finish the workout" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await switchBackToFirstDay(page);

  await page.getByTestId("start-workout").click({ force: true });
  await page.getByTestId("entry-bent-over-row").getByTestId("exercise-name").click({ force: true });
  await expect(page.getByTestId("exercise-stats-image")).toBeVisible();
  await expect(page.getByTestId("max-weight-value")).toHaveText("95 lb");
  await expect(page.getByTestId("one-rm-value")).toHaveText("109.8 lb (5 x 95 lb)");
  await expect(page.getByTestId("history-entry-sets-completed")).toHaveText("Weight, e1RM 🏆3 × 5 × 95lb");
  await expect(page.getByTestId("graph-data")).not.toBeVisible();

  await page.getByTestId("navbar-back").click({ force: true });
  await finishExercise(page, "Bent Over Row");
  await finishExercise(page, "Bench Press");
  await finishExercise(page, "Squat");
  await page.getByRole("button", { name: "Finish the workout" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await switchBackToFirstDay(page);

  await page.getByTestId("start-workout").click({ force: true });
  await page.getByTestId("entry-bent-over-row").getByTestId("exercise-name").click({ force: true });
  await expect(page.getByTestId("max-weight-value")).toHaveText("100 lb");
  await expect(page.getByTestId("one-rm-value")).toHaveText("115.55 lb (5 x 100 lb)");
  await expect(page.getByTestId("history-entry-weight").nth(0)).toHaveText("100lb");
  await page.getByTestId("exercise-stats-history-filter").click({ force: true });
  await page.getByTestId("menu-item-name-ascending-sort-by-date").click({ force: true });
  await expect(page.getByTestId("history-entry-weight").nth(0)).toHaveText("95lb");
  await expect(page.getByTestId("graph-data")).toBeVisible();
});
