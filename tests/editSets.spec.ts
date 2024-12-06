import { test, expect } from "@playwright/test";
import { startpage } from "./playwrightUtils";

test("edits sets properly", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1");
  await page.locator("button:has-text('Basic Beginner Routine')").click();
  await page.getByTestId("clone-program").click();
  await page.getByTestId("start-workout").click();

  await page.getByTestId("exercise-edit-mode").nth(1).click();
  await page.getByTestId("modal-edit-mode-this-workout").click();
  await page.getByTestId("add-warmup-set").click({ force: true });
  await page.getByTestId("modal-edit-set-reps-input").fill("10");
  await page.getByTestId("modal-edit-set-weight-input").fill("100");
  await page.getByTestId("modal-edit-set-submit").click();

  await page.getByTestId("add-workout-set").click({ force: true });
  await page.getByTestId("modal-edit-set-reps-input").fill("20");
  await page.getByTestId("modal-edit-set-weight-input").fill("200");
  await page.getByTestId("modal-edit-set-submit").click();

  await page.getByTestId("set-edit-mode-remove").nth(2).click({ force: true });
  await page
    .locator("[data-cy^=exercise-]:has-text('Bench Press') [data-cy=set-nonstarted]")
    .nth(1)
    .click({ force: true });
  await page.getByTestId("modal-edit-set-reps-input").fill("8");
  await page.getByTestId("modal-edit-set-weight-input").fill("80");
  await page.getByTestId("modal-edit-set-submit").click();

  await page.getByTestId("done-edit-exercise").click();

  // Checking the result

  const setsSelector = "[data-cy^=exercise-]:has-text('Bench Press') [data-cy^=set-]";
  await expect(page.locator(setsSelector).nth(0).locator("[data-cy=reps-value]")).toHaveText("10");
  await expect(page.locator(setsSelector).nth(0).locator("[data-cy=weight-value]")).toHaveText("100");
  await expect(page.locator(setsSelector).nth(0)).toHaveAttribute("data-cy", "set-nonstarted");

  await expect(page.locator(setsSelector).nth(1).locator("[data-cy=reps-value]")).toHaveText("8");
  await expect(page.locator(setsSelector).nth(1).locator("[data-cy=weight-value]")).toHaveText("80");
  await expect(page.locator(setsSelector).nth(1)).toHaveAttribute("data-cy", "set-nonstarted");

  await expect(page.locator(setsSelector).nth(2).locator("[data-cy=reps-value]")).toHaveText("5+");
  await expect(page.locator(setsSelector).nth(2).locator("[data-cy=weight-value]")).toHaveText("45");
  await expect(page.locator(setsSelector).nth(2)).toHaveAttribute("data-cy", "set-amrap-nonstarted");

  await expect(page.locator(setsSelector).nth(3).locator("[data-cy=reps-value]")).toHaveText("20+");
  await expect(page.locator(setsSelector).nth(3).locator("[data-cy=weight-value]")).toHaveText("200");
  await expect(page.locator(setsSelector).nth(3)).toHaveAttribute("data-cy", "set-amrap-nonstarted");

  // Adding and deleting exercises

  await page.getByTestId("entry-bent-over-row").locator("[data-cy=exercise-edit-mode]").click();
  await page.getByTestId("modal-edit-mode-this-workout").click();
  await page.getByTestId("delete-edit-exercise").click();
  await expect(page.getByTestId("entry-bent-over-row")).not.toBeVisible();

  await page.getByTestId("add-exercise-button").click();
  await page.getByTestId("menu-item-arnold-press-kettlebell").click();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByTestId("add-workout-set").and(page.locator(":visible")).click({ force: true });
  await page.getByTestId("modal-edit-set-reps-input").fill("8");
  await page.getByTestId("modal-edit-set-weight-input").fill("250");
  await page.getByTestId("modal-edit-set-submit").click();

  const arnoldPressSelector = "[data-cy^=exercise-]:has-text('Arnold Press') [data-cy^=set-]";
  await expect(page.locator(arnoldPressSelector).nth(0).locator("[data-cy=reps-value]")).toHaveText("8");
  await expect(page.locator(arnoldPressSelector).nth(0).locator("[data-cy=weight-value]")).toHaveText("250");
  await expect(page.locator(arnoldPressSelector).nth(0)).toHaveAttribute("data-cy", "set-nonstarted");

  await page.getByTestId("entry-squat").locator("[data-cy=exercise-name]").click();
  await page.getByTestId("menu-item-value-1-rep-max").fill("200");
  await page.getByTestId("navbar-back").click();

  await expect(page.getByTestId("entry-bent-over-row")).not.toBeVisible();
  await expect(page.getByTestId("entry-arnold-press")).toBeVisible();
  await expect(page.locator(arnoldPressSelector).nth(0).locator("[data-cy=reps-value]")).toHaveText("8");

  await page.locator("text=Finish the workout").click();
  await page.locator("text=Continue").click();
});
