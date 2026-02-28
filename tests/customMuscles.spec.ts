import { test, expect } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_finishExercise,
} from "./playwrightUtils";

test("Custom Muscles", async ({ page }) => {
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
Bench Press / 10x5 / 100lb`
  );

  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();
  await page.getByTestId("exercise-name").click();
  await page.getByTestId("override-exercise-muscles").click();
  await page.getByTestId("remove-muscle-override-deltoid-anterior").click();
  await page.getByTestId("toggle-muscle-overrides").click();
  await page.getByTestId("select-muscle-biceps-brachii").click();
  await page.getByTestId("done-selecting-muscles").click();

  await page.getByTestId("muscle-multiplier-biceps-brachii-input").fill("0.2");
  await page.getByTestId("muscle-multiplier-triceps-brachii-input").fill("0.3");
  await page.getByTestId("save-muscle-overrides").click();

  await page.getByTestId("navbar-back").click();

  await PlaywrightUtils_finishExercise(page, "bench-press", [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);

  await page.getByTestId("finish-workout").click();

  await expect(page.getByTestId("sets-per-muscle-group")).toContainText("Chest: 10");
  await expect(page.getByTestId("sets-per-muscle-group")).toContainText("Biceps: 2");
  await expect(page.getByTestId("sets-per-muscle-group")).toContainText("Triceps: 3");

  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-program").click();
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-week-muscles").click();

  await expect(page.getByTestId("planner-stats")).toContainText("Chest: 10");
  await expect(page.getByTestId("planner-stats")).toContainText("Biceps: 2");
  await expect(page.getByTestId("planner-stats")).toContainText("Triceps: 3");

  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).state.storage.subscription.key = "test";
  });

  await page.getByTestId("footer-home").click();
  await page.getByTestId("toggle-week-insights").click();

  await expect(page.getByTestId("week-insights-details")).toContainText("Chest: 10");
  await expect(page.getByTestId("week-insights-details")).toContainText("Biceps: 2");
  await expect(page.getByTestId("week-insights-details")).toContainText("Triceps: 3");
});
