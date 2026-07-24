import { startpage, PlaywrightUtils_selectBuiltin, PlaywrightUtils_disableTours } from "./playwrightUtils";
import { test, expect } from "@playwright/test";

test("subscriptions", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&enforce=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_selectBuiltin(page);
  await page.locator("button:has-text('Basic Beginner Routine')").click();
  const adminKey = process.env.CYPRESS_LIFTOSAUR_ADMIN_KEY;
  await page.getByTestId("clone-program").click();

  await page.getByTestId("footer-graphs").click();

  await expect(page.locator("body")).toContainText("Liftosaur Premium");
  await expect(page.getByTestId("button-subscription-monthly")).toContainText("$4.99/month");

  // Persist the fake key directly — mutating window.state alone is not picked up by the
  // debounced save unless another dispatch happens afterwards.
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).state.storage.subscription.key = "test";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).storeData({ storage: (window as any).state.storage });
  });

  // On load with enforce=1 the server clears the bogus key. The test needs to observe both
  // sides of that (premium granted locally, then revoked), so hold the verify response until
  // the premium state has been asserted — otherwise it's a race the test sometimes loses.
  let releaseVerify = (): void => {};
  const verifyHeld = new Promise<void>((resolve) => (releaseVerify = resolve));
  await page.route("**/api/verifysubscriptionkey", async (route) => {
    await verifyHeld;
    await route.continue();
  });

  await page.goto(startpage + "?skipintro=1&enforce=1");
  await PlaywrightUtils_disableTours(page);
  await page.getByTestId("footer-graphs").click();
  await expect(page.getByTestId("screen").and(page.locator(":visible"))).toContainText(
    "Select graphs you want to display"
  );

  const verifyResponse = page.waitForResponse("**/api/verifysubscriptionkey");
  releaseVerify();
  await verifyResponse;

  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-changelog").click();
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();
  await page.getByTestId("footer-graphs").click();
  await expect(page.getByTestId("button-subscription-monthly")).toContainText("$4.99/month");

  await page.evaluate(
    ([k]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).service.postAddFreeUser((window as any).state.storage.tempUserId, k);
    },
    [adminKey]
  );
  await page.goto(startpage + "?skipintro=1&enforce=1");
  await PlaywrightUtils_disableTours(page);
  await page.getByTestId("footer-graphs").click();
  await page.getByTestId("button-subscription-free").click();
  await page.getByTestId("footer-graphs").click();
  await expect(page.getByTestId("screen").and(page.locator(":visible"))).toContainText(
    "Select graphs you want to display"
  );
});
