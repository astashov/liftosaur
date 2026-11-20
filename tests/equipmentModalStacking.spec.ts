import { test, expect } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_disableSubscriptions,
  PlaywrightUtils_createProgram,
  PlaywrightUtils_disableTours,
  PlaywrightUtils_selectOption,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
} from "./playwrightUtils";

test("add plate from workout equipment modal", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await PlaywrightUtils_disableSubscriptions(page);
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(page, "planner-editor", `# Week 1\n## Day 1\nSquat / 1x5 135lb / warmup: none`);
  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();
  await page.getByTestId("exercise-equipment-picker").first().click();
  await PlaywrightUtils_selectOption(
    page.getByTestId("modal-equipment").getByTestId("menu-item-value-equipment"),
    "barbell"
  );
  await page.getByTestId("equipment-plates-add").and(page.locator(":visible")).click();
  await page.getByPlaceholder("Weight in lb").fill("3.3");
  await page.getByTestId("add-plate").click({ timeout: 5000 });
  await expect(page.getByTestId("add-plate")).toHaveCount(0);
  await expect(page.getByTestId("modal-equipment").getByText("3.3 lb", { exact: true })).toBeVisible();

  await page.getByTestId("equipment-new").and(page.locator(":visible")).click();
  await page.getByTestId("equipment-name-input").fill("Zed");
  await page.getByTestId("add-equipment-submit").click({ timeout: 5000 });
});
