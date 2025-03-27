import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("rep ranges", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("editor-v2-full-program").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1
Squat / 1x5 135lb, 1x3-5 135lb / warmup: none / progress: custom() {~
  if (completedReps >= reps) {
    weights += 10lb
  } else if (completedReps >= minReps) {
    weights += 5lb
  } else {
    weights -= 15lb
  }
~}`
  );

  await page.getByTestId("editor-v2-save-full").click();
  await page.getByTestId("editor-save-v2-top").click();

  await page.getByTestId("footer-workout").click();
  await expect(page.getByTestId("history-entry-sets-next").nth(0)).toHaveText("5 × 135lb");
  await expect(page.getByTestId("history-entry-sets-next").nth(1)).toHaveText("3-5 × 135lb");

  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await expect(page.getByTestId("input-set-reps-field").nth(0)).toHaveText("5");
  await expect(page.getByTestId("input-set-reps-field").nth(1)).toHaveText("3-5");

  await PlaywrightUtils.clickAll(page.getByTestId("complete-set"));

  await expect(page.getByTestId("variable-changes-value-weights")).toHaveText("+= 10lb");

  await expect(page.getByTestId("input-set-reps-field").nth(0)).toHaveText("5");
  await expect(page.getByTestId("input-set-reps-field").nth(1)).toHaveText("5");
  expect(await page.getByTestId("set-completed")).toHaveCount(2);

  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-reps-field").nth(1), "4");
  await expect(page.getByTestId("set-completed")).toHaveCount(1);
  await expect(page.getByTestId("set-in-range")).toHaveCount(1);

  await expect(page.getByTestId("variable-changes-value-weights")).toHaveText("+= 5lb");
  await expect(page.getByTestId("exercise-progress-in-range")).toHaveCount(1);

  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-reps-field").nth(1), "2");
  await expect(page.getByTestId("set-completed")).toHaveCount(1);
  await expect(page.getByTestId("set-in-range")).toHaveCount(0);
  await expect(page.getByTestId("set-incompleted")).toHaveCount(1);
  await expect(page.getByTestId("variable-changes-value-weights")).toHaveText("-= 15lb");
  await expect(page.getByTestId("exercise-progress-failed")).toHaveCount(1);

  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-reps-field").nth(1), "4");

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await expect(page.getByTestId("history-entry-sets-completed")).toHaveCount(1);
  await expect(page.getByTestId("history-entry-sets-completed")).toHaveText("5 × 135lb");

  await expect(page.getByTestId("history-entry-sets-in-range")).toHaveCount(1);
  await expect(page.getByTestId("history-entry-sets-in-range")).toHaveText("4 × 135lb");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await expect(page.getByTestId("input-set-reps-field").nth(0)).toHaveText("5");
  await expect(page.getByTestId("input-set-reps-field").nth(1)).toHaveText("3-5");
  await expect(page.getByTestId("input-set-weight-field").nth(0)).toHaveText("140");
  await expect(page.getByTestId("input-set-weight-field").nth(1)).toHaveText("140");
});
