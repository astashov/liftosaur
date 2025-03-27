import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("rm1", async ({ page }) => {
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
Squat / 1x5 100% / warmup: none / progress: custom() {~
  if (completedReps >= reps) {
    rm1 += 5lb
  }
~}`
  );

  await page.getByTestId("editor-v2-save-full").click();
  await page.getByTestId("editor-save-v2-top").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("complete-set").nth(0).click();
  await expect(page.getByTestId("variable-changes-value-1-rm")).toHaveText("135 lb -> 140 lb");

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-workout").click();
  await expect(
    page.getByTestId("bottom-sheet").getByTestId("history-entry-exercise").nth(0).getByTestId("history-entry-weight")
  ).toHaveText("140lb");
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();
  await page.getByTestId("complete-set").nth(0).click();
  await expect(page.getByTestId("variable-changes-value-1-rm")).toHaveText("140 lb -> 145 lb");

  await page.getByTestId("complete-set").nth(0).click();
  await page.getByTestId("input-set-weight-field").nth(0).click();
  await page.getByTestId("keyboard-backspace").click();
  await page.getByTestId("keyboard-close").click();

  await page.getByTestId("exercise-name").click();
  await expect(page.getByTestId("menu-item-value-1-rep-max")).toHaveValue("140");
  await page.getByTestId("menu-item-value-1-rep-max").clear();
  await page.getByTestId("menu-item-value-1-rep-max").type("150");

  await page.getByTestId("navbar-back").click();

  await expect(page.getByTestId("input-set-weight-field")).toHaveText("150");
  await page.getByTestId("complete-set").nth(0).click();
  await expect(page.getByTestId("variable-changes-value-1-rm")).toHaveText("150 lb -> 155 lb");

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-workout").click();
  await expect(
    page.getByTestId("bottom-sheet").getByTestId("history-entry-exercise").nth(0).getByTestId("history-entry-weight")
  ).toHaveText("155lb");
});
