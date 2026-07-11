import { startpage, PlaywrightUtils_disableTours } from "./playwrightUtils";
import { test, expect } from "@playwright/test";

// Walks the real onboarding (no skipintro) to reach the "How did you hear about us?" survey, which
// is inserted between the equipment setup and program selection.
async function gotoSurvey(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(startpage + "?nosync=true");
  PlaywrightUtils_disableTours(page);
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Continue" }).click(); // units screen
  await page.getByTestId("setup-equipment-skip").click(); // equipment -> hearaboutus
  await expect(page.getByTestId("hear-about-us-option-reddit")).toBeVisible();
}

test("How did you hear about us - answer via a drill-down chip", async ({ page }) => {
  await gotoSurvey(page);

  await page.getByTestId("hear-about-us-option-reddit").click();

  // Step 2 drill-down; tapping a chip is the answer and advances to program selection.
  await expect(page.getByTestId("hear-about-us-chip-r/gzcl")).toBeVisible();
  await page.getByTestId("hear-about-us-chip-r/gzcl").click();

  await expect(page.getByTestId("program-select-builtin")).toBeVisible();

  const result = await page.evaluate(() => (window as unknown as { state?: any }).state?.storage?.hearAboutUs?.result);
  expect(result?.source).toBe("reddit");
  expect(result?.detail).toBe("r/gzcl");
});

test("How did you hear about us - answer via freeform + Done", async ({ page }) => {
  await gotoSurvey(page);

  await page.getByTestId("hear-about-us-option-reddit").click();
  await page.getByTestId("hear-about-us-freeform").fill("r/somethingelse");
  await page.getByTestId("hear-about-us-done").click();

  await expect(page.getByTestId("program-select-builtin")).toBeVisible();

  const result = await page.evaluate(() => (window as unknown as { state?: any }).state?.storage?.hearAboutUs?.result);
  expect(result?.source).toBe("reddit");
  expect(result?.freeform).toBe("r/somethingelse");
});

test("How did you hear about us - skipping marks it done (no backfill later)", async ({ page }) => {
  await gotoSurvey(page);

  // Skip without picking a source (the navbar "Skip" on the onboarding screen).
  await page.getByTestId("hear-about-us-skip").click();

  await expect(page.getByTestId("program-select-builtin")).toBeVisible();

  // Explicit skip is terminal: no answer, and done=true so the backfill modal never re-asks.
  const hearAboutUs = await page.evaluate(() => (window as unknown as { state?: any }).state?.storage?.hearAboutUs);
  expect(hearAboutUs?.result).toBeFalsy();
  expect(hearAboutUs?.done).toBe(true);
});

test("How did you hear about us - immediate resolve for a no-drill option", async ({ page }) => {
  await gotoSurvey(page);

  // "Github" has no drill-down — picking it should finalize immediately and advance.
  await page.getByTestId("hear-about-us-option-github").click();

  await expect(page.getByTestId("program-select-builtin")).toBeVisible();

  const result = await page.evaluate(() => (window as unknown as { state?: any }).state?.storage?.hearAboutUs?.result);
  expect(result?.source).toBe("github");
});
