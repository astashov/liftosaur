import { test, expect } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_clickAll,
  PlaywrightUtils_typeKeyboard,
} from "./playwrightUtils";

test("Unilateral exercises", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1
Squat / 3x8 100lb / progress: custom() {~
  if (completedReps[ns] - completedRepsLeft[ns] >= 2) {
    weights -= 5lb
  }
~}
Bicep Curl / 2x5, 1x5+ / 10lb / warmup: none
`
  );

  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();

  await expect(page.getByTestId("entry-squat").getByTestId("input-set-reps-field")).toHaveCount(5);
  await expect(page.getByTestId("entry-squat").getByTestId("input-set-left-reps-field")).toHaveCount(0);

  await page.getByTestId("entry-squat").getByTestId("exercise-name").click();
  await page.getByTestId("menu-item-is-unilateral").click();
  await page.getByTestId("navbar-back").click();

  await expect(page.getByTestId("entry-squat").getByTestId("input-set-reps-field")).toHaveCount(5);
  await expect(page.getByTestId("entry-squat").getByTestId("input-set-left-reps-field")).toHaveCount(5);

  await PlaywrightUtils_clickAll(page.getByTestId("entry-squat").getByTestId("complete-set"));
  await PlaywrightUtils_typeKeyboard(
    page,
    page.getByTestId("entry-squat").getByTestId("input-set-left-reps-field").nth(2),
    "4"
  );
  await PlaywrightUtils_typeKeyboard(
    page,
    page.getByTestId("entry-squat").getByTestId("input-set-left-reps-field").nth(3),
    "6"
  );

  await page.getByTestId("workout-tab-bicep-curl").click();
  await expect(page.getByTestId("entry-bicep-curl").getByTestId("input-set-reps-field")).toHaveCount(3);
  await expect(page.getByTestId("entry-bicep-curl").getByTestId("input-set-left-reps-field")).toHaveCount(3);

  await PlaywrightUtils_clickAll(page.getByTestId("entry-bicep-curl").getByTestId("complete-set"));
  await page.getByTestId("modal-amrap-input").fill("3");
  await page.getByTestId("modal-amrap-left-input").fill("2");
  await page.getByTestId("modal-amrap-submit").click();

  await page.getByTestId("finish-workout").click();
  await expect(page.getByTestId("totals-summary")).toContainText("Volume: 4450");
  await page.getByTestId("finish-day-continue").click();

  await expect(
    page
      .getByTestId("history-record")
      .nth(1)
      .getByTestId("history-entry-exercise")
      .nth(1)
      .getByTestId("history-entry-reps")
      .nth(1)
  ).toContainText("2/3");
});
