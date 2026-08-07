import { expect, test } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_createProgram,
  PlaywrightUtils_disableTours,
  PlaywrightUtils_activeScreen,
  PlaywrightUtils_saveExerciseInSheet,
} from "./playwrightUtils";

test("replaces weights", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(
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

  // Week 1 declaration: 51lb +barbell-step-> 52.5lb, 62kg -> 60kg, 30% -> 31%.
  await PlaywrightUtils_saveExerciseInSheet(page, "Squat / 3x8 52.5lb, 2x8 60kg / 4x8 31%");

  // Week 2 declaration via the sheet's week chip: 51lb -> 52.5lb, 70lb -> 182lb.
  await page.getByTestId("entry-squat").getByTestId("exercise-options").click();
  await page.getByTestId("exercise-edit-mode").first().click();
  await page.getByTestId("editor-sheet").getByTestId("editor-sheet-instance-2-1").click();
  await PlaywrightUtils_clearCodeMirror(page, "editor-sheet");
  await PlaywrightUtils_typeCodeMirror(page, "editor-sheet", "Squat / 3x8 52.5lb, 1x8 182lb / 4x8 80lb");
  await page.getByTestId("editor-sheet").getByTestId("editor-sheet-save").click();
  await expect(page.getByTestId("editor-sheet")).toBeHidden();

  await expect(
    PlaywrightUtils_activeScreen(page).getByTestId("entry-squat").getByTestId("input-set-weight-field").nth(1)
  ).toHaveText("52.5");
  await expect(
    PlaywrightUtils_activeScreen(page).getByTestId("entry-squat").getByTestId("input-set-weight-field").nth(4)
  ).toHaveText("132.5");

  await page.getByTestId("footer-program").click();
  await PlaywrightUtils_activeScreen(page).getByTestId("tab-edit").click();
  await PlaywrightUtils_activeScreen(page).getByTestId("editor-v2-perday-program").click();

  await expect(
    PlaywrightUtils_activeScreen(page)
      .getByTestId("planner-editor")
      .and(PlaywrightUtils_activeScreen(page).locator(":visible"))
      .first()
  ).toContainText(`Squat / 3x8 52.5lb, 2x8 60kg / 4x8 31%Bench Press / 3x8 50lbBicep Curl / ...Bench Press / 30lb`);
  await PlaywrightUtils_activeScreen(page).getByTestId("tab-week-2").click();

  await expect(
    PlaywrightUtils_activeScreen(page)
      .getByTestId("planner-editor")
      .and(PlaywrightUtils_activeScreen(page).locator(":visible"))
      .first()
  ).toContainText(`Squat / 3x8 52.5lb, 1x8 182lb / 4x8 80lbBench Press / 3x8 70lbBicep Curl / 1x8 80lb`);
});
