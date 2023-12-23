import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("Program Preview", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
  await page.getByRole("button", { name: "Basic Beginner Routine" }).click();
  await page.getByTestId("preview-program").click();
  await expect(page.getByTestId("program-name")).toHaveText("Basic Beginner Routine");
  await expect(page.getByTestId("program-author")).toHaveText("By /r/fitness");
  await expect(page.getByTestId("preview-day-workout-a").getByTestId("preview-day-name")).toHaveText("Workout A");

  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .getByTestId("bent-over-row")
      .getByTestId("history-entry-sets-next")
      .first()
  ).toHaveText("2x5");
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("bent-over-row").getByTestId("history-entry-weight").first()
  ).toHaveText("95");
  await page
    .getByTestId("preview-day-workout-a")
    .getByTestId("bent-over-row")
    .getByTestId("program-preview-edit-exercise")
    .click();
  await page.getByTestId("menu-item-value-weight").click();
  await page.getByTestId("menu-item-value-weight").clear();
  await page.getByTestId("menu-item-value-weight").type("135");
  await page.getByTestId("modal-edit-mode-save-statvars").click();
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("bent-over-row").getByTestId("history-entry-weight").first()
  ).toHaveText("135");

  await page.getByTestId("menu-item-value-enable-playground").click();

  await PlaywrightUtils.clickAll(
    page.getByTestId("preview-day-workout-a").getByTestId("bent-over-row").getByTestId("set-nonstarted")
  );
  await page
    .getByTestId("preview-day-workout-a")
    .getByTestId("bent-over-row")
    .getByTestId("set-amrap-nonstarted")
    .click();
  await page.getByTestId("modal-amrap-input").and(page.locator(":visible")).clear();
  await page.getByTestId("modal-amrap-input").and(page.locator(":visible")).type("5");
  await page.getByTestId("modal-amrap-submit").and(page.locator(":visible")).click();
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("bent-over-row").getByTestId("state-changes-key-weight")
  ).toHaveText("weight: 95 lb -> 97.5 lb");

  await page
    .getByTestId("preview-day-workout-a")
    .getByTestId("bench-press")
    .getByTestId("program-preview-edit-exercise")
    .click();
  await page.getByTestId("menu-item-value-weight").click();
  await page.getByTestId("menu-item-value-weight").clear();
  await page.getByTestId("menu-item-value-weight").type("155");
  await page.getByTestId("modal-edit-mode-save-statvars").click();
  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .getByTestId("bench-press")
      .getByTestId("weight-value")
      .filter({ hasText: "155" })
  ).toHaveCount(3);

  await page
    .getByTestId("preview-day-workout-a")
    .getByTestId("bench-press")
    .getByTestId("program-preview-complete-exercise")
    .click();
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("bench-press").getByTestId("set-completed")
  ).toHaveCount(2);
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("bench-press").getByTestId("set-amrap-completed")
  ).toHaveCount(1);

  await page.getByTestId("preview-day-workout-a").getByTestId("finish-day-details-playground").click();

  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .getByTestId("bent-over-row")
      .getByTestId("weight-value")
      .filter({ hasText: "97.5" })
  ).toHaveCount(3);
  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .getByTestId("bench-press")
      .getByTestId("weight-value")
      .filter({ hasText: "157.5" })
  ).toHaveCount(3);
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("bench-press").getByTestId("set-nonstarted")
  ).toHaveCount(2);
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("bench-press").getByTestId("set-amrap-nonstarted")
  ).toHaveCount(1);
});
