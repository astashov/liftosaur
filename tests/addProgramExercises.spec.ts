import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("add program exercises to workout", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await page.getByTestId("create-program").click();
  PlaywrightUtils.disableSubscriptions(page);

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1
Bench Press / 3x8 100lb
Deadlift / used: none / 3x3 200lb / progress: lp(10lb)

## Day 2
Squat / 2x2 120lb / progress: dp(5lb, 2, 4)


# Week 2
## Day 1
Overhead Press / 4x4 80lb / progress: lp(5lb)
t1 / used: none / 1x1 50lb / progress: lp(5lb)
Bicep Curl / ...t1 / used: none`
  );
  await page.getByTestId("save-program").click();
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("entry-bench-press").getByTestId("exercise-options").click();
  await page.getByTestId("exercise-swap").first().click();

  await page.getByTestId("tab-from-program").click();
  await page.getByTestId("tab-week-2").click();

  await page.getByTestId("exercise-picker-program-bicep-curl-2-1").click();
  await page.getByTestId("exercise-picker-confirm").click();

  await page.getByTestId("entry-bicep-curl").getByTestId("complete-set").nth(2).click();
  await expect(page.getByTestId("variable-changes-value-weights")).toHaveText("+= 5lb");

  await page.getByTestId("add-exercise-button").click();
  await page.getByTestId("tab-from-program").click();
  await page.getByTestId("exercise-picker-program-deadlift-1-1").click();
  await page.getByTestId("exercise-picker-confirm").click();

  await page.getByTestId("workout-tab-deadlift").click();
  await page.getByTestId("entry-deadlift").getByTestId("complete-set").nth(3).click();
  await page.getByTestId("entry-deadlift").getByTestId("complete-set").nth(4).click();
  await page.getByTestId("entry-deadlift").getByTestId("complete-set").nth(5).click();
  await expect(page.getByTestId("entry-deadlift").getByTestId("variable-changes-value-weights")).toHaveText("+= 10lb");

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-program").click();
  await page.getByTestId("tab-edit").click();
  await expect(
    page.getByTestId("exercise-deadlift_barbell").getByTestId("ui-workout-sets").getByTestId("history-entry-weight")
  ).toHaveText("210lb");
  await page.getByTestId("tab-week-2").click();
  await expect(
    page.getByTestId("exercise-bicepcurl_dumbbell").getByTestId("ui-workout-sets").getByTestId("history-entry-weight")
  ).toHaveText("55lb");
});
