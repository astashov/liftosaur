import { startpage } from "./playwrightUtils";
import { test, expect } from "@playwright/test";

test("converts length units properly", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.click("button:has-text('Basic Beginner Routine')");
  await page.getByTestId("clone-program").click();

  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-measurements").click();
  await page.getByTestId("add-measurements").click();
  await page.getByTestId("modify-stats").click();
  await page.getByTestId("menu-item-name-shoulders").click();
  await page.getByTestId("menu-item-name-forearm-left").click();
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await page.getByTestId("input-stats-bodyweight").fill("10.12");
  await page.getByTestId("input-stats-shoulders").fill("20.34");
  await page.getByTestId("input-stats-forearm-left").fill("30.56");
  await page.getByTestId("add-stats").click();

  await page.getByTestId("footer-me").click();
  await expect(page.getByTestId("menu-item-value-length-units")).toHaveText("in");
  await page.getByTestId("menu-item-name-length-units").click();
  await page.getByTestId("menu-item-length-units").getByTestId("scroll-barrel-item-cm").click();
  await page.getByTestId("menu-item-measurements").click();

  await page.getByTestId("add-measurements").click();
  await expect(page.locator("text=Shoulders (cm)")).toHaveCount(1);
  await expect(page.getByTestId("input-stats-shoulders")).toHaveValue("51.66");
  await page.getByTestId("input-stats-shoulders").fill("40");
  await page.getByTestId("add-stats").click();

  await page.getByTestId("menu-item-name-type").click();
  await page.getByTestId("menu-item-type").getByTestId("scroll-barrel-item-shoulders").click();
  await expect(page.getByTestId("input-stats-value")).toHaveCount(2);
  await expect(page.getByTestId("stats-list-shoulders").locator("[data-cy='input-stats-value']").nth(0)).toHaveValue(
    "40"
  );
  await expect(page.getByTestId("input-stats-value").nth(1)).toHaveValue("51.66");
  await expect(page.getByTestId("input-stats-unit").nth(0)).toHaveText("cm");
  await expect(page.getByTestId("input-stats-unit").nth(1)).toHaveText("cm");

  await page.getByTestId("footer-me").click();
  await expect(page.getByTestId("menu-item-value-length-units")).toHaveText("cm");
  await page.getByTestId("menu-item-name-length-units").click();
  await page.getByTestId("menu-item-length-units").getByTestId("scroll-barrel-item-in").click();
  await page.waitForTimeout(200);
  await page.getByTestId("menu-item-measurements").click();

  await page.getByTestId("menu-item-name-type").click();
  await page.getByTestId("menu-item-type").getByTestId("scroll-barrel-item-shoulders").click();
  await expect(page.getByTestId("input-stats-value")).toHaveCount(2);
  await expect(page.getByTestId("stats-list-shoulders").locator("[data-cy='input-stats-value']").nth(0)).toHaveValue(
    "15.75"
  );
  await expect(page.getByTestId("input-stats-value").nth(1)).toHaveValue("20.34");
  await expect(page.getByTestId("input-stats-unit").nth(0)).toHaveText("in");
  await expect(page.getByTestId("input-stats-unit").nth(1)).toHaveText("in");
});
