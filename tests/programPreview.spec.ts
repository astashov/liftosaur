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

  // g("modal-amrap-clear").filter(":eq(0)").click();
  // g("day-1").find(s("bent-over-row")).find(s("state-var-weight-input")).clear().type("70");
  // g("day-1")
  //   .find(s("bent-over-row"))
  //   .find(s("set-nonstarted"))
  //   .filter(":eq(0)")
  //   .find(s("weight-value"))
  //   .should("have.text", "70");
  // g("day-1").find(s("bent-over-row")).find(s("program-exercise-show-fx")).click();
  // g("day-1").find(s("bent-over-row")).find(s("history-entry-weight")).filter(":eq(0)").should("have.text", "70");

  // g("program-show-muscles").click();
  // cy.contains("Muscles for program 'Basic Beginner Routine'");
  // g("modal-close").filter(":visible").click();

  // g("program-show-fx").click();
  // g("day-1")
  //   .find(s("bent-over-row"))
  //   .find(s("history-entry-weight"))
  //   .filter(":eq(0)")
  //   .should("have.text", "state.weight");
  // g("day-2")
  //   .find(s("overhead-press"))
  //   .find(s("history-entry-weight"))
  //   .filter(":eq(0)")
  //   .should("have.text", "state.weight");

  // g("menu-item-name-program").click();
  // g("menu-item-program", "scroll-barrel-item-gzclp").click();
  // g("program-name").should("have.text", "GZCLP");
  // g("day-1").find(s("tier-1-squat")).find(s("program-exercise-name")).should("have.text", "1. Tier 1 Squat");

  // g("navbar-back").click();
  // cy.get("button:contains('Basic Beginner Routine')").click();
  // g("clone-program").click();
  // g("footer-program").click();
  // g("navbar-3-dot").click();
  // g("bottom-sheet-preview-program").click();
  // g("program-name").should("have.text", "Basic Beginner Routine");
});
