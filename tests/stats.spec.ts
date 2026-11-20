import {
  startpage,
  PlaywrightUtils_disableSubscriptions,
  PlaywrightUtils_selectBuiltin,
  PlaywrightUtils_disableTours,
  PlaywrightUtils_selectMenuItem,
  PlaywrightUtils_setDashboardText,
} from "./playwrightUtils";
import { test, expect } from "@playwright/test";

test("enters stats and shows graphs", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_selectBuiltin(page);
  await page.click("button:has-text('Basic Beginner Routine')");
  await PlaywrightUtils_disableSubscriptions(page);
  await page.getByTestId("clone-program").click();

  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-measurements").click();
  await expect(page.locator("text=No measurements added yet")).toBeVisible();

  await page.getByTestId("add-measurements").click();
  await page.getByTestId("modify-stats").click();
  await page.getByTestId("menu-item-name-shoulders").click();
  await page.getByTestId("menu-item-name-forearm-left").click();
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await expect(page.getByTestId("input-stats-neck")).toBeHidden();

  await page.getByTestId("input-stats-bodyweight").fill("10");
  await page.getByTestId("input-stats-shoulders").fill("20");
  await page.getByTestId("input-stats-forearm-left").fill("30");

  await page.getByTestId("add-stats").click();

  await page.getByTestId("add-measurements").click();
  await expect(page.getByTestId("input-stats-bodyweight")).toHaveValue("10");
  await expect(page.getByTestId("input-stats-shoulders")).toHaveValue("20");
  await expect(page.getByTestId("input-stats-forearm-left")).toHaveValue("30");

  await page.getByTestId("input-stats-bodyweight").fill("15");
  await page.getByTestId("input-stats-shoulders").fill("");
  await page.getByTestId("input-stats-forearm-left").fill("35");
  await page.getByTestId("add-stats").click();

  await page.getByTestId("add-measurements").click();
  await expect(page.getByTestId("input-stats-bodyweight")).toHaveValue("15");
  await expect(page.getByTestId("input-stats-shoulders")).toHaveValue("20");
  await expect(page.getByTestId("input-stats-forearm-left")).toHaveValue("35");

  await page.getByTestId("input-stats-bodyweight").fill("");
  await page.getByTestId("input-stats-shoulders").fill("");
  await page.getByTestId("input-stats-forearm-left").fill("40");
  await page.getByTestId("add-stats").click();

  await expect(page.getByTestId("input-stats-value")).toHaveCount(2);
  await expect(page.getByTestId("input-stats-value").nth(0)).toHaveValue("15");
  await expect(page.getByTestId("input-stats-value").nth(1)).toHaveValue("10");
  await expect(page.getByTestId("input-stats-unit")).toHaveCount(2);
  await expect(page.getByTestId("input-stats-unit").nth(0)).toHaveText("lb");
  await expect(page.getByTestId("input-stats-unit").nth(1)).toHaveText("lb");

  await PlaywrightUtils_selectMenuItem(page, "type", "shoulders");
  await expect(page.getByTestId("input-stats-value")).toHaveCount(1);
  await expect(page.getByTestId("input-stats-value").nth(0)).toHaveValue("20");
  await expect(page.getByTestId("input-stats-unit").nth(0)).toHaveText("in");

  await PlaywrightUtils_selectMenuItem(page, "type", "left-forearm");
  await expect(page.getByTestId("input-stats-value")).toHaveCount(3);
  await expect(page.getByTestId("input-stats-value").nth(0)).toHaveValue("40");
  await expect(page.getByTestId("input-stats-value").nth(1)).toHaveValue("35");
  await expect(page.getByTestId("input-stats-value").nth(2)).toHaveValue("30");
  await expect(page.getByTestId("input-stats-unit")).toHaveCount(3);
  await expect(page.getByTestId("input-stats-unit").nth(0)).toHaveText("in");
  await expect(page.getByTestId("input-stats-unit").nth(1)).toHaveText("in");
  await expect(page.getByTestId("input-stats-unit").nth(2)).toHaveText("in");

  await page.getByTestId("delete-stat").nth(1).click();
  await expect(page.getByTestId("input-stats-value")).toHaveCount(2);
  await expect(page.getByTestId("input-stats-value").nth(0)).toHaveValue("40");
  await expect(page.getByTestId("input-stats-value").nth(1)).toHaveValue("30");
  await expect(page.getByTestId("input-stats-unit")).toHaveCount(2);
  await expect(page.getByTestId("input-stats-unit").nth(0)).toHaveText("in");
  await expect(page.getByTestId("input-stats-unit").nth(1)).toHaveText("in");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("complete-set").nth(0).click();
  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await PlaywrightUtils_setDashboardText(
    page,
    ["graph {", "  name: Shoulders / source: stats(shoulders)", "}"].join("\n")
  );

  await expect(page.getByTestId("dashboard-graph")).toHaveCount(1);
  await expect(page.getByTestId("dashboard-graph-legend")).toHaveText("Shoulders");
  await expect(page.getByTestId("dashboard-notice")).toHaveCount(0);
});
