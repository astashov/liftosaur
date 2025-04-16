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

  await PlaywrightUtils.swipeLeft(page, page.getByTestId("entry-bench-press").getByTestId("workout-set-target"));
  await page.getByTestId("entry-bench-press").getByTestId("edit-set-target").click();

  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-target-maxreps-field"), "5");
  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-target-weight-field"), "80");

  await page.getByTestId("edit-set-target-save").click();

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

  await expect(page.getByTestId("history-record-program").nth(1)).toHaveText("Ad-Hoc Workout");
  await expect(
    page
      .getByTestId("history-record")
      .nth(1)
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("100lb");
  await expect(
    page
      .getByTestId("history-record")
      .nth(1)
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press') >> [data-cy=history-entry-sets-completed]")
      .first()
  ).toHaveText("7 × 100lb");
  await expect(
    page
      .getByTestId("history-record")
      .nth(1)
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press') >> [data-cy=history-entry-sets-completed]")
      .nth(1)
  ).toHaveText("5 × 80lb");
  await expect(
    page
      .getByTestId("history-record")
      .nth(1)
      .locator("[data-cy=history-entry-exercise]:has-text('Squat') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("150lb");
  await expect(
    page
      .getByTestId("history-record")
      .nth(1)
      .locator("[data-cy=history-entry-exercise]:has-text('Squat') >> [data-cy=history-entry-sets-completed]")
      .first()
  ).toHaveText("5 × 150lb");

  await page.getByTestId("history-record").nth(1).click();
  await page.getByTestId("save-to-program").click();
  await page.getByTestId("menu-item-next-day-picker-3").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("change-next-day").click();

  await expect(page.getByTestId("menu-item-next-day-picker-4")).toContainText("Week 1 - Day 4");
  await page.getByTestId("menu-item-next-day-picker-4").click();

  await expect(page.getByTestId("history-record").nth(0).getByTestId("history-record-program")).toContainText(
    "Week 1 - Day 4"
  );
  await expect(page.getByTestId("history-record").nth(0).getByTestId("history-record-program")).toContainText(
    "Basic Beginner Routine"
  );

  await expect(page.getByTestId("history-record").nth(0).getByTestId("history-entry-exercise-name").nth(0)).toHaveText(
    "Bench Press, Barbell"
  );
  await expect(page.getByTestId("history-record").nth(0).getByTestId("history-entry-exercise-name").nth(1)).toHaveText(
    "Squat, Barbell"
  );

  await page.getByTestId("history-record").nth(1).click();
  await page.getByTestId("save-to-program").click();
  await page.getByTestId("create-program-from-adhoc").click();

  await page.getByTestId("modal-create-program-input").fill("Adhoccy");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("change-next-day").click();

  await page.getByTestId("menu-item-value-program").click();
  await page.getByTestId("scroll-barrel-item-adhoccy").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-adhoccy").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("menu-item-next-day-picker-1").click();

  await expect(page.getByTestId("history-record").nth(0).getByTestId("history-record-program")).toContainText("Day 1");
  await expect(page.getByTestId("history-record").nth(0).getByTestId("history-record-program")).toContainText(
    "Adhoccy"
  );

  await expect(page.getByTestId("history-record").nth(0).getByTestId("history-entry-exercise-name").nth(0)).toHaveText(
    "Bench Press, Barbell"
  );
  await expect(page.getByTestId("history-record").nth(0).getByTestId("history-entry-exercise-name").nth(1)).toHaveText(
    "Squat, Barbell"
  );
});
