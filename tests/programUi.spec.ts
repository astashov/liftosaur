import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("Warmups", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();
  await page.getByTestId("modal-create-program-input").click();
  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("add-exercise").click();
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("edit-exercise").click();
  await page.getByTestId("edit-exercise-warmups-customize").click();

  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("warmup-set").nth(1).getByTestId("input-set-weight-field"),
    "30"
  );
  await page.getByTestId("warmup-set").nth(2).getByTestId("input-set-weight-field").click();
  await page.getByTestId("keyboard-plus").click();
  await page.getByTestId("keyboard-plus").click();
  await page.getByTestId("keyboard-close").click();
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("warmup-set").nth(2).getByTestId("input-set-reps-field"),
    "4"
  );

  await page.getByTestId("add-warmup-set").click();
  await PlaywrightUtils.typeKeyboard(
    page,
    page.getByTestId("warmup-set").nth(3).getByTestId("input-set-weight-field"),
    "90"
  );
  await page.getByTestId("warmup-set").nth(3).getByTestId("input-set-weight-field").click();
  await page.getByTestId("keyboard-unit-lb").click();
  await page.getByTestId("keyboard-close").click();

  await page.getByTestId("save-program-exercise").click();
  await page.getByTestId("editor-v2-perday-program").click();
  await expect(page.getByTestId("planner-editor")).toContainText(
    "Bench Press / 1x1 / 100lb / warmup: 2x5 30%, 1x4 82%, 1x4 90lb"
  );
});

test("Sets", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();
  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("add-exercise").click();
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("edit-exercise").click();

  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-reps-field"), "5");
  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-weight-field"), "110");
  await page.getByTestId("input-set-reps-field").click();
  await page.getByTestId("keyboard-addon-amrap").click();
  await page.getByTestId("keyboard-close").click();
  await page.getByTestId("input-set-weight-field").click();
  await page.getByTestId("keyboard-addon-ask-weight").click();
  await page.getByTestId("keyboard-close").click();

  await page.getByTestId("add-set").click();
  await page.getByTestId("add-set").click();

  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-reps-field").nth(2), "2");
  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-weight-field").nth(2), "100");
  await page.getByTestId("input-set-reps-field").nth(2).click();
  await page.getByTestId("keyboard-addon-amrap").click();
  await page.getByTestId("keyboard-close").click();
  await page.getByTestId("input-set-weight-field").nth(2).click();
  await page.getByTestId("keyboard-addon-ask-weight").click();
  await page.getByTestId("keyboard-close").click();

  await page.getByTestId("add-set").click();
  await page.getByTestId("add-set").click();

  await PlaywrightUtils.swipeLeft(page, page.getByTestId("set-x").nth(4));
  await page.getByTestId("edit-set").nth(4).click();
  await page.getByTestId("menu-item-name-rpe").click();
  await page.getByTestId("menu-item-name-timer").click();
  await page.getByTestId("bottom-sheet-close").and(page.locator(":visible")).click();

  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-timer-value-field"), "150");

  await page.getByTestId("day-kebab-menu").click();
  await page.getByTestId("program-exercise-toggle-set-variations").click();
  await page.getByTestId("set-variations-scroll-right").click();

  await PlaywrightUtils.swipeLeft(page, page.getByTestId("set-variation-2").getByTestId("set-x").nth(0));
  await page.getByTestId("set-variation-2").getByTestId("delete-set").nth(0).click();

  await page.getByTestId("save-program-exercise").click();
  await page.getByTestId("editor-v2-perday-program").click();

  await expect(page.getByTestId("planner-editor")).toContainText(
    "Bench Press / 2x5+ 110lb+, 2x2 100lb, 1x2 100lb @8 150s / 1x5+ 110lb+, 2x2 100lb, 1x2 100lb @8 150s"
  );
});

