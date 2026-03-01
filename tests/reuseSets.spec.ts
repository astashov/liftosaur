import { test, expect } from "@playwright/test";
import { startpage, PlaywrightUtils_clearCodeMirror, PlaywrightUtils_typeCodeMirror } from "./playwrightUtils";

test("reuses sets", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();

  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1

Squat / 1x1 / 100% / progress: lp(5lb)
Bench Press / 1x1 / 100%
Bicep Curl / 1x1 / 100%

## Day 2
a: Squat / 1x2 / 95%
Triceps Extension / 1x2 95%
Leg Press / 1x2 / 95%
Squat / 1x2 / 95%
Bench Press / 1x2 / 95%
Hack Squat / ...Squat[_:1]

## Day 3
Deadlift / ...Leg Press
Front Raise / ...Bench Press[2]


# Week 2
## Day 1
Squat / ...Bench Press
Bench Press / 2x1 / 100%
Bicep Curl / ...Triceps Extension[1:2]

## Day 2
a: Squat / ...Squat[1:2]
Triceps Extension / ...Bench Press[1]`
  );

  await page.getByTestId("editor-v2-ui-program").click();
  await expect(
    page
      .getByTestId("edit-day-1-2")
      .getByTestId("exercise-hacksquat_barbell")
      .getByTestId("ui-workout-sets")
      .getByTestId("history-entry-sets-next")
  ).toHaveCount(1);
  await expect(
    page
      .getByTestId("edit-day-1-2")
      .getByTestId("exercise-hacksquat_barbell")
      .getByTestId("ui-workout-sets")
      .getByTestId("history-entry-sets-next")
      .first()
  ).toHaveText("1 × 100%");
  await page.getByTestId("tab-week-2").click();
  await expect(
    page
      .getByTestId("edit-day-2-2")
      .getByTestId("exercise-a-squat_barbell")
      .getByTestId("ui-workout-sets")
      .getByTestId("history-entry-sets-next")
  ).toHaveCount(1);
  await expect(
    page
      .getByTestId("edit-day-2-2")
      .getByTestId("exercise-a-squat_barbell")
      .getByTestId("ui-workout-sets")
      .getByTestId("history-entry-sets-next")
      .first()
  ).toHaveText("2 × 95%");

  await page.getByTestId("save-program").click();
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("complete-set").nth(3).click();

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-program").click();
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-perday-program").click();

  await expect(page.getByTestId("planner-editor").first()).toContainText("Squat / 1x1 / 140lb");
  await expect(page.getByTestId("planner-editor").nth(1)).toContainText("Squat / 1x2 / 133.25lb");
  await expect(page.getByTestId("planner-editor").nth(1)).toContainText("Hack Squat / ...Squat[1] / 100%");
  await expect(page.getByTestId("planner-editor").nth(2)).toContainText("Deadlift / ...Leg Press");
  await expect(page.getByTestId("planner-editor").nth(2)).toContainText("Front Raise / ...Bench Press[2]");

  await page.getByTestId("tab-week-2").click();
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "Triceps Extension / ...Bench Press[1]"
  );
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "a: Squat / ...Squat[1:2] / 95%"
  );
});
