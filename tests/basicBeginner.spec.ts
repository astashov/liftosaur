import { PlaywrightUtils, startpage } from "./playwrightUtils";
import { test, expect } from "@playwright/test";

test("Basic Beginner Program", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await page.getByRole("button", { name: "Basic Beginner Routine" }).click();
  PlaywrightUtils.disableSubscriptions(page);
  await page.getByTestId("clone-program").click();
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  // Workout A

  // First exercise is successful
  await page.locator("[data-cy^=exercise-]:has-text('Bent Over Row')").getByTestId("exercise-options").click();
  await page.locator("[data-cy^=exercise-]:has-text('Bent Over Row')").getByTestId("exercise-edit-mode").click();
  await page.getByTestId("modal-edit-mode").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-barbell").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-barbell").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("modal-edit-mode-save-statvars").click();

  await PlaywrightUtils.clickAll(page.getByTestId("entry-bent-over-row").getByTestId("complete-set"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();

  await PlaywrightUtils.forEach(page.getByTestId("input-set-weight-field"), async (item) => {
    await PlaywrightUtils.typeKeyboard(page, item, "140");
  });

  // Second exercise is successful
  await page.getByTestId("workout-tab-squat").click();
  await page.getByTestId("entry-squat").getByTestId("exercise-options").click();
  await page.getByTestId("entry-squat").getByTestId("exercise-edit-mode").click();
  await page.getByTestId("modal-edit-mode").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-barbell").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-barbell").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("modal-edit-mode-save-statvars").click();

  await PlaywrightUtils.clickAll(page.getByTestId("entry-squat").getByTestId("complete-set"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();

  await PlaywrightUtils.forEach(page.getByTestId("input-set-weight-field"), async (item) => {
    await PlaywrightUtils.typeKeyboard(page, item, "200");
  });

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  // Workout B

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  // First exercise is successful
  await PlaywrightUtils.clickAll(page.getByTestId("entry-chin-up").getByTestId("complete-set"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();

  // Second exercise is successful
  await page.getByTestId("workout-tab-deadlift").click();
  await page.locator("[data-cy^=exercise-]:has-text('Deadlift')").getByTestId("exercise-options").click();
  await page.locator("[data-cy^=exercise-]:has-text('Deadlift')").getByTestId("exercise-edit-mode").click();
  await page.getByTestId("modal-edit-mode").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-barbell").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-barbell").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("modal-edit-mode-save-statvars").click();

  await PlaywrightUtils.clickAll(page.getByTestId("entry-deadlift").getByTestId("complete-set"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();

  await PlaywrightUtils.forEach(
    page.getByTestId("entry-deadift").getByTestId("input-set-weight-field"),
    async (item) => {
      await PlaywrightUtils.typeKeyboard(page, item, "250");
    }
  );

  // Third exercise is unsuccessful
  await page.getByTestId("workout-tab-overhead-press").click();
  await page.locator("[data-cy^=exercise-]:has-text('Overhead Press')").getByTestId("exercise-options").click();
  await page.locator("[data-cy^=exercise-]:has-text('Overhead Press')").getByTestId("exercise-edit-mode").click();
  await page.getByTestId("modal-edit-mode").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-barbell").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-barbell").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("modal-edit-mode-save-statvars").click();

  await PlaywrightUtils.clickAll(page.getByTestId("entry-overhead-press").getByTestId("complete-set"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("entry-overhead-press").getByTestId("input-set-reps-field").nth(0),
    "3"
  );

  await PlaywrightUtils.forEach(
    page.getByTestId("entry-overhead-press").getByTestId("input-set-weight-field"),
    async (item) => {
      await PlaywrightUtils.typeKeyboard(page, item, "100");
    }
  );

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  // Check next exercise conditions
  await page.getByTestId("footer-workout").click();
  await expect(
    page
      .getByTestId("bottom-sheet")
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Bent Over Row') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("97.5lb");
  await expect(
    page
      .getByTestId("bottom-sheet")
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Squat') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("50lb");
  await expect(
    page
      .getByTestId("bottom-sheet")
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("45lb");

  // Workout A

  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  // First exercise is successful
  await PlaywrightUtils.clickAll(page.getByTestId("entry-bent-over-row").getByTestId("complete-set"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();

  // Second exercise is unsuccessful
  await page.getByTestId("workout-tab-squat").click();
  await PlaywrightUtils.clickAll(page.getByTestId("entry-squat").getByTestId("complete-set"));
  await page.getByTestId("modal-amrap-input").fill("3");
  await page.getByTestId("modal-amrap-submit").click();

  // Third exercise is successful
  await page.getByTestId("workout-tab-bench-press").click();
  await PlaywrightUtils.clickAll(page.getByTestId("entry-bench-press").getByTestId("complete-set"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  // Check next exercise conditions
  await page.getByTestId("footer-workout").click();
  await expect(
    page
      .getByTestId("bottom-sheet")
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Chin Up') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("5lb");
  await expect(
    page
      .getByTestId("bottom-sheet")
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Deadlift') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("100lb");
  await expect(
    page
      .getByTestId("bottom-sheet")
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Overhead Press') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("45lb");

  // Workout B

  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  // Check next exercise conditions
  await page.getByTestId("footer-workout").click();
  await expect(
    page
      .getByTestId("bottom-sheet")
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Bent Over Row') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("100lb");
  await expect(
    page
      .getByTestId("bottom-sheet")
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Squat') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("45lb");
  await expect(
    page
      .getByTestId("bottom-sheet")
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("50lb");
});