test("Change exercise", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();
  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("add-exercise").click();
  await page.getByTestId("menu-item-arnold-press-dumbbell").click();
  await page.getByTestId("add-day").click();
  await page.getByTestId("add-exercise").nth(1).click();
  await page.getByTestId("menu-item-arnold-press-dumbbell").click();
  await page.getByTestId("edit-exercise-swap").first().click();
  await page.getByTestId("edit-exercise-change-one").first().click();
  await page.getByText("Around The World").click();
  await expect(page.getByTestId("exercise-aroundtheworld_dumbbell")).toContainText("Around The World");
  await expect(page.getByTestId("exercise-arnoldpress_dumbbell")).toContainText("Arnold Press");
  await page.getByTestId("exercise-arnoldpress_dumbbell").getByTestId("edit-exercise-swap").first().click();
  await page.getByTestId("menu-item-around-the-world-dumbbell").click();
  await page.getByTestId("edit-exercise-swap").first().click();
  await page.getByTestId("edit-exercise-change-all").first().click();
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await expect(page.getByTestId("planner-ui-exercise-name").nth(0)).toContainText("Bench Press");
  await expect(page.getByTestId("planner-ui-exercise-name").nth(1)).toContainText("Bench Press");
});

test("Reuse without overwrite", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();
  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1

Squat / 3x8 60lb / warmup: 1x5 45lb, 1x3 135lb / progress: custom() {~ weights += 5lb ~}`
  );
  await page.getByTestId("editor-v2-ui-program").click();
  await page.getByTestId("add-day").click();
  await page.getByTestId("add-exercise").nth(1).click();
  await page.getByPlaceholder("Filter by name").click();
  await page.getByPlaceholder("Filter by name").fill("bench");
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("exercise-benchpress_barbell").getByTestId("edit-exercise").click();
  await PlaywrightUtils.select(page, page.getByTestId("edit-exercise-reuse-sets"), "reuse-select", "squat_barbell");
  await page.getByTestId("edit-exercise-override-sets").click();

  await PlaywrightUtils.swipeLeft(page, page.getByTestId("set-x").nth(0));
  await page.getByTestId("edit-set").nth(0).click();
  await page.getByTestId("menu-item-name-rpe").click();
  await page.getByTestId("bottom-sheet-close").and(page.locator(":visible")).click();
  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-rpe-field").nth(0), "8");

  await PlaywrightUtils.swipeLeft(page, page.getByTestId("set-x").nth(1));
  await page.getByTestId("edit-set").nth(1).click();
  await page.getByTestId("menu-item-name-rpe").click();
  await page.getByTestId("bottom-sheet-close").and(page.locator(":visible")).click();
  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-rpe-field").nth(1), "8");

  await PlaywrightUtils.swipeLeft(page, page.getByTestId("set-x").nth(2));
  await page.getByTestId("edit-set").nth(2).click();
  await page.getByTestId("menu-item-name-rpe").click();
  await page.getByTestId("bottom-sheet-close").and(page.locator(":visible")).click();
  await PlaywrightUtils.typeKeyboard(page, page.getByTestId("input-set-rpe-field").nth(2), "8");

  await page.getByTestId("save-program-exercise").click();
  await page.getByTestId("editor-v2-perday-program").click();
  await expect(page.getByTestId("planner-editor").nth(1)).toContainText("Bench Press / ...Squat / @8");
});

test("Reuse progresses", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();
  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
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

  await page.getByTestId("program-exercise-navbar-kebab").click();
  await page.getByTestId("program-exercise-toggle-progress").click();
  await PlaywrightUtils.select(
    page,
    page.getByTestId("menu-item-program-exercise-progress-type"),
    "program-exercise-progress-type-select",
    "custom"
  );
  await PlaywrightUtils.select(
    page,
    page.getByTestId("menu-item-program-exercise-progress-reuse"),
    "program-exercise-progress-reuse-select",
    "Overhead Press"
  );

  await page.getByTestId("save-program-exercise").click();
  await expect(page.getByTestId("exercise-bicepcurl_dumbbell")).toContainText("Reusing progress of 'Overhead Press'");
});
