import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("CRUD custom exercises", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&legacy=1");
  page.on("dialog", (dialog) => dialog.accept());

  await page.getByTestId("create-program").click({ force: true });
  PlaywrightUtils.disableSubscriptions(page);

  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-program-submit").click();

  await page.getByTestId("edit-day").click();
  await page.locator("text=Create New Exercise").click();

  await page.getByTestId("menu-item-exercise").click({ force: true });
  await page.getByTestId("custom-exercise-create").click({ force: true });
  await page.getByTestId("custom-exercise-name-input").fill("My Exercise");
  await page.getByTestId("custom-exercise-create").click({ force: true });

  await page.getByTestId("custom-exercise-edit-my-exercise").click({ force: true });
  await page.getByTestId("custom-exercise-name-input").fill("My Exercise 2");
  await page.getByTestId("custom-exercise-create").click({ force: true });

  await page.getByTestId("menu-item-my-exercise-2").click({ force: true });
  await page.getByTestId("save-exercise").click();
  await page.waitForTimeout(100);
  await page.getByTestId("navbar-back").click();
  await page.getByTestId("navbar-back").click();
  await page.getByTestId("menu-item-my-program").click({ force: true });

  await page.getByTestId("start-workout").click({ force: true });
  await page.getByTestId("set-nonstarted").click({ force: true });
  await page.locator("text=Finish the workout").click();
  await page.locator("text=Continue").click();

  await page.getByTestId("footer-program").click({ force: true });
  await page.getByTestId("edit-exercise").click();
  await page.getByTestId("menu-item-exercise").click({ force: true });
  await page.getByTestId("custom-exercise-delete-my-exercise-2").click({ force: true });

  await page.getByTestId("custom-exercise-create").click({ force: true });
  await page.getByTestId("custom-exercise-name-input").fill("Blah One");
  await page.getByTestId("custom-exercise-create").click({ force: true });

  await page.getByTestId("menu-item-blah-one").click({ force: true });
  await page.getByTestId("save-exercise").click();
  await page.waitForTimeout(100);
  await page.getByTestId("navbar-back").click();

  await expect(page.getByTestId("history-entry-exercise-name").nth(0)).toHaveText("Blah One");
  await expect(page.getByTestId("history-entry-exercise-name").nth(1)).toHaveText("My Exercise 2");

  await page.getByTestId("footer-program").click({ force: true });
  await page.getByTestId("edit-exercise").click();
  await page.getByTestId("menu-item-exercise").click({ force: true });
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
  await page.getByTestId("save-exercise").click();
  await page.waitForTimeout(100);
  await page.getByTestId("navbar-back").click();

  await expect(page.getByTestId("history-entry-exercise-name").nth(0)).toHaveText("My Exercise 3");
  await expect(page.getByTestId("history-entry-exercise-name").nth(1)).toHaveText("My Exercise 3");

  await page.getByTestId("footer-program").click({ force: true });
  await page.getByTestId("navbar-3-dot").click({ force: true });
  await page.getByTestId("bottom-sheet-muscles-program").click({ force: true });
  await expect(page.getByTestId("target-muscles-list")).toContainText("Hamstrings");
  await expect(page.getByTestId("target-muscles-list")).toContainText("Shoulders");
  await expect(page.getByTestId("synergist-muscles-list")).toContainText("Abs");
});
