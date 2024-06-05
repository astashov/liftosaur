import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("Warmups", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
  await page.getByTestId("create-program").click();
  await page.getByTestId("modal-create-program-input").click();
  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("add-exercise").click();
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("edit-exercise").click();
  await page.getByTestId("edit-exercise-warmups-customize").click();

  await page.getByTestId("num-input-edit-exercise-warmupset-numofsets-plus").first().click();
  await page.getByTestId("num-input-edit-exercise-warmupset-reps-minus").nth(1).click();
  await page.getByTestId("num-input-edit-exercise-warmupset-weight-weight-plus").nth(1).click();
  await page.getByTestId("num-input-edit-exercise-warmupset-weight-weight-plus").nth(1).click();
  await page.getByTestId("edit-exercise-warmupset-weight-weight-unit").nth(2).selectOption("lb");
  await page.getByTestId("num-input-edit-exercise-warmupset-weight-weight-plus").nth(2).click();
  await page.getByTestId("num-input-edit-exercise-warmupset-weight-weight-plus").nth(2).click();
  await page.getByTestId("close-edit-exercise").click();

  await page.getByTestId("editor-v2-full-program").click();
  await expect(page.getByTestId("planner-editor")).toContainText(
    "Bench Press / 1x1 / warmup: 2x5 30%, 1x4 52%, 1x5 81lb"
  );
});

test("Sets", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
  await page.getByTestId("create-program").click();
  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();
  await page.getByTestId("add-exercise").click();
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("edit-exercise").click();

  await page.getByTestId("num-input-edit-exercise-numofsets-plus").click();
  await page.getByTestId("num-input-edit-exercise-minreps-minus").click();
  await page.getByTestId("num-input-edit-exercise-minreps-minus").click();
  await page.getByTestId("num-input-edit-exercise-minreps-plus").click();
  await page.getByTestId("num-input-edit-exercise-minreps-plus").click();
  await page.getByTestId("num-input-edit-exercise-minreps-plus").click();
  await page.getByTestId("num-input-edit-exercise-minreps-plus").click();
  await page.getByTestId("num-input-edit-exercise-minreps-plus").click();
  await page.getByText("AMRAP?").click();
  await expect(page.getByTestId("num-input-edit-exercise-set-weight-weight-value")).toHaveValue("87");

  await page.getByTestId("edit-exercise-set-weight-weight-unit").selectOption("lb");
  await page.getByTestId("num-input-edit-exercise-set-weight-weight-plus").click();
  await page.getByTestId("num-input-edit-exercise-set-weight-weight-plus").click();
  await page.getByTestId("edit-exercise-set-group-add").click();
  await page.getByTestId("num-input-edit-exercise-numofsets-plus").nth(1).click();
  await page.getByTestId("num-input-edit-exercise-minreps-plus").nth(1).click();
  await page.getByText("Ask Weight?").first().click();
  await page.getByTestId("editor-v2-full-program").click();
  await expect(page.getByTestId("planner-editor")).toContainText("Bench Press / 2x5+ 88lb+, 2x2");
});

test("Change exercise", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
  await page.getByTestId("create-program").click();
  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();
  await page.getByTestId("add-exercise").click();
  await page.getByTestId("menu-item-arnold-press-dumbbell").click();
  await page.getByRole("button", { name: "Add Day" }).click();
  await page.getByTestId("add-exercise").nth(1).click();
  await page.getByTestId("menu-item-arnold-press-dumbbell").click();
  await page.getByTestId("edit-exercise").first().click();
  await page.getByTestId("edit-exercise-change-here").click();
  await page.getByText("Around The World").click();
  await page.getByTestId("close-edit-exercise").click();
  await expect(page.getByTestId("exercise-around the world")).toContainText("Around The World");
  await expect(page.getByTestId("exercise-arnold press")).toContainText("Arnold Press");
  await page.getByTestId("exercise-arnold press").getByTestId("edit-exercise").click();
  await page.getByTestId("edit-exercise-change-here").click();
  await page.getByTestId("menu-item-around-the-world-dumbbell").click();
  await page.getByTestId("edit-exercise-change-everywhere").click();
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("close-edit-exercise").click();
  await expect(page.getByTestId("planner-ui-exercise-name").nth(0)).toContainText("Bench Press");
  await expect(page.getByTestId("planner-ui-exercise-name").nth(1)).toContainText("Bench Press");
});

