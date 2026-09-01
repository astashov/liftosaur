import { test, expect } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_createProgram,
  PlaywrightUtils_disableTours,
  PlaywrightUtils_saveExerciseInSheet,
} from "./playwrightUtils";

test("Warmups", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-ui-program").click();
  await page.getByTestId("add-exercise").click();
  await page.getByTestId("exercise-filter-by-name").fill("Bench Press");
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("edit-exercise").click();
  await PlaywrightUtils_saveExerciseInSheet(page, "Bench Press / 1x1 / 100lb / warmup: 2x5 30%, 1x4 82%, 1x4 90lb");

  await page.getByTestId("editor-v2-perday-program").click();
  await expect(page.getByTestId("planner-editor")).toContainText(
    "Bench Press / 1x1 / 100lb / warmup: 2x5 30%, 1x4 82%, 1x4 90lb"
  );
});

test("Sets", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-ui-program").click();
  await page.getByTestId("add-exercise").click();
  await page.getByTestId("exercise-filter-by-name").fill("Bench Press");
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("edit-exercise").click();
  await PlaywrightUtils_saveExerciseInSheet(
    page,
    "Bench Press / 2x5+ 110lb+, 2x2 100lb, 1x2 100lb @8 150s / 1x5+ 110lb+, 2x2 100lb, 1x2 100lb @8 150s"
  );

  await page.getByTestId("editor-v2-perday-program").click();

  await expect(page.getByTestId("planner-editor")).toContainText(
    "Bench Press / 2x5+ 110lb+, 2x2 100lb, 1x2 100lb @8 150s / 1x5+ 110lb+, 2x2 100lb, 1x2 100lb @8 150s"
  );
});

test("Change exercise", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-ui-program").click();
  await page.getByTestId("add-exercise").click();
  await page.getByTestId("exercise-filter-by-name").fill("arnold press");
  await page.getByTestId("menu-item-arnold-press-dumbbell").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("editor-v2-grid-program").click();
  await page.getByTestId("grid-add-day-0").click();
  await page.getByTestId("editor-v2-ui-program").click();
  await page.getByTestId("add-exercise").nth(1).click();
  await page.getByTestId("exercise-filter-by-name").fill("arnold press");
  await page.getByTestId("menu-item-arnold-press-dumbbell").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("edit-exercise-swap").first().click();
  await page.getByTestId("edit-exercise-change-one").first().click();
  await page.getByTestId("exercise-filter-by-name").fill("around");
  await page.getByTestId("menu-item-around-the-world-dumbbell").first().click();
  await page.getByTestId("exercise-picker-confirm").click();
  await expect(page.getByTestId("exercise-aroundtheworld_dumbbell")).toContainText("Around The World");
  await expect(page.getByTestId("exercise-arnoldpress_dumbbell")).toContainText("Arnold Press");
  await page.getByTestId("exercise-arnoldpress_dumbbell").getByTestId("edit-exercise-swap").first().click();
  await page.getByTestId("menu-item-around-the-world-dumbbell").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("edit-exercise-swap").first().click();
  await page.getByTestId("edit-exercise-change-all").first().click();
  await page.getByTestId("exercise-filter-by-name").fill("bench press");
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await expect(page.getByTestId("planner-ui-exercise-name").nth(0)).toContainText("Bench Press");
  await expect(page.getByTestId("planner-ui-exercise-name").nth(1)).toContainText("Bench Press");
});

test("Reuse without overwrite", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1

Squat / 3x8 60lb / warmup: 1x5 45lb, 1x3 135lb / progress: custom() {~ weights += 5lb ~}`
  );

  await page.getByTestId("editor-v2-grid-program").click();
  await page.getByTestId("grid-add-day-0").click();
  await page.getByTestId("editor-v2-ui-program").click();
  await page.getByTestId("add-exercise").nth(1).click();
  await page.getByTestId("exercise-filter-by-name").click();
  await page.getByTestId("exercise-filter-by-name").fill("bench");
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("exercise-benchpress_barbell").getByTestId("edit-exercise").click();
  await PlaywrightUtils_saveExerciseInSheet(page, "Bench Press / ...Squat / @8");

  await page.getByTestId("editor-v2-perday-program").click();
  await expect(page.getByTestId("planner-editor").nth(1)).toContainText("Bench Press / ...Squat / @8");
});

test("Reuse progresses", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1

Squat / 3x8 60lb / progress: lp(5lb)
Bench Press / 3x8 60lb / progress: lp(10lb)
Deadlift / 3x8 60lb / progress: dp(5lb, 8, 12)
Overhead Press / 3x3 / progress: custom(foo: 1) {~ reps = state.foo ~}
Bent Over Row / 3x3 / progress: custom(foo: 1) { ...Overhead Press }
Bicep Curl / 3x3`
  );

  await page.getByTestId("editor-v2-ui-program").click();
  await page.getByTestId("exercise-bicepcurl_dumbbell").getByTestId("edit-exercise").click();
  await PlaywrightUtils_saveExerciseInSheet(page, "Bicep Curl / 3x3 / progress: custom() { ...Overhead Press }");

  await expect(page.getByTestId("exercise-bicepcurl_dumbbell")).toContainText("Reusing progress of 'Overhead Press'");
});
