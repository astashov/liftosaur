import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("edits sets properly", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1");
  await page.locator("button:has-text('Basic Beginner Routine')").click();
  await page.getByTestId("clone-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("workout-tab-bench-press").click();
  await page.getByTestId("entry-bench-press").getByTestId("add-warmup-set").click();
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("entry-bench-press").getByTestId("input-set-reps-field").nth(0),
    "10"
  );
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("entry-bench-press").getByTestId("input-set-weight-field").nth(0),
    "100"
  );

  await page.getByTestId("entry-bench-press").getByTestId("add-workout-set").click();
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("entry-bench-press").getByTestId("input-set-reps-field").nth(4),
    "20"
  );
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("entry-bench-press").getByTestId("input-set-weight-field").nth(4),
    "200"
  );

  await PlaywrightUtils.swipeLeft(page, page.getByTestId("entry-bench-press").getByTestId("workout-set-target").nth(2));
  await page.getByTestId("entry-bench-press").getByTestId("delete-set").nth(2).click();

  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("entry-bench-press").getByTestId("input-set-reps-field").nth(1),
    "8"
  );
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("entry-bench-press").getByTestId("input-set-weight-field").nth(1),
    "80"
  );

  // Checking the result

  await expect(page.getByTestId("entry-bench-press").getByTestId("set-nonstarted")).toHaveCount(2);
  await expect(page.getByTestId("entry-bench-press").getByTestId("set-amrap-nonstarted")).toHaveCount(2);
  await expect(page.getByTestId("entry-bench-press").getByTestId("input-set-reps-field").nth(0)).toHaveText("10");
  await expect(page.getByTestId("entry-bench-press").getByTestId("input-set-weight-field").nth(0)).toHaveText("100");

  await expect(page.getByTestId("entry-bench-press").getByTestId("input-set-reps-field").nth(1)).toHaveText("8");
  await expect(page.getByTestId("entry-bench-press").getByTestId("input-set-weight-field").nth(1)).toHaveText("80");

  await expect(page.getByTestId("entry-bench-press").getByTestId("input-set-reps-field").nth(2)).toHaveText("5+");
  await expect(page.getByTestId("entry-bench-press").getByTestId("input-set-weight-field").nth(2)).toHaveText("45");

  await expect(page.getByTestId("entry-bench-press").getByTestId("input-set-reps-field").nth(3)).toHaveText("20");
  await expect(page.getByTestId("entry-bench-press").getByTestId("input-set-weight-field").nth(3)).toHaveText("200");

  await page.getByTestId("entry-bench-press").getByTestId("complete-set").nth(0).click();
  await page.getByTestId("entry-bench-press").getByTestId("complete-set").nth(1).click();
  await page.getByTestId("entry-bench-press").getByTestId("complete-set").nth(2).click();
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();
  await page.getByTestId("entry-bench-press").getByTestId("input-set-reps-field").nth(3).click();
  await page.getByTestId("keyboard-backspace").click();
  await page.getByTestId("keyboard-close").click();
  await page.getByTestId("entry-bench-press").getByTestId("complete-set").nth(3).click();
  await page.getByTestId("modal-amrap-input").fill("15");
  await page.getByTestId("modal-amrap-submit").click();

  // Adding and deleting exercises

  await page.getByTestId("add-exercise-button").click();
  await page.getByTestId("menu-item-arnold-press-kettlebell").click();

  await page.getByTestId("entry-arnold-press").getByTestId("add-workout-set").click();
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("entry-arnold-press").getByTestId("input-set-reps-field").nth(0),
    "8"
  );
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("entry-arnold-press").getByTestId("input-set-weight-field").nth(0),
    "250"
  );

  await page.getByTestId("entry-arnold-press").getByTestId("complete-set").nth(0).click();

  await expect(page.getByTestId("entry-arnold-press").getByTestId("set-completed")).toHaveCount(1);
  await expect(page.getByTestId("entry-arnold-press").getByTestId("input-set-reps-field").nth(0)).toHaveText("8");
  await expect(page.getByTestId("entry-arnold-press").getByTestId("input-set-weight-field").nth(0)).toHaveText("250");

  await page.getByTestId("workout-tab-bent-over-row").click();
  await page.getByTestId("entry-bent-over-row").getByTestId("exercise-options").click();
  await page.getByTestId("edit-exercise-kebab-remove-exercise").click();

  await page.getByTestId("workout-tab-squat").click();
  await page.getByTestId("entry-squat").getByTestId("exercise-name").click();
  await page.getByTestId("menu-item-value-1-rep-max").fill("200");
  await page.getByTestId("navbar-back").click();

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await expect(
    page
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press, Barbell') >> [data-cy=history-entry-reps]")
      .nth(0)
  ).toHaveText("8");
  await expect(
    page
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press, Barbell') >> [data-cy=history-entry-reps]")
      .nth(1)
  ).toHaveText("5");
  await expect(
    page
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press, Barbell') >> [data-cy=history-entry-reps]")
      .nth(2)
  ).toHaveText("15");

  await expect(
    page
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press, Barbell') >> [data-cy=history-entry-weight]")
      .nth(0)
  ).toHaveText("80lb");
  await expect(
    page
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press, Barbell') >> [data-cy=history-entry-weight]")
      .nth(1)
  ).toHaveText("45lb");
  await expect(
    page
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press, Barbell') >> [data-cy=history-entry-weight]")
      .nth(2)
  ).toHaveText("200lb");

  await expect(
    page.locator("[data-cy=history-entry-exercise]:has-text('Squat, Barbell') >> [data-cy=history-entry-sets]").nth(0)
  ).toHaveText("3");
  await expect(
    page.locator("[data-cy=history-entry-exercise]:has-text('Squat, Barbell') >> [data-cy=history-entry-reps]").nth(0)
  ).toHaveText("-");
  await expect(
    page.locator("[data-cy=history-entry-exercise]:has-text('Squat, Barbell') >> [data-cy=history-entry-weight]").nth(0)
  ).toHaveText("45lb");

  await expect(
    page
      .locator("[data-cy=history-entry-exercise]:has-text('Arnold Press, Kettlebell') >> [data-cy=history-entry-reps]")
      .nth(0)
  ).toHaveText("8");
  await expect(
    page
      .locator(
        "[data-cy=history-entry-exercise]:has-text('Arnold Press, Kettlebell') >> [data-cy=history-entry-weight]"
      )
      .nth(0)
  ).toHaveText("250lb");
});
