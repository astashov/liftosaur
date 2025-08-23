import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("negative weights", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1
Pull Up, Leverage Machine / 2x5 / -40lb / progress: lp(-5lb)
Triceps Dip, Leverage Machine / 2x3-5 -20lb / progress: lp(30lb)`
  );

  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await expect(page.getByTestId("history-entry-sets-next").nth(0)).toHaveText("2 × 5 × -40lb");
  await expect(page.getByTestId("history-entry-sets-next").nth(1)).toHaveText("2 × 3-5 × -20lb");

  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await expect(page.getByTestId("input-set-weight-field").nth(0)).toHaveText("-40");
  await expect(page.getByTestId("input-set-weight-field").nth(1)).toHaveText("-40");

  await PlaywrightUtils.finishExercise(page, "pull-up", [1, 1]);
  await PlaywrightUtils.finishExercise(page, "triceps-dip", [1, 1]);

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await expect(page.getByTestId("history-entry-sets-completed")).toHaveCount(2);
  await expect(page.getByTestId("history-entry-sets-completed").nth(0)).toHaveText("2 × 5 × -40lb");
  await expect(page.getByTestId("history-entry-sets-completed").nth(1)).toHaveText("2 × 5 × -20lb");

  await page.getByTestId("footer-workout").click();

  await expect(
    page
      .getByTestId("bottom-sheet")
      .getByTestId("history-record")
      .first()
      .locator(
        "[data-cy=history-entry-exercise]:has-text('Pull Up, Leverage Machine') >> [data-cy=history-entry-weight]"
      )
      .first()
  ).toHaveText("-45lb");
  await expect(
    page
      .getByTestId("bottom-sheet")
      .getByTestId("history-record")
      .first()
      .locator(
        "[data-cy=history-entry-exercise]:has-text('Triceps Dip, Leverage Machine') >> [data-cy=history-entry-weight]"
      )
      .first()
  ).toHaveText("10lb");
});
