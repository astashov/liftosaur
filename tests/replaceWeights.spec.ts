import { expect, test } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("replaces weights", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("editor-v2-full-program").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1
Squat / 3x8 51lb, 2x8 62kg / 4x8 30%
Bench Press / 3x8 50lb
Bicep Curl / ...Bench Press / 30lb

# Week 2
## Day 1
Squat / 3x8 51lb, 1x8 70lb / 4x8 80lb
Bench Press / 3x8 70lb
Bicep Curl / 1x8 80lb`
  );

  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("entry-squat").getByTestId("exercise-equipment-picker").click();
  await page.getByTestId("modal-equipment").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-barbell").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-barbell").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await page.getByTestId("entry-squat").getByTestId("exercise-options").click();
  await page.getByTestId("exercise-edit-mode").first().click();

  await page.getByTestId("tab-across-all-weeks").click();
  await page.getByTestId("tab-weights").click();

  await expect(page.getByTestId("input-set-weight-field").nth(0)).toHaveText("51 lb");
  await expect(page.getByTestId("input-set-weight-field").nth(1)).toHaveText("62 kg");
  await expect(page.getByTestId("input-set-weight-field").nth(2)).toHaveText("30 %");
  await expect(page.getByTestId("input-set-weight-field").nth(3)).toHaveText("70 lb");
  await expect(page.getByTestId("input-set-weight-field").nth(4)).toHaveText("80 lb");

  await page.getByTestId("input-set-weight-field").nth(0).click();
  await page.getByTestId("keyboard-plus").click();
  await page.getByTestId("keyboard-close").click();

  await page.getByTestId("input-set-weight-field").nth(1).click();
  await page.getByTestId("keyboard-minus").click();
  await page.getByTestId("keyboard-close").click();

  await page.getByTestId("input-set-weight-field").nth(2).click();
  await page.getByTestId("keyboard-plus").click();
  await page.getByTestId("keyboard-close").click();

  await expect(page.getByTestId("input-set-weight-field").nth(0)).toHaveText("52.5 lb");
  await expect(page.getByTestId("input-set-weight-field").nth(1)).toHaveText("60 kg");
  await expect(page.getByTestId("input-set-weight-field").nth(2)).toHaveText("31 %");

  await page.getByTestId("input-set-weight-field").nth(3).click();
  console.log("Clicking keyboard-rm-calculator");
  await page.getByTestId("keyboard-rm-calculator").click();

  await PlaywrightUtils.type("3", () => page.getByTestId("rep-max-calculator-known-reps"));
  await PlaywrightUtils.type("8", () => page.getByTestId("rep-max-calculator-known-rpe"));
  await PlaywrightUtils.type("5", () => page.getByTestId("rep-max-calculator-target-reps"));
  await PlaywrightUtils.type("7", () => page.getByTestId("rep-max-calculator-target-rpe"));

  await page.getByTestId("rep-max-calculator-submit").click();
  await expect(page.getByTestId("input-set-weight-field").nth(3)).toHaveText("182 lb");
  await page.getByTestId("save-program-exercise").click();

  await expect(page.getByTestId("entry-squat").getByTestId("input-set-weight-field").nth(1)).toHaveText("52.5");
  await expect(page.getByTestId("entry-squat").getByTestId("input-set-weight-field").nth(4)).toHaveText("132.5");

  await page.getByTestId("footer-program").click();
  await page.getByTestId("editor-v2-perday-program").click();

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    `Squat / 3x8 52.5lb, 2x8 60kg / 4x8 31%Bench Press / 3x8 / 50lbBicep Curl / ...Bench Press / 30lb`
  );
  await page.getByTestId("tab-week-2").click();

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    `Squat / 3x8 52.5lb, 1x8 182lb / 4x8 80lbBench Press / 3x8 / 70lbBicep Curl / 1x8 / 80lb`
  );
});
