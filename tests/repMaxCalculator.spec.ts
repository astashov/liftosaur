import { test, expect } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_type,
} from "./playwrightUtils";

test("Rep Max Calculator", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
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

Squat / 1x8 / 80% / progress: lp(5lb)`
  );

  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("exercise-rm1-picker").click();
  await page.getByTestId("onerm-calculator").click();

  await PlaywrightUtils_type("3", () => page.getByTestId("rep-max-calculator-known-reps"));
  await PlaywrightUtils_type("8", () => page.getByTestId("rep-max-calculator-known-rpe"));
  await PlaywrightUtils_type("5", () => page.getByTestId("rep-max-calculator-target-reps"));
  await PlaywrightUtils_type("7", () => page.getByTestId("rep-max-calculator-target-rpe"));

  await expect(page.getByTestId("rep-max-calculator-target-weight")).toHaveText("182 lb");

  await page.getByTestId("rep-max-calculator-submit").click();
  await expect(page.getByTestId("menu-item-value-1-rep-max")).toHaveValue("182");
});
