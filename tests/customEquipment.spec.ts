import { test, expect } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_disableSubscriptions,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_clickAll,
} from "./playwrightUtils";

test("custom equipment", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await page.getByTestId("create-program").click();
  PlaywrightUtils_disableSubscriptions(page);

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1
Bicep Curl / 1x5 20lb / warmup: none`
  );

  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();
  await PlaywrightUtils_clickAll(page.getByTestId("entry-bicep-curl").getByTestId("complete-set"));

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-available-equipment").click();

  await page.getByRole("button", { name: "Add New Equipment Type" }).click();
  await page.getByTestId("equipment-name-input").clear();
  await page.getByTestId("equipment-name-input").type("Boom");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByTestId("group-header-boom").click();

  await page.getByRole("button", { name: "Add New Plate Weight" }).click();
  await page.getByTestId("plate-input").clear();
  await page.getByTestId("plate-input").type("8");
  await page.getByTestId("add-plate").click();
  await page.getByTestId("menu-item-value-8-lb").clear();
  await page.getByTestId("menu-item-value-8-lb").type("6");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();

  await page.getByTestId("exercise-equipment-picker").click();
  await page.getByTestId("modal-equipment").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-boom").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-boom").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await expect(page.getByTestId("plates-list")).toHaveText("10/10");

  await page.getByTestId("exercise-name").click();
  await expect(page.getByTestId("menu-item-value-equipment")).toHaveText("Boom");

  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-available-equipment").click();
  await page.getByTestId("group-header-boom").click();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByTestId("delete-equipment-boom").click();

  await expect(page.getByTestId("group-header-boom")).toHaveCount(0);

  await page.getByTestId("footer-workout").click();

  await page.getByTestId("exercise-equipment-picker").click();
  await expect(page.getByTestId("modal-equipment").getByTestId("menu-item-value-equipment")).toHaveText("None");
});
