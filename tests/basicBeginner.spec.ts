import { PlaywrightUtils, startpage } from "./playwrightUtils";
import { test, expect } from "@playwright/test";

test("Basic Beginner Program", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await page.getByRole("button", { name: "Basic Beginner Routine" }).click();
  PlaywrightUtils.disableSubscriptions(page);
  await page.getByTestId("clone-program").click();
  await page.getByTestId("start-workout").click();

  // Workout A

  // First exercise is successful
  await page.locator("[data-cy^=exercise-]:has-text('Bent Over Row')").getByTestId("exercise-edit-mode").click();
  await page.getByTestId("modal-edit-mode").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-barbell").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-barbell").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("modal-edit-mode-save-statvars").click();

  PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("5");
  await page.getByTestId("modal-amrap-submit").click();

  await page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') >> [data-cy=change-weight]").click();
  await page.getByTestId("modal-weight-input").clear();
  await page.getByTestId("modal-weight-input").type("140");
  await page.getByTestId("modal-weight-submit").click();

  // Second exercise is successful
  await page.locator("[data-cy^=exercise-]:has-text('Squat')").getByTestId("exercise-edit-mode").click();
  await page.getByTestId("modal-edit-mode").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-barbell").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-barbell").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("modal-edit-mode-save-statvars").click();

  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("5");
  await page.getByTestId("modal-amrap-submit").click();

  await page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy=change-weight]").click();
  await page.getByTestId("modal-weight-input").clear();
  await page.getByTestId("modal-weight-input").type("200");
  await page.getByTestId("modal-weight-submit").click();

  await page.getByRole("button", { name: "Finish the workout" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Workout B

  await page.getByTestId("start-workout").click();

  // First exercise is successful
  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Chin Up') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("5");
  await page.getByTestId("modal-amrap-submit").click();

  // Second exercise is successful
  await page.locator("[data-cy^=exercise-]:has-text('Deadlift')").getByTestId("exercise-edit-mode").click();
  await page.getByTestId("modal-edit-mode").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-barbell").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-barbell").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("modal-edit-mode-save-statvars").click();

  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Deadlift') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("5");
  await page.getByTestId("modal-amrap-submit").click();

  await page.locator("[data-cy^=exercise-]:has-text('Deadlift') >> [data-cy=change-weight]").click();
  await page.getByTestId("modal-weight-input").clear();
  await page.getByTestId("modal-weight-input").type("250");
  await page.getByTestId("modal-weight-submit").click();

  // Third exercise is unsuccessful
  await page.locator("[data-cy^=exercise-]:has-text('Overhead Press')").getByTestId("exercise-edit-mode").click();
  await page.getByTestId("modal-edit-mode").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-barbell").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-barbell").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("modal-edit-mode-save-statvars").click();

  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Overhead Press') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("5");
  await page.getByTestId("modal-amrap-submit").click();
  await page.locator("[data-cy^=exercise-]:has-text('Overhead Press') >> [data-cy^=set-]").first().click();

  await page.locator("[data-cy^=exercise-]:has-text('Overhead Press') >> [data-cy=change-weight]").click();
  await page.getByTestId("modal-weight-input").clear();
  await page.getByTestId("modal-weight-input").type("100");
  await page.getByTestId("modal-weight-submit").click();

  await page.getByRole("button", { name: "Finish the workout" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Check next exercise conditions
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Bent Over Row') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("97.5lb");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Squat') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("50lb");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("45lb");

  // Workout A

  await page.getByTestId("start-workout").click();

  // First exercise is successful
  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("5");
  await page.getByTestId("modal-amrap-submit").click();

  // Second exercise is unsuccessful
  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("3");
  await page.getByTestId("modal-amrap-submit").click();

  // Third exercise is successful
  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Bench Press') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("5");
  await page.getByTestId("modal-amrap-submit").click();

  await page.getByRole("button", { name: "Finish the workout" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Check next exercise conditions
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Chin Up') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("5lb");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Deadlift') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("100lb");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Overhead Press') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("45lb");

  // Workout B

  await page.getByTestId("start-workout").click();

  await page.getByRole("button", { name: "Finish the workout" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Check next exercise conditions
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Bent Over Row') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("100lb");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Squat') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("45lb");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("50lb");
});
