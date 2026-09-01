import { test, expect } from "@playwright/test";
import { startpage, PlaywrightUtils_createProgram, PlaywrightUtils_disableTours } from "./playwrightUtils";

// Undo restores `current.program` but not `ui`, so the week the editor is sitting on can outlive the
// week itself. The week view has to survive that render, not just the remount that a mode switch
// would have given it.
test("undoing an added week while it is selected", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await page.getByTestId("tab-edit").click();

  await page.getByTestId("editor-v2-grid-program").click();
  await page.getByTestId("grid-add-week").click();
  await page.getByTestId("editor-v2-ui-program").click();
  await page.getByTestId("tab-week-2").click();

  await page.locator(".nm-program-undo").click();

  await expect(page.getByTestId("add-exercise").first()).toBeVisible();
  expect(errors).toEqual([]);
});
