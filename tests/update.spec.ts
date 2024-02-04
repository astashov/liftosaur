import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("updates reps in a workout", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "planner-editor",
    `Squat / 1x6+, 3x3 / 100lb / update: custom() {~
  if (setIndex == 1) {
    reps = floor(completedReps[1] / 2)
  }
~}`
  );

  await page.getByTestId("editor-save-v2-top").click();
  await page.getByTestId("menu-item-my-program").click();
  await page.getByTestId("start-workout").click();

  await page.getByTestId("workout-set").nth(0).getByTestId("set-amrap-nonstarted").click();
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("12");
  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("workout-set").nth(1).getByTestId("reps-value")).toHaveText("6");
  await expect(page.getByTestId("workout-set").nth(2).getByTestId("reps-value")).toHaveText("6");
  await expect(page.getByTestId("workout-set").nth(3).getByTestId("reps-value")).toHaveText("6");

  await page.getByTestId("workout-set").nth(1).getByTestId("set-nonstarted").click();
  await page.getByTestId("workout-set").nth(0).getByTestId("set-amrap-completed").click();
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("8");
  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("workout-set").nth(1).getByTestId("reps-value")).toHaveText("6");
  await expect(page.getByTestId("workout-set").nth(2).getByTestId("reps-value")).toHaveText("4");
  await expect(page.getByTestId("workout-set").nth(3).getByTestId("reps-value")).toHaveText("4");

  await page.getByTestId("workout-set").nth(0).getByTestId("set-amrap-completed").click();
  await page.getByTestId("modal-amrap-clear").click();
  await expect(page.getByTestId("workout-set").nth(0).getByTestId("reps-value")).toHaveText("6+");
  await expect(page.getByTestId("workout-set").nth(1).getByTestId("reps-value")).toHaveText("6");
  await expect(page.getByTestId("workout-set").nth(2).getByTestId("reps-value")).toHaveText("4");
  await expect(page.getByTestId("workout-set").nth(3).getByTestId("reps-value")).toHaveText("4");
});
