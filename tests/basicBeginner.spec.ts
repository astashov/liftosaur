import { PlaywrightUtils } from "./playwrightUtils";
import { test, expect } from "@playwright/test";

test("Basic Beginner Program", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
  await page.getByRole("button", { name: "Basic Beginner Routine" }).click();
  PlaywrightUtils.disableSubscriptions(page);
  await page.getByTestId("clone-program").click();
  await page.getByTestId("start-workout").click();

  // Workout A

  // First exercise is successful
  PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("5");
  await page.getByTestId("modal-amrap-submit").click();

  await page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') >> [data-cy=change-weight]").click();
  await page.getByTestId("modal-weight-input").clear();
  await page.getByTestId("modal-weight-input").type("140");
  await page.getByTestId("modal-weight-submit").click();

  // Second exercise is successful
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
  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Deadlift') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").clear();
  await page.getByTestId("modal-amrap-input").type("5");
  await page.getByTestId("modal-amrap-submit").click();

  await page.locator("[data-cy^=exercise-]:has-text('Deadlift') >> [data-cy=change-weight]").click();
  await page.getByTestId("modal-weight-input").clear();
  await page.getByTestId("modal-weight-input").type("250");
  await page.getByTestId("modal-weight-submit").click();

  // Third exercise is unsuccessful
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
  ).toHaveText("142.5");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Squat') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("205");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("45");

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
  ).toHaveText("BW");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Deadlift') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("255");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Overhead Press') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("45");

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
  ).toHaveText("145");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Squat') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("182.5");
  await expect(
    page
      .getByTestId("history-record")
      .first()
      .locator("[data-cy=history-entry-exercise]:has-text('Bench Press') >> [data-cy=history-entry-weight]")
      .first()
  ).toHaveText("45");
});
