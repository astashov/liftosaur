import { startpage } from "./playwrightUtils";
import { test, expect } from "@playwright/test";

test("subscriptions", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&enforce=1");
  await page.locator("button:has-text('Basic Beginner Routine')").click();
  const adminKey = process.env.CYPRESS_LIFTOSAUR_ADMIN_KEY;
  await page.getByTestId("clone-program").click();
  await page.getByTestId("footer-graphs").click();

  await expect(page.locator("body")).toContainText("Liftosaur Premium");
  await expect(page.getByTestId("button-subscription-monthly")).toHaveText("$4.99/month");

  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).state.storage.subscription.key = "test";
  });
  await page.waitForTimeout(2000);
  await page.goto(startpage + "?skipintro=1&enforce=1");
  await page.getByTestId("footer-graphs").click();
  await expect(page.getByTestId("screen")).toContainText("Select graphs you want to display");
  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-changelog").click();
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();
  await page.waitForTimeout(2000);
  await page.getByTestId("footer-graphs").click();
  await expect(page.getByTestId("button-subscription-monthly")).toHaveText("$4.99/month");

  await page.evaluate(
    ([k]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).service.postAddFreeUser((window as any).state.storage.tempUserId, k);
    },
    [adminKey]
  );

  await page.waitForTimeout(2000);
  await page.goto(startpage + "?skipintro=1&enforce=1");
  await page.getByTestId("footer-graphs").click();
  await page.getByTestId("button-subscription-free").click();
  await page.getByTestId("footer-graphs").click();
  await expect(page.getByTestId("screen")).toContainText("Select graphs you want to display");
});
