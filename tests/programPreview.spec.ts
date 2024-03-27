import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("Program Preview", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
  await page.getByRole("button", { name: "Basic Beginner Routine" }).click();
  await page.getByTestId("preview-program").click();
  await expect(page.getByTestId("program-name")).toHaveText("Basic Beginner Routine");
  await expect(page.getByTestId("program-author")).toHaveText("By /r/fitness");
  await expect(page.getByTestId("preview-day-workout-a").first().getByTestId("preview-day-name")).toHaveText(
    "Week 1 - Workout A"
  );

  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .first()
      .getByTestId("bent-over-row")
      .getByTestId("history-entry-sets-next")
      .first()
  ).toHaveText("2x5");
  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .first()
      .getByTestId("bent-over-row")
      .getByTestId("history-entry-weight")
      .first()
  ).toHaveText("95");
  await page
    .getByTestId("preview-day-workout-a")
    .first()
    .getByTestId("bent-over-row")
    .getByTestId("program-preview-edit-exercise")
    .click();
  await expect(page.getByTestId("menu-item-value-successes")).toHaveValue("0");
  await expect(page.getByTestId("menu-item-value-failures")).toHaveValue("0");
  await page.getByTestId("modal-edit-mode-save-statvars").click();
  await page.getByTestId("menu-item-value-enable-playground").click();

  await PlaywrightUtils.clickAll(
    page.getByTestId("preview-day-workout-a").getByTestId("bent-over-row").getByTestId("set-nonstarted")
  );
  await page
    .getByTestId("preview-day-workout-a")
    .getByTestId("bent-over-row")
    .getByTestId("set-amrap-nonstarted")
    .first()
    .click();
  await page.getByTestId("modal-amrap-input").and(page.locator(":visible")).clear();
  await page.getByTestId("modal-amrap-input").and(page.locator(":visible")).type("5");
  await page.getByTestId("modal-amrap-submit").and(page.locator(":visible")).click();
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("bent-over-row").getByTestId("variable-changes-key-weights")
  ).toHaveText("weights: += 2.5lb");

  await page
    .getByTestId("preview-day-workout-a")
    .getByTestId("bench-press")
    .getByTestId("program-preview-complete-exercise")
    .first()
    .click();
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("bench-press").getByTestId("set-completed")
  ).toHaveCount(2);
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("bench-press").getByTestId("set-amrap-completed")
  ).toHaveCount(1);

  await page.getByTestId("preview-day-workout-a").first().getByTestId("finish-day-details-playground").click();

  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .first()
      .getByTestId("bent-over-row")
      .getByTestId("weight-value")
      .filter({ hasText: "97.5" })
  ).toHaveCount(3);
  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .first()
      .getByTestId("bench-press")
      .getByTestId("weight-value")
      .filter({ hasText: "47.5" })
  ).toHaveCount(3);
  await expect(
    page.getByTestId("preview-day-workout-a").first().getByTestId("bench-press").getByTestId("set-nonstarted")
  ).toHaveCount(3);
  await expect(
    page.getByTestId("preview-day-workout-a").first().getByTestId("bench-press").getByTestId("set-amrap-nonstarted")
  ).toHaveCount(1);
});
