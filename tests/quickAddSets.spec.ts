import { startpage, PlaywrightUtils } from "./playwrightUtils";
import { test, expect } from "@playwright/test";

test("creates a new program and runs it", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&legacy=1");

  // Creating the program

  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").click();
  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-program-submit").click();

  await page.getByTestId("edit-day").click();
  await page.getByText("Create New Exercise").click();
  await page.getByTestId("tab-advanced").click();

  await page.getByTestId("add-state-variable").click();
  await page.getByTestId("modal-add-state-variable-input-name").fill("lastrep");
  await page.getByTestId("modal-add-state-variable-submit").click();

  await page.getByText("Add New Set").click();
  await page.getByText("Add New Set").click();

  await page.getByTestId("menu-item-name-enable-quick-add-sets").click();

  await PlaywrightUtils.clearCodeMirror(page, "multiline-editor-finish-day");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "multiline-editor-finish-day",
    "if (numberOfSets > 4) {\n  state.weight = state.weight + 5\n}\nstate.lastrep = reps[ns]"
  );
  await page.getByTestId("save-exercise").click();

  await page.getByTestId("navbar-back").click();
  await page.getByTestId("navbar-back").click();
  await page.getByTestId("menu-item-my-program").click();

  // Running the program

  await page.getByTestId("start-workout").click();
  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Squat') [data-cy^=set-]"));
  await expect(page.getByTestId("state-changes-value-lastrep")).toHaveText("0 -> 5");

  await page.getByTestId("add-workout-set").click();
  await page.getByTestId("modal-edit-set-reps-input").fill("6");
  await page.getByTestId("modal-edit-set-weight-input").fill("100");
  await page.getByTestId("modal-edit-set-submit").click();
  await expect(page.getByTestId("state-changes-value-lastrep")).toHaveText("0 -> 6");
  await expect(page.getByTestId("state-changes-value-weight")).not.toBeVisible();

  await page.getByTestId("add-workout-set").click();
  await page.getByTestId("modal-edit-set-reps-input").fill("7");
  await page.getByTestId("modal-edit-set-weight-input").fill("120");
  await page.getByTestId("modal-edit-set-submit").click();
  await expect(page.getByTestId("state-changes-value-lastrep")).toHaveText("0 -> 7");
  await expect(page.getByTestId("state-changes-value-weight")).toHaveText("135 lb -> 140 lb");

  await expect(page.getByTestId("workout-set")).toHaveCount(5);
});
