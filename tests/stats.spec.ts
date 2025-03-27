import { PlaywrightUtils, startpage } from "./playwrightUtils";
import { test, expect } from "@playwright/test";

test("enters stats and shows graphs", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await page.click("button:has-text('Basic Beginner Routine')");
  await PlaywrightUtils.disableSubscriptions(page);
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

  await page.getByTestId("menu-item-name-type").click();
  await page.getByTestId("menu-item-type").locator("[data-cy=scroll-barrel-item-shoulders]").click();
  await expect(page.getByTestId("input-stats-value")).toHaveCount(1);
  await expect(page.getByTestId("input-stats-value").nth(0)).toHaveValue("20");
  await expect(page.getByTestId("input-stats-unit").nth(0)).toHaveText("in");

  await page.getByTestId("menu-item-type").locator("[data-cy=scroll-barrel-item-left-forearm]").click();
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

  await page.getByTestId("footer-graphs").click();
  await page.getByTestId("graphs-modify").click();

  await expect(page.getByTestId("item-graph-bent-over-row")).toBeVisible();
  await expect(page.getByTestId("menu-item-bodyweight")).toBeVisible();
  await expect(page.getByTestId("menu-item-shoulders")).toBeVisible();
  await expect(page.getByTestId("menu-item-left-forearm")).toBeVisible();
  await expect(page.getByTestId("menu-item-neck")).toBeHidden();

  await page.getByTestId("menu-item-shoulders").click();
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await expect(page.getByTestId("graph")).toHaveCount(1);
  await expect(page.getByTestId("graph").nth(0).locator("css=.u-title")).toHaveText("Shoulders");
});
