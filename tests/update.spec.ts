import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("updates reps in a workout", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();
  await page.getByTestId("editor-v2-full-program").click();

  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "planner-editor",
    `Squat / 1x6+, 3x3 / 100lb / update: custom() {~
  if (setIndex == 1) {
    reps = floor(completedReps[1] / 2)
  }
~}`
  );

  await page.getByTestId("editor-save-v2-top").click();
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("complete-set").nth(2).click();
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("12");
  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("input-set-reps-field").nth(3)).toHaveText("6");
  await expect(page.getByTestId("input-set-reps-field").nth(4)).toHaveText("6");
  await expect(page.getByTestId("input-set-reps-field").nth(5)).toHaveText("6");

  await page.getByTestId("complete-set").nth(3).click();
  await page.getByTestId("complete-set").nth(2).click();
  await page.getByTestId("input-set-reps-field").nth(2).click();
  await page.getByTestId("keyboard-backspace").click();
  await page.getByTestId("keyboard-close").click();

  await page.getByTestId("complete-set").nth(2).click();

  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("8");
  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("input-set-reps-field").nth(3)).toHaveText("6");
  await expect(page.getByTestId("input-set-reps-field").nth(4)).toHaveText("4");
  await expect(page.getByTestId("input-set-reps-field").nth(5)).toHaveText("4");

  await page.getByTestId("complete-set").nth(2).click();

  await page.getByTestId("input-set-reps-field").nth(2).click();
  await page.getByTestId("keyboard-backspace").click();
  await page.getByTestId("keyboard-close").click();

  await page.getByTestId("complete-set").nth(2).click();
  await page.getByTestId("modal-amrap-clear").click();

  await expect(page.getByTestId("input-set-reps-field").nth(2)).toHaveText("6+");
  await expect(page.getByTestId("input-set-reps-field").nth(3)).toHaveText("6");
  await expect(page.getByTestId("input-set-reps-field").nth(4)).toHaveText("4");
  await expect(page.getByTestId("input-set-reps-field").nth(5)).toHaveText("4");
});
