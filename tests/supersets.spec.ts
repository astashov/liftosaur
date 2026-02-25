import { test, expect } from "@playwright/test";
import { startpage, PlaywrightUtils_clearCodeMirror, PlaywrightUtils_typeCodeMirror } from "./playwrightUtils";

test("Supersets", async ({ page }) => {
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
Squat / 3x8 100lb / superset: A
Deadlift / 3x8 100lb / superset: A

Bicep Curl / 3x8 / 20lb

Bench Press / 2x8 100lb / superset: B
Overhead Press / 2x8 45lb
Skullcrusher / 2x8 20lb / warmup: none

## Day 2
Squat / 3x8 100lb
Deadlift / 3x8 100lb

Bicep Curl / 3x8

Bench Press / 2x8 100lb / superset: A
Overhead Press / 2x8 100lb / superset: A`
  );

  await page.getByTestId("save-program").click();
  await page.getByTestId("footer-program").click();
  await page.getByTestId("tab-edit").click();
  await page
    .getByTestId("edit-day-1-1")
    .getByTestId("exercise-overheadpress_barbell")
    .getByTestId("edit-exercise")
    .click();
  await page.getByTestId("edit-day-1-1").getByTestId("day-kebab-menu").click();
  await page.getByTestId("edit-menu-exercise-toggle-supersets").click();
  await page.getByTestId("edit-day-1-1").getByTestId("superset-group").click();
  await page.getByTestId("superset-group-b").click();
  await expect(page.getByTestId("edit-day-1-1").getByTestId("edit-exercise-superset-exercises")).toContainText(
    "Bench Press, Overhead Press"
  );
  await page.getByTestId("save-program-exercise").click();
  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();

  await page.getByTestId("workout-tab-skullcrusher").click();
  await page.getByTestId("entry-skullcrusher").getByTestId("exercise-options").click();
  await page.getByTestId("entry-skullcrusher").getByTestId("exercise-superset").click();
  await page.getByTestId("superset-group-b").click();
  await expect(page.getByTestId("entry-skullcrusher")).toContainText("Supersets with: Bench Press");

  await page.getByTestId("workout-tab-squat").click();
  await expect(page.getByTestId("workout-tab-squat")).toHaveAttribute("data-is-selected", "true");
  await page.getByTestId("entry-squat").getByTestId("complete-set").nth(0).click();
  await page.getByTestId("entry-squat").getByTestId("complete-set").nth(1).click();
  await page.getByTestId("entry-squat").getByTestId("complete-set").nth(2).click();
  await expect(page.getByTestId("workout-tab-deadlift")).toHaveAttribute("data-is-selected", "true");

  await page.getByTestId("entry-deadlift").getByTestId("complete-set").nth(0).click();
  await page.getByTestId("entry-deadlift").getByTestId("complete-set").nth(1).click();
  await expect(page.getByTestId("workout-tab-squat")).toHaveAttribute("data-is-selected", "true");

  await page.getByTestId("entry-squat").getByTestId("complete-set").nth(3).click();
  await expect(page.getByTestId("workout-tab-deadlift")).toHaveAttribute("data-is-selected", "true");

  await page.getByTestId("entry-deadlift").getByTestId("complete-set").nth(2).click();
  await expect(page.getByTestId("workout-tab-squat")).toHaveAttribute("data-is-selected", "true");

  await page.getByTestId("entry-squat").getByTestId("complete-set").nth(4).click();
  await page.getByTestId("entry-deadlift").getByTestId("complete-set").nth(3).click();
  await expect(page.getByTestId("workout-tab-deadlift")).toHaveAttribute("data-is-selected", "true");

  await page.getByTestId("workout-tab-bicep-curl").click();
  await page.getByTestId("entry-bicep-curl").getByTestId("complete-set").nth(0).click();
  await page.getByTestId("entry-bicep-curl").getByTestId("complete-set").nth(1).click();
  await page.getByTestId("entry-bicep-curl").getByTestId("complete-set").nth(2).click();
  await expect(page.getByTestId("workout-tab-bicep-curl")).toHaveAttribute("data-is-selected", "true");

  await page.getByTestId("entry-bicep-curl").getByTestId("complete-set").nth(3).click();
  await expect(page.getByTestId("workout-tab-bicep-curl")).toHaveAttribute("data-is-selected", "true");

  await page.getByTestId("entry-bench-press").getByTestId("complete-set").nth(0).click();
  await page.getByTestId("entry-bench-press").getByTestId("complete-set").nth(1).click();
  await page.getByTestId("entry-bench-press").getByTestId("complete-set").nth(2).click();
  await expect(page.getByTestId("workout-tab-overhead-press")).toHaveAttribute("data-is-selected", "true");

  await page.getByTestId("entry-overhead-press").getByTestId("complete-set").nth(0).click();
  await expect(page.getByTestId("workout-tab-skullcrusher")).toHaveAttribute("data-is-selected", "true");

  await page.getByTestId("entry-skullcrusher").getByTestId("complete-set").nth(0).click();
  await expect(page.getByTestId("workout-tab-bench-press")).toHaveAttribute("data-is-selected", "true");
});
