import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("User Prompted State Vars", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  // Creating the program

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
Squat / 5x5 65lb / warmup: none / progress: custom(rpe+: 0) {~
  if (state.rpe > 7) {
    weights -= 5lb
  } else if (state.rpe < 3) {
    weights += 5lb
  }
~}`
  );

  await page.getByTestId("editor-v2-save-full").click();
  await page.getByTestId("editor-save-v2-top").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await PlaywrightUtils.finishExercise(page, "squat", [1, 1, 1, 1]);
  await page.getByTestId("complete-set").nth(4).click();
  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").clear();
  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").type("8");

  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("variable-changes-value-weights")).toHaveText("-= 5lb");
  await expect(page.getByTestId("state-changes").first()).toContainText("rpe: 0 -> 8");

  await page.getByTestId("complete-set").nth(4).click();
  await page.getByTestId("complete-set").nth(4).click();

  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").clear();
  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").type("2");

  await page.getByTestId("modal-amrap-submit").click();
  await expect(page.getByTestId("variable-changes-value-weights")).toHaveText("+= 5lb");
  await expect(page.getByTestId("state-changes").first()).toContainText("rpe: 0 -> 2");

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await expect(page.getByTestId("input-set-weight-field").nth(1)).toContainText("70");

  await PlaywrightUtils.finishExercise(page, "squat", [1, 1, 1, 1]);
  await page.getByTestId("complete-set").nth(4).click();
  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").clear();
  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").type("5");
  await page.getByTestId("modal-amrap-submit").click();
  await expect(page.getByTestId("state-changes").first()).not.toContainText("weight");
  await expect(page.getByTestId("state-changes").first()).toContainText("rpe: 2 -> 5");
});
