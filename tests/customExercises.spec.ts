import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("CRUD custom exercises", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  page.on("dialog", (dialog) => dialog.accept());

  await page.getByTestId("create-program").click({ force: true });
  PlaywrightUtils.disableSubscriptions(page);

  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("add-exercise").click();
  await page.getByTestId("custom-exercise-create").click({ force: true });
  await page.getByTestId("custom-exercise-name-input").fill("My Exercise");
  await page.getByTestId("custom-exercise-create").click({ force: true });

  await page.getByTestId("custom-exercise-edit-my-exercise").click({ force: true });
  await page.getByTestId("custom-exercise-name-input").fill("My Exercise 2");
  await page.getByTestId("custom-exercise-create").click({ force: true });

  await page.getByTestId("menu-item-my-exercise-2").click({ force: true });

  await page.getByTestId("edit-exercise").click();
  await page.getByTestId("edit-exercise-warmups-customize").click();
  await page.getByTestId("edit-exercise-warmupset-delete").first().click();
  await page.getByTestId("edit-exercise-warmupset-delete").first().click();
  await page.getByTestId("edit-exercise-warmupset-delete").first().click();

  await page.getByTestId("editor-save-v2-top").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await page.getByTestId("complete-set").click();
  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-program").click({ force: true });
  await page.getByTestId("edit-exercise").click();
  await page.getByTestId("num-input-edit-exercise-numofsets-value").fill("2");
  await page.getByTestId("edit-exercise-change-here").click({ force: true });
  await page.getByTestId("custom-exercise-delete-my-exercise-2").click({ force: true });

  await page.getByTestId("custom-exercise-create").click({ force: true });
  await page.getByTestId("custom-exercise-name-input").fill("Blah One");
  await page.getByTestId("custom-exercise-create").click({ force: true });

  await page.getByTestId("menu-item-blah-one").click({ force: true });
  await page.getByTestId("editor-save-v2-top").click();
  await page.getByTestId("footer-home").click();

  await expect(page.getByTestId("history-entry-exercise-name").nth(1)).toHaveText("My Exercise 2 🏆");
  await page.getByTestId("footer-workout").click();
  await expect(page.getByTestId("bottom-sheet").getByTestId("history-entry-exercise-name").nth(0)).toHaveText(
    "Blah One"
  );
  await page.getByTestId("bottom-sheet-close").and(page.locator(":visible")).click();
  await page.waitForTimeout(200);

  await page.getByTestId("footer-program").click({ force: true });
  await page.getByTestId("edit-exercise").click();
  await page.getByTestId("edit-exercise-change-here").click({ force: true });
  await page.getByTestId("custom-exercise-create").click({ force: true });

  await page.getByTestId("custom-exercise-name-input").fill("My Exercise 2");
  await page.getByTestId("custom-exercise-create").click({ force: true });

  await page.getByTestId("custom-exercise-edit-my-exercise-2").click({ force: true });
  await page.getByTestId("custom-exercise-name-input").fill("My Exercise 3");
  await page.getByTestId("multiselect-target_muscles").fill("Adductor Magnus");
  await page.getByTestId("multiselect-option-adductor-magnus").click({ force: true });
  await page.getByTestId("multiselect-target_muscles").fill("Deltoid Posterior");
  await page.getByTestId("multiselect-option-deltoid-posterior").click({ force: true });
  await page.getByTestId("multiselect-synergist_muscles").fill("Obliques");
  await page.getByTestId("multiselect-option-obliques").click({ force: true });
  await page.getByTestId("custom-exercise-create").click({ force: true });

  await page.getByTestId("menu-item-my-exercise-3").click({ force: true });
  await page.getByTestId("editor-save-v2-top").click();
  await page.getByTestId("footer-home").click();

  await expect(page.getByTestId("history-entry-exercise-name").nth(1)).toHaveText("My Exercise 3 🏆");

  await page.getByTestId("footer-workout").click();
  await expect(page.getByTestId("bottom-sheet").getByTestId("history-entry-exercise-name").nth(0)).toHaveText(
    "My Exercise 3"
  );
  await page.getByTestId("bottom-sheet-close").and(page.locator(":visible")).click();
  await page.waitForTimeout(200);

  await page.getByTestId("footer-program").click({ force: true });
  await page.getByTestId("editor-v2-week-muscles").click();
  await expect(page.getByTestId("modal").and(page.locator(":visible"))).toContainText("Shoulders: 2");
  await expect(page.getByTestId("modal").and(page.locator(":visible"))).toContainText("Hamstrings: 2");
  await expect(page.getByTestId("modal").and(page.locator(":visible"))).toContainText("Abs: 1");
  await expect(page.getByTestId("modal").and(page.locator(":visible"))).toContainText("Triceps: 0");
});
