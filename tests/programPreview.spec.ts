import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("Program Preview", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
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
  ).toHaveText("2 × 5 × 95lb");
  await page
    .getByTestId("preview-day-workout-a")
    .first()
    .getByTestId("bent-over-row")
    .getByTestId("program-preview-edit-exercise")
    .click();
  await expect(page.getByTestId("menu-item-value-successes")).toHaveValue("1");
  await expect(page.getByTestId("menu-item-value-failures")).toHaveValue("1");
  await page.getByTestId("modal-edit-mode-save-statvars").click();
  await page.getByTestId("menu-item-value-enable-playground").click();

  await PlaywrightUtils.finishExercise(
    page,
    "bent-over-row",
    [1, 1, { amrap: { reps: 5 } }],
    page.getByTestId("preview-day-workout-a").first()
  );
  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .getByTestId("entry-bent-over-row")
      .getByTestId("variable-changes-key-weights")
  ).toHaveText("weights: += 2.5lb");

  await page.getByTestId("preview-day-workout-a").getByTestId(`workout-tab-bench-press`).nth(0).click();
  await page
    .getByTestId("preview-day-workout-a")
    .getByTestId("entry-bench-press")
    .getByTestId("program-preview-complete-exercise")
    .first()
    .click();
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("entry-bench-press").getByTestId("set-completed")
  ).toHaveCount(2);
  await expect(
    page.getByTestId("preview-day-workout-a").getByTestId("entry-bench-press").getByTestId("set-amrap-completed")
  ).toHaveCount(1);

  await page.getByTestId("preview-day-workout-a").first().getByTestId("finish-day-details-playground").click();

  await page.getByTestId("preview-day-workout-a").getByTestId(`workout-tab-bent-over-row`).nth(0).click();
  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .first()
      .getByTestId("entry-bent-over-row")
      .getByTestId("input-set-weight-field")
      .filter({ hasText: "100" })
  ).toHaveCount(3);
  await page.getByTestId("preview-day-workout-a").getByTestId(`workout-tab-bench-press`).nth(0).click();
  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .first()
      .getByTestId("entry-bench-press")
      .getByTestId("input-set-weight-field")
      .filter({ hasText: "50" })
  ).toHaveCount(3);
  await expect(
    page.getByTestId("preview-day-workout-a").first().getByTestId("entry-bench-press").getByTestId("set-nonstarted")
  ).toHaveCount(3);
  await expect(
    page
      .getByTestId("preview-day-workout-a")
      .first()
      .getByTestId("entry-bench-press")
      .getByTestId("set-amrap-nonstarted")
  ).toHaveCount(1);
});