test("Reuse without overwrite", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
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

Squat / 3x8 60lb / warmup: 1x5 45lb, 1x3 135lb / progress: custom() {~ weights += 5lb ~}`
  );
  await page.getByTestId("editor-v2-save-full").click();
  await page.getByTestId("planner-add-day").click();
  await page.getByTestId("add-exercise").nth(1).click();
  await page.getByPlaceholder("Filter by name").click();
  await page.getByPlaceholder("Filter by name").fill("bench");
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("exercise-bench press").getByTestId("edit-exercise").click();
  await page.getByTestId("edit-exercise-reuse-sets-select").selectOption("Squat");
  await page.getByTestId("num-input-edit-exercise-globals-rpe-value").click();
  await page.getByTestId("num-input-edit-exercise-globals-rpe-value").fill("8");
  await page.getByTestId("close-edit-exercise").click();
  await page.getByTestId("editor-v2-full-program").click();
  await expect(page.getByTestId("planner-editor").nth(1)).toContainText("Bench Press / ...Squat / @8");
});

test("Reuse with overwrites", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
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

Squat / 3x8 60lb / warmup: 1x5 45lb, 1x3 135lb / progress: custom() {~ weights += 5lb ~}`
  );
  await page.getByTestId("editor-v2-save-full").click();
  await page.getByTestId("planner-add-day").click();
  await page.getByTestId("add-exercise").nth(1).click();
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("exercise-bench press").getByTestId("edit-exercise").click();
  await page.getByTestId("edit-exercise-reuse-sets-select").selectOption("Squat");
  await page.getByTestId("edit-exercise-warmups-customize").click();
  await page.getByTestId("num-input-edit-exercise-warmupset-numofsets-plus").first().click();
  await page.getByTestId("num-input-edit-exercise-warmupset-reps-plus").nth(1).click();
  await page.getByTestId("num-input-edit-exercise-warmupset-weight-weight-plus").nth(1).click();
  await page.getByTestId("num-input-edit-exercise-warmupset-weight-weight-plus").nth(1).click();
  await expect(page.getByTestId("num-input-edit-exercise-warmupset-numofsets-value").first()).toHaveValue("2");
  await expect(page.getByTestId("num-input-edit-exercise-warmupset-weight-weight-value").nth(1)).toHaveValue("136");
  await page.getByTestId("edit-exercise-warmups-defaultize").click();
  await expect(page.getByTestId("num-input-edit-exercise-warmupset-numofsets-value").first()).toHaveValue("1");
  await expect(page.getByTestId("num-input-edit-exercise-warmupset-weight-weight-value").nth(1)).toHaveValue("135");
  await page.getByTestId("edit-exercise-warmups-customize").click();
  await page.getByTestId("num-input-edit-exercise-warmupset-numofsets-plus").first().click();
  await page.getByTestId("num-input-edit-exercise-warmupset-weight-weight-plus").nth(1).click();
  await page.getByTestId("num-input-edit-exercise-warmupset-weight-weight-plus").nth(1).click();
  await page.getByTestId("edit-exercise-set-variation-reuse-override").click();
  await page.getByTestId("num-input-edit-exercise-numofsets-plus").click();
  await page.getByTestId("num-input-edit-exercise-minreps-plus").click();
  await page.getByText("AMRAP?").click();

  await page.getByTestId("close-edit-exercise").click();
  await page.getByTestId("editor-v2-full-program").click();
  await expect(page.getByTestId("planner-editor").nth(1)).toContainText(
    "Bench Press / ...Squat / 2x2+ / warmup: 2x5 45lb, 1x3 136lb"
  );
});

test("Reuse progresses", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
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

Squat / 3x8 60lb / progress: lp(5lb)
Bench Press / 3x8 60lb / progress: lp(10lb)
Deadlift / 3x8 60lb / progress: dp(5lb, 8, 12)
Overhead Press / 3x3 / progress: custom(foo: 1) {~ reps = state.foo ~}
Bent Over Row / 3x3 / progress: custom(foo: 1) { ...Overhead Press }
Bicep Curl / 3x3`
  );

  await page.getByTestId("editor-v2-save-full").click();
  await page.getByTestId("exercise-bicep curl").getByTestId("edit-exercise").click();
  await page.getByTestId("edit-exercise-reuse-progress-select").selectOption("Squat");
  await expect(page.getByTestId("edit-program-progress").nth(5)).toContainText("Progress: lp(5lb)");
  await page.getByTestId("edit-exercise-reuse-progress-select").selectOption("Bench Press");
  await expect(page.getByTestId("edit-program-progress").nth(5)).toContainText("Progress: lp(10lb)");
  await page.getByTestId("edit-exercise-reuse-progress-select").selectOption("Deadlift");
  await expect(page.getByTestId("edit-program-progress").nth(5)).toContainText("Progress: dp(5lb, 8, 12)");
  await page.getByTestId("edit-exercise-reuse-progress-select").selectOption("Overhead Press");
  await expect(page.getByTestId("edit-program-progress").nth(5)).toContainText(
    "Progress: custom(foo: 1) { ...Overhead Press }"
  );
});

test("Converts global weights into per-set weights", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
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

Squat / 4x3, 1x3+ / 5x2, 1x2+ / 75% / progress: custom() {~ weights += 5lb ~}
Bench Press / 3x3`
  );

  await page.getByTestId("editor-v2-save-full").click();

  await page.getByTestId("exercise-bench press").getByTestId("edit-exercise").click();
  await page.getByTestId("edit-exercise-reuse-progress-select").selectOption("Squat");
  await page.getByTestId("editor-v2-full-program").click();

  await expect(page.getByTestId("planner-editor")).toContainText(
    "Squat / 4x3 75%, 1x3+ 75% / 5x2 75%, 1x2+ 75% / progress: custom() {~ weights += 5lb ~}Bench Press / 3x3 / progress: custom() { ...Squat }"
  );
});
