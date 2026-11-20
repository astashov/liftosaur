import { test, expect } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_finishExercise,
  PlaywrightUtils_createProgram,
  PlaywrightUtils_disableTours,
  PlaywrightUtils_setDashboardText,
} from "./playwrightUtils";

test("Muscle Groups", async ({ page }) => {
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
Bench Press / 3x5 / 100lb / warmup: none
Squat / 3x5 / 100lb / warmup: none
Bent Over Row / 3x5 / 100lb / warmup: none`
  );

  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-muscle-groups").click();
  await page.getByTestId("delete-muscle-group-front-delts").click();
  await page.getByTestId("delete-muscle-group-rear-delts").click();

  await page.getByTestId("add-muscle-group").click();
  await page.getByTestId("modal-new-muscle-group-input").fill("Anterior Delts");
  await page.getByTestId("modal-new-muscle-group-submit").click();

  await page.getByTestId("add-muscle-group").click();
  await page.getByTestId("modal-new-muscle-group-input").fill("Posterior Delts");
  await page.getByTestId("modal-new-muscle-group-submit").click();

  await page.getByTestId("edit-muscle-group-anterior-delts").click();
  await page.getByTestId("select-muscle-deltoid-anterior").click();
  await page.getByTestId("done-selecting-muscles").click();

  await page.getByTestId("edit-muscle-group-posterior-delts").click();
  await page.getByTestId("select-muscle-deltoid-posterior").click();
  await page.getByTestId("done-selecting-muscles").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await PlaywrightUtils_finishExercise(page, "bench-press", [1, 1, 1]);

  await PlaywrightUtils_finishExercise(page, "squat", [1, 1, 1]);
  await PlaywrightUtils_finishExercise(page, "bent-over-row", [1, 1, 1]);

  await page.getByTestId("finish-workout").click();

  await expect(page.getByTestId("sets-per-muscle-group")).toContainText("Anterior Delts: 1.5");
  await expect(page.getByTestId("sets-per-muscle-group")).toContainText("Posterior Delts: 1.5");

  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-program").click();
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-ui-program").click();

  await page.getByTestId("editor-v2-week-muscles").click();

  await expect(page.getByTestId("planner-stats")).toContainText("Anterior Delts: 2");
  await expect(page.getByTestId("planner-stats")).toContainText("Posterior Delts: 2");
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await page.getByTestId("edit-day-1-1").getByTestId("edit-day-muscles-d").click();

  await expect(page.getByTestId("planner-stats")).toContainText("Anterior Delts: 2");
  await expect(page.getByTestId("planner-stats")).toContainText("Posterior Delts: 2");
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).state.storage.subscription.key = "test";
  });

  const anteriorDeltsId = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, { name?: string }> = (window as any).state.storage.settings.muscleGroups.data;
    return Object.keys(data).find((key) => data[key].name === "Anterior Delts");
  });
  expect(anteriorDeltsId).toBeDefined();
  await PlaywrightUtils_setDashboardText(
    page,
    [
      "graph {",
      `  name: Anterior Delts Weekly Sets / source: workout / y: muscleSets(${anteriorDeltsId}) / group: sum(1w)`,
      "}",
    ].join("\n")
  );
  await expect(page.getByTestId("dashboard-graph")).toHaveCount(1);
  await expect(page.getByTestId("dashboard-graph-legend")).toHaveText("Anterior Delts Weekly Sets");
  await expect(page.getByTestId("dashboard-graph")).not.toContainText("Unknown muscle group");
  await expect(page.getByTestId("dashboard-notice")).toHaveCount(0);

  await page.getByTestId("footer-home").click();
  await page.getByTestId("toggle-week-insights").click();

  await expect(page.getByTestId("week-insights-details")).toContainText("Anterior Delts: 2");
  await expect(page.getByTestId("week-insights-details")).toContainText("Posterior Delts: 2");
});
