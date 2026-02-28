import { test, expect } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_finishExercise,
} from "./playwrightUtils";

test("Muscle Groups", async ({ page }) => {
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
Bench Press / 3x5 / 100lb / warmup: none
Squat / 3x5 / 100lb / warmup: none
Bent Over Row / 3x5 / 100lb / warmup: none`
  );

  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-muscle-groups").click();
  await page.getByTestId("delete-muscle-group-shoulders").click();

  await page.getByTestId("add-muscle-group").click();
  await page.getByTestId("muscle-group-input").fill("Front Delts");
  await page.getByTestId("modal-new-muscle-group-submit").click();

  await page.getByTestId("add-muscle-group").click();
  await page.getByTestId("muscle-group-input").fill("Rear Delts");
  await page.getByTestId("modal-new-muscle-group-submit").click();

  await page.getByTestId("edit-muscle-group-front-delts").click();
  await page.getByTestId("select-muscle-deltoid-anterior").click();
  await page.getByTestId("done-selecting-muscles").click();

  await page.getByTestId("edit-muscle-group-rear-delts").click();
  await page.getByTestId("select-muscle-deltoid-posterior").click();
  await page.getByTestId("done-selecting-muscles").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await PlaywrightUtils_finishExercise(page, "bench-press", [1, 1, 1]);
  await PlaywrightUtils_finishExercise(page, "squat", [1, 1, 1]);
  await PlaywrightUtils_finishExercise(page, "bent-over-row", [1, 1, 1]);

  await page.getByTestId("finish-workout").click();

  await expect(page.getByTestId("sets-per-muscle-group")).toContainText("Front Delts: 1.5");
  await expect(page.getByTestId("sets-per-muscle-group")).toContainText("Rear Delts: 1.5");

  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-program").click();
  await page.getByTestId("tab-edit").click();

  await page.getByTestId("editor-v2-week-muscles").click();

  await expect(page.getByTestId("planner-stats")).toContainText("Front Delts: 2");
  await expect(page.getByTestId("planner-stats")).toContainText("Rear Delts: 2");
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await page.getByTestId("edit-day-1-1").getByTestId("edit-day-muscles-d").click();

  await expect(page.getByTestId("planner-stats")).toContainText("Front Delts: 2");
  await expect(page.getByTestId("planner-stats")).toContainText("Rear Delts: 2");
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).state.storage.subscription.key = "test";
  });

  await page.getByTestId("footer-graphs").click();
  await page.getByTestId("graphs-modify").click();
  await page.getByTestId("modal-graphs").getByText("Front Delts Weekly Volume").click();
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();
  await expect(page.getByTestId("graph-data")).toContainText("Front Delts Weekly Volume");

  await page.getByTestId("footer-home").click();
  await page.getByTestId("toggle-week-insights").click();

  await expect(page.getByTestId("week-insights-details")).toContainText("Front Delts: 2");
  await expect(page.getByTestId("week-insights-details")).toContainText("Rear Delts: 2");
});
