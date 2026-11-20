import { expect, test } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_disableSubscriptions,
  PlaywrightUtils_finishExercise,
  PlaywrightUtils_selectBuiltin,
  PlaywrightUtils_disableTours,
  PlaywrightUtils_setDashboardText,
} from "./playwrightUtils";

test("Graphs", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_selectBuiltin(page);
  await page.click("button:has-text('Basic Beginner Routine')");
  await PlaywrightUtils_disableSubscriptions(page);
  await page.getByTestId("clone-program").click();
  await page.getByTestId("footer-graphs").click();

  await expect(page.getByTestId("screen").and(page.locator(":visible"))).toContainText("Your dashboard is empty");

  await page.getByTestId("footer-home").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await PlaywrightUtils_finishExercise(page, "bent-over-row", [1, 1, { amrap: { reps: 5 } }]);
  await PlaywrightUtils_finishExercise(page, "bench-press", [1, 1, { amrap: { reps: 5 } }]);
  await PlaywrightUtils_finishExercise(page, "squat", [1, 1, { amrap: { reps: 5 } }]);
  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-graphs").click();
  await page.getByTestId("dashboard-generate-starter").click();

  await expect(page.getByTestId("dashboard-graph")).toHaveCount(1);
  const legend = page.getByTestId("dashboard-graph").getByTestId("dashboard-graph-legend");
  await expect(legend).toHaveCount(3);
  await expect(legend.filter({ hasText: "Bent Over Row" })).toHaveCount(1);
  await expect(legend.filter({ hasText: "Bench Press" })).toHaveCount(1);
  await expect(legend.filter({ hasText: "Squat" })).toHaveCount(1);
  await expect(page.getByTestId("dashboard-calendar")).toBeVisible();
  await expect(page.getByTestId("dashboard-muscles")).toBeVisible();

  await PlaywrightUtils_setDashboardText(
    page,
    [
      "graph {",
      "  name: Bench Press / source: exercise(Bench Press) / y: e1rm",
      "}",
      "",
      "graph {",
      "  name: Squat / source: exercise(Squat) / y: e1rm",
      "}",
    ].join("\n")
  );

  await expect(page.getByTestId("dashboard-graph")).toHaveCount(2);
  await expect(page.getByTestId("dashboard-graph").nth(0).getByTestId("dashboard-graph-legend")).toHaveText(
    "Bench Press"
  );
  await expect(page.getByTestId("dashboard-graph").nth(1).getByTestId("dashboard-graph-legend")).toHaveText("Squat");
  await expect(page.getByTestId("dashboard-notice")).toHaveCount(0);
});
