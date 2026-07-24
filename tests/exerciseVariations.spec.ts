import { test, expect, Page } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_createProgram,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_disableTours,
} from "./playwrightUtils";

const ladderProgram = `# Week 1
## Day 1
Squat | Pistol Squat | Front Squat / 3x8 / 100lb`;

// Seed a program from planner text and land on the UI editor (staying inside the editor,
// unlike PlaywrightUtils_createProgramWithCode which saves and exits).
async function seedProgram(page: Page, code: string): Promise<void> {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await expect(page.getByTestId("program-select-create")).toBeVisible();
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(page, "planner-editor", code);
  await page.getByTestId("editor-v2-ui-program").click();
}

test("Program screen shows non-current exercise variations", async ({ page }) => {
  await seedProgram(page, ladderProgram);

  const summary = page.getByTestId("exercise-variations-summary");
  await expect(summary).toContainText("Variations:");
  await expect(summary).toContainText("Pistol Squat");
  await expect(summary).toContainText("Front Squat");
});

test("Edit program exercise: switch the current variation", async ({ page }) => {
  await seedProgram(page, ladderProgram);
  await page.getByTestId("edit-exercise").first().click();

  // A ladder (>1 variation) opens with the variations section already expanded.
  await expect(page.getByTestId("exercise-variations")).toBeVisible();
  await page.getByTestId("exercise-variation-make-current-2").click();
  await page.getByTestId("save-program-exercise").click();

  await page.getByTestId("editor-v2-perday-program").click();
  await expect(page.getByTestId("planner-editor")).toContainText("! Pistol Squat");
});

test("Edit program exercise: remove a variation", async ({ page }) => {
  await seedProgram(page, ladderProgram);
  await page.getByTestId("edit-exercise").first().click();

  await expect(page.getByTestId("exercise-variations")).toBeVisible();
  await page.getByTestId("exercise-variation-remove-3").click();
  await page.getByTestId("save-program-exercise").click();

  await page.getByTestId("editor-v2-perday-program").click();
  await expect(page.getByTestId("planner-editor")).toContainText("Pistol Squat");
  await expect(page.getByTestId("planner-editor")).not.toContainText("Front Squat");
});

test("Edit program exercise: add a variation via the picker", async ({ page }) => {
  await seedProgram(page, `# Week 1\n## Day 1\nSquat | Pistol Squat / 3x8 / 100lb`);
  await page.getByTestId("edit-exercise").first().click();

  await expect(page.getByTestId("exercise-variations")).toBeVisible();
  await page.getByTestId("exercise-variations-add").click();
  await page.getByTestId("exercise-filter-by-name").fill("Front Squat");
  await page.getByTestId("menu-item-front-squat-barbell").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("save-program-exercise").click();

  await page.getByTestId("editor-v2-perday-program").click();
  await expect(page.getByTestId("planner-editor")).toContainText("Front Squat");
  await expect(page.getByTestId("planner-editor")).toContainText("|");
});
