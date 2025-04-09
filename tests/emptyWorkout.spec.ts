import { PlaywrightUtils, startpage } from "./playwrightUtils";
import { test, expect } from "@playwright/test";

test("Empty Workout", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await page.getByRole("button", { name: "Basic Beginner Routine" }).click();
  PlaywrightUtils.disableSubscriptions(page);
  await page.getByTestId("clone-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-empty-workout").click();
  await page.getByTestId("add-exercise-button").click();
  await page.getByTestId("exercise-filter-by-name").fill("Bench Press");
  await page.getByTestId("menu-item-bench-press-barbell").click();

  await page.getByTestId("add-workout-set").click();
  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-reps-field").nth(0), "7");
  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-weight-field").nth(0), "100");

  await page.getByTestId("add-workout-set").click();
  await page.getByTestId("complete-set").nth(0).click();
  await page.getByTestId("complete-set").nth(1).click();

  await page.getByTestId("add-exercise-button").click();
  await page.getByTestId("exercise-filter-by-name").fill("Squat");
  await page.getByTestId("menu-item-squat-barbell").click();

  await page.getByTestId("add-exercise-button").scrollIntoViewIfNeeded();
  await page.getByTestId("entry-squat").getByTestId("add-workout-set").click();
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("entry-squat").getByTestId("input-set-reps-field").nth(0),
    "5"
  );
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("entry-squat").getByTestId("input-set-weight-field").nth(0),
    "150"
  );
  await page.getByTestId("entry-squat").getByTestId("complete-set").nth(0).click();

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await expect(page.getByTestId("history-record-program").nth(0)).toHaveText("Ad-Hoc Workout");
  await expect(
    page
      .getByTestId("history-record")
      .nth(0)
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("100lb");
  await expect(
    page
      .getByTestId("history-record")
      .nth(0)
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press') >> [data-cy=history-entry-sets-completed]")
      .first()
  ).toHaveText("2 × 7 × 100lb");
  await expect(
    page
      .getByTestId("history-record")
      .nth(0)
      .locator("[data-cy=history-entry-exercise]:has-text('Squat') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("150lb");
  await expect(
    page
      .getByTestId("history-record")
      .nth(0)
      .locator("[data-cy=history-entry-exercise]:has-text('Squat') >> [data-cy=history-entry-sets-completed]")
      .first()
  ).toHaveText("5 × 150lb");
});
