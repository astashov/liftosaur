import { test, expect, Page } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_disableSubscriptions,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_createProgram,
  PlaywrightUtils_disableTours,
  PlaywrightUtils_typeKeyboard,
} from "./playwrightUtils";

async function fillNumber(page: Page, testId: string, value: string): Promise<void> {
  await PlaywrightUtils_typeKeyboard(page, page.locator(`[data-testid="${testId}"]:visible`).first(), value);
}

async function pickEquipment(page: Page, name: string): Promise<void> {
  await page.getByTestId("modal-equipment").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId(`scroll-barrel-item-${name}`).scrollIntoViewIfNeeded();
  await page.getByTestId(`scroll-barrel-item-${name}`).click();
  await page.waitForTimeout(500);
}

async function closeModal(page: Page): Promise<void> {
  await page.getByTestId("bottom-sheet-close").and(page.locator(":visible")).click();
}

test("custom equipment", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await PlaywrightUtils_disableSubscriptions(page);

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

  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-available-equipment").click();
  await page.getByRole("button", { name: "Add New Equipment Type" }).click();
  await page.getByTestId("equipment-name-input").fill("Boom");
  await page.getByTestId("add-equipment-submit").click();
  await expect(page.locator(`[data-testid="equipment-editor"]:visible`)).toHaveCount(1);
  await fillNumber(page, "input-equipment-base-field", "0");
  await fillNumber(page, "input-equipment-try-weight-field", "20");
  await expect(page.locator(`[data-testid="equipment-try-result"]:visible`)).toHaveText("10");
  await page.locator(`[data-testid="navbar-back"]:visible`).click();
  await expect(page.getByTestId("group-header-boom")).toContainText("Plates");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();
  await page.getByTestId("exercise-equipment-picker").click();
  await pickEquipment(page, "boom");
  await closeModal(page);
  await expect(page.getByTestId("set-plates-list")).toHaveText("10");

  await page.getByTestId("exercise-equipment-picker").click();
  await fillNumber(page, "input-equipment-base-field", "10");
  await closeModal(page);
  await expect(page.getByTestId("set-plates-list")).toHaveText("5");

  await page.getByTestId("exercise-equipment-picker").click();
  await page.getByTestId("equipment-copy-this").click();
  await expect(page.getByTestId("modal-equipment").getByTestId("menu-item-value-equipment")).toHaveText("Bicep Curl");
  await fillNumber(page, "input-equipment-base-field", "0");
  await closeModal(page);
  await expect(page.getByTestId("set-plates-list")).toHaveText("10");

  await page.getByTestId("exercise-equipment-picker").click();
  await expect(page.getByTestId("equipment-remove")).toHaveText("Delete Bicep Curl");
  await page.getByTestId("equipment-remove").click();
  await expect(page.getByTestId("modal-equipment").getByTestId("menu-item-value-equipment")).toHaveText("Dumbbell");
  await expect(page.getByTestId("equipment-remove")).toHaveText("Hide Dumbbell");
  await closeModal(page);

  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-available-equipment").click();
  await expect(page.getByTestId("group-header-boom")).toContainText("10 lb base");
  await expect(page.getByTestId("group-header-bicep-curl")).toHaveCount(0);
  await page.getByTestId("copy-equipment-boom").click();
  await expect(page.locator(`[data-testid="equipment-editor"]:visible`)).toHaveCount(1);
  await page.locator(`[data-testid="navbar-back"]:visible`).click();
  await expect(page.getByTestId("group-header-boom-2")).toContainText("10 lb base");
  await page.getByTestId("delete-equipment-dumbbell").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("exercise-equipment-picker").click();
  await expect(page.getByTestId("modal-equipment").getByTestId("menu-item-value-equipment")).toHaveText("None");
});

test("bands equipment", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await PlaywrightUtils_disableSubscriptions(page);

  await page.getByTestId("footer-me").click();
  await page.getByTestId("menu-item-available-equipment").click();
  await page.getByRole("button", { name: "Add New Equipment Type" }).click();
  await page.getByTestId("equipment-name-input").fill("Loops");
  await page.getByTestId("menu-item-value-type").click();
  await page.getByTestId("scroll-barrel-item-bands").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-bands").click();
  await page.waitForTimeout(500);
  await page.getByTestId("add-equipment-submit").click();
  await expect(page.locator(`[data-testid="equipment-editor"]:visible`)).toHaveCount(1);

  await fillNumber(page, "input-equipment-try-weight-field", "65");
  await expect(page.locator(`[data-testid="equipment-try-result"]:visible`)).toHaveText("Green");
  await page.locator(`[data-testid="menu-item-value-combine-bands"]:visible`).click();
  await expect(page.locator(`[data-testid="equipment-try-result"]:visible`)).toHaveText("Blue + Red");

  await page.locator(`[data-testid="equipment-add-band"]:visible`).click();
  await expect(page.locator(`[data-testid="equipment-band-name-5"]:visible`)).toHaveValue("Band 6");
  await page.locator(`[data-testid="navbar-back"]:visible`).click();
  await expect(page.getByTestId("group-header-loops")).toContainText("Yellow, Red, Blue, Green, Black, Band 6");
});
