import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("User Prompted State Vars", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1&legacy=1");
  // Creating the program

  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("A Program");
  await page.getByTestId("modal-create-program-submit").click();

  await page.getByTestId("add-exercise").click();
  await page.getByTestId("tab-advanced").click();

  await page.getByTestId("add-state-variable").click();
  await page.getByTestId("modal-add-state-variable-input-name").clear();
  await page.getByTestId("modal-add-state-variable-input-name").type("rpe");
  await page.getByTestId("menu-item-name-user-prompted").click();
  await page.getByTestId("modal-add-state-variable-submit").click();

  await page.getByTestId("add-new-set").click();

  await PlaywrightUtils.clearCodeMirror(page, "multiline-editor-finish-day");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "multiline-editor-finish-day",
    "if (state.rpe > 7) {\n  state.weight = state.weight - 5lb\n} else if (state.rpe < 3) {\n  state.weight = state.weight + 5lb\n}"
  );

  await page.getByTestId("save-program").click();
  await page.getByTestId("edit-day").click();
  await page.getByTestId("menu-item-squat").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();

  PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]"));

  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").clear();
  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").type("8");

  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("state-changes").first()).toContainText("weight: 135 lb -> 130 lb");
  await expect(page.getByTestId("state-changes").first()).toContainText("rpe: 0 -> 8");

  await page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]").nth(4).click();
  await page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]").nth(4).click();
  await page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]").nth(4).click();
  await page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]").nth(4).click();
  await page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]").nth(4).click();
  await page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]").nth(4).click();
  await page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]").nth(4).click();

  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").clear();
  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").type("2");

  await page.getByTestId("modal-amrap-submit").click();
  await expect(page.getByTestId("state-changes").first()).toContainText("weight: 135 lb -> 140 lb");
  await expect(page.getByTestId("state-changes").first()).toContainText("rpe: 0 -> 2");

  await page.getByRole("button", { name: "Finish the workout" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByTestId("start-workout").click();

  await expect(
    page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]").nth(1).getByTestId("weight-value")
  ).toContainText("70");

  PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]"));
  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").clear();
  await page.getByTestId("modal-state-vars-user-prompt-input-rpe").type("5");
  await page.getByTestId("modal-amrap-submit").click();
  await expect(page.getByTestId("state-changes").first()).not.toContainText("weight");
  await expect(page.getByTestId("state-changes").first()).toContainText("rpe: 2 -> 5");
});
