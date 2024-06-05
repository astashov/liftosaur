import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("custom equipment", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
  await page.getByTestId("create-program").click();
  PlaywrightUtils.disableSubscriptions(page);

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-program-submit").click();

  await page.getByText("Add New Exercise").click();

  await page.getByTestId("menu-item-exercise").click();
  await page.getByTestId("modal-exercise").getByTestId("menu-item-bicep-curl-dumbbell").click();

  await page.getByRole("button", { name: "Save" }).click();
  await page.getByTestId("edit-day").click();
  await page.getByTestId("menu-item-bicep-curl").click();
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();
  await page.getByTestId("set-nonstarted").click();

  await page.getByText("Finish the workout").click();
  await page.getByText("Continue").click();

  await page.getByTestId("footer-settings").click();
  await page.getByTestId("menu-item-available-equipment").click();

  await page.getByRole("button", { name: "Add New Equipment Type" }).click();
  await page.getByTestId("equipment-name-input").clear();
  await page.getByTestId("equipment-name-input").type("Boom");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByTestId("group-header-boom").click();

  await page.getByRole("button", { name: "Add New Plate Weight" }).click();
  await page.getByTestId("plate-input").clear();
  await page.getByTestId("plate-input").type("8");
  await page.getByTestId("add-plate").click();
  await page.getByTestId("menu-item-value-8-lb").clear();
  await page.getByTestId("menu-item-value-8-lb").type("6");

  await page.getByTestId("footer-program").click();
  await page.getByTestId("edit-exercise").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();

  await page.getByTestId("exercise-edit-mode").click();
  await page.getByTestId("modal-edit-mode").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-boom").scrollIntoViewIfNeeded();
  await page.getByTestId("scroll-barrel-item-boom").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("modal-edit-mode-save-statvars").click();

  await expect(page.getByTestId("plates-list")).toHaveText("10/10");

  await page.getByTestId("exercise-name").click();
  await expect(page.getByTestId("menu-item-value-equipment")).toHaveText("Boom");

  await page.getByTestId("footer-settings").click();
  await page.getByTestId("menu-item-available-equipment").click();
  await page.getByTestId("group-header-boom").click();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Boom" }).click();

  await expect(page.getByTestId("group-header-boom")).toHaveCount(0);

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();

  await page.getByTestId("exercise-edit-mode").click();
  await expect(page.getByTestId("menu-item-value-equipment")).toHaveText("");
});
