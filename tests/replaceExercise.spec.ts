import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("replaces exercises", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("editor-v2-full-program").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1
Squat / 3x8
Bench Press[1-2] / 3x8 / progress: custom() {~ weights = 5lb ~} / update: custom() {~ weights = 5lb ~}

## Day 2
Bicep Curl / ...Bench Press / progress: custom() { ...Bench Press } / update: custom() { ...Bench Press }
t1: Bench Press / 3x5

# Week 2
## Day 1
Squat / 3x8
t1: Squat / 3x5

## Day 2
Bicep Curl / 1x5`
  );

  await page.getByTestId("editor-v2-save-full").click();
  await page.getByTestId("editor-save-v2-top").click();

  await page.getByTestId("footer-program").click();
  await page.getByTestId("editor-v2-full-program").click();

  await page.getByTestId("planner-editor").first().locator(".cm-content").click();
  await page.getByTestId("editor-v2-exercise-stats").click();
  await page.getByTestId("planner-swap-exercise").click();

  await page.getByTestId("modal-exercise").getByTestId("menu-item-bent-over-row-dumbbell").click();

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText("Squat / 3x8");
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    "Bent Over Row, Dumbbell[1-2] / 3x8 / update: custom() {~ weights = 5lb ~} / progress: custom() {~ weights = 5lb ~}"
  );

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "Bicep Curl / ...Bent Over Row, Dumbbell"
  );
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "t1: Bench Press / 3x5"
  );

  await page.getByTestId("tab-week-2").click();

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    `Squat / 3x8t1: Squat / 3x5`
  );
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "Bicep Curl / 1x5"
  );

  await page.getByTestId("editor-save-v2-top").click();
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("entry-squat").getByTestId("exercise-options").click();
  await page.getByTestId("exercise-swap").first().click();

  await page.getByTestId("modal-exercise").getByTestId("menu-item-squat-dumbbell").click();

  await page.getByTestId("footer-program").click();
  await page.getByTestId("editor-v2-full-program").click();
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText("Squat / 3x8");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("entry-squat").getByTestId("exercise-options").click();
  await page.getByTestId("exercise-swap").first().click();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByTestId("modal-exercise").getByTestId("menu-item-hack-squat-smith").click();

  await page.getByTestId("footer-program").click();
  await page.getByTestId("editor-v2-full-program").click();
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    "Hack Squat, Smith Machine / 3x8"
  );

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    "Hack Squat, Smith Machine / 3x8Bent Over Row, Dumbbell[1-2] / 3x8"
  );

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "Bicep Curl / ...Bent Over Row, Dumbbellt1: Bench Press / 3x5"
  );

  await page.getByTestId("tab-week-2").click();

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    `Hack Squat, Smith Machine / 3x8t1: Squat / 3x5`
  );
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "Bicep Curl / 1x5"
  );
});
