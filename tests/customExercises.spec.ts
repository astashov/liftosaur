import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("CRUD custom exercises", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  page.on("dialog", (dialog) => dialog.accept());

  await page.getByTestId("create-program").click({ force: true });
  PlaywrightUtils.disableSubscriptions(page);

  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("add-exercise").click();
  await page.getByTestId("custom-exercise-create").click();
  await page.getByTestId("custom-exercise-name-input").fill("My Exercise");
  await page.getByTestId("custom-exercise-create").click();

  await page.getByTestId("custom-exercise-edit-my-exercise").click();
  await page.getByTestId("custom-exercise-name-input").fill("My Exercise 2");
  await page.getByTestId("custom-exercise-create").click();

  await page.getByTestId("menu-item-my-exercise-2").click();
  await page.getByTestId("exercise-picker-confirm").click();

  await page.getByTestId("edit-exercise").click();
  await page.getByTestId("edit-exercise-warmups-customize").click();

  await PlaywrightUtils.swipeLeft(page, page.getByTestId("warmup-set-x").nth(0));
  await page.getByTestId("delete-warmup-set").nth(0).click();

  await PlaywrightUtils.swipeLeft(page, page.getByTestId("warmup-set-x").nth(0));
  await page.getByTestId("delete-warmup-set").nth(0).click();

  await PlaywrightUtils.swipeLeft(page, page.getByTestId("warmup-set-x").nth(0));
  await page.getByTestId("delete-warmup-set").nth(0).click();

  await page.getByTestId("save-program-exercise").click();
  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("complete-set").click();
  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-program").click({ force: true });
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("edit-exercise").click();
  await page.getByTestId("add-set").click();
  await page.getByTestId("edit-program-exercise-change").click();
  await page.getByTestId("custom-exercise-edit-my-exercise-2").click();
  await page.getByTestId("custom-exercise-delete").click();

  await page.getByTestId("custom-exercise-create").click();
  await page.getByTestId("custom-exercise-name-input").fill("Blah One");
  await page.getByTestId("custom-exercise-create").click();

  await page.getByTestId("menu-item-blah-one").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("save-program-exercise").click();
  await page.getByTestId("save-program").click();
  await page.getByTestId("footer-home").click();

  await expect(page.getByTestId("history-entry-exercise-name").nth(1)).toHaveText("My Exercise 2 🏆");
  await page.getByTestId("footer-workout").click();
  await expect(page.getByTestId("bottom-sheet").getByTestId("history-entry-exercise-name").nth(0)).toHaveText(
    "Blah One"
  );
  await page.getByTestId("bottom-sheet-close").and(page.locator(":visible")).click();
  await page.waitForTimeout(200);

  await page.getByTestId("footer-program").click({ force: true });
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("edit-exercise").click();
  await page.getByTestId("edit-program-exercise-change").click();
  await page.getByTestId("custom-exercise-create").click();

  await page.getByTestId("custom-exercise-name-input").fill("My Exercise 2");
  await page.getByTestId("custom-exercise-create").click();

  await page.getByTestId("custom-exercise-edit-my-exercise-2").click();
  await page.getByTestId("custom-exercise-name-input").fill("My Exercise 3");
  await page.getByTestId("select-target-muscles").click();
  await page.getByTestId("select-muscle-adductor-magnus").click();
  await page.getByTestId("select-muscle-deltoid-posterior").click();
  await page.getByTestId("done-selecting-muscles").click();
  await page.getByTestId("select-synergist-muscles").click();
  await page.getByTestId("select-muscle-obliques").click();
  await page.getByTestId("done-selecting-muscles").click();
  await page.getByTestId("custom-exercise-create").click();

  await page.getByTestId("menu-item-my-exercise-3").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("save-program-exercise").click();
  await page.getByTestId("save-program").click();
  await page.getByTestId("footer-home").click();

  await expect(page.getByTestId("history-entry-exercise-name").nth(1)).toHaveText("My Exercise 3 🏆");

  await page.getByTestId("footer-workout").click();
  await expect(page.getByTestId("bottom-sheet").getByTestId("history-entry-exercise-name").nth(0)).toHaveText(
    "My Exercise 3"
  );
  await page.getByTestId("bottom-sheet-close").and(page.locator(":visible")).click();
  await page.waitForTimeout(200);

  await page.getByTestId("footer-program").click({ force: true });
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-week-muscles").click();
  await expect(page.getByTestId("modal").and(page.locator(":visible"))).toContainText("Shoulders: 2");
  await expect(page.getByTestId("modal").and(page.locator(":visible"))).toContainText("Hamstrings: 2");
  await expect(page.getByTestId("modal").and(page.locator(":visible"))).toContainText("Abs: 1");
  await expect(page.getByTestId("modal").and(page.locator(":visible"))).toContainText("Triceps: 0");
});
