import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("rm1", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1&legacy=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-program-submit").click();

  await page.getByTestId("edit-day").click();
  await page.getByText("Create New Exercise").click();
  await page.getByTestId("tab-advanced").click();

  await PlaywrightUtils.clearCodeMirror(page, "oneline-editor-weight");
  await PlaywrightUtils.typeCodeMirror(page, "oneline-editor-weight", "rm1");

  await PlaywrightUtils.clearCodeMirror(page, "multiline-editor-finish-day");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "multiline-editor-finish-day",
    `if (completedReps >= reps) {
  rm1 += 5lb
}`
  );

  await page.getByTestId("menu-item-delete-weight").click();

  await page.getByTestId("workout-set").getByTestId("set-nonstarted").click();
  await expect(page.getByTestId("variable-changes-value-1-rm")).toHaveText("135 lb -> 140 lb");
  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();

  await page.getByTestId("workout-set").getByTestId("set-nonstarted").click();
  await expect(page.getByTestId("variable-changes-value-1-rm")).toHaveText("135 lb -> 140 lb");

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await expect(page.getByTestId("history-entry-exercise").nth(0).getByTestId("history-entry-weight")).toHaveText("140");

  await page.getByTestId("history-record").nth(1).click();
  await page.getByTestId("exercise-state-vars-toggle").click();
  await expect(page.getByTestId("workout-state-variable-1-rep-max")).toHaveText("1 Rep Max - 135 lb");

  await page.getByTestId("navbar-back").click();

  await page.getByTestId("start-workout").click();
  await page.getByTestId("workout-set").getByTestId("set-nonstarted").click();
  await expect(page.getByTestId("variable-changes-value-1-rm")).toHaveText("140 lb -> 145 lb");

  await page.getByTestId("workout-set").getByTestId("set-completed").click();
  await page.getByTestId("workout-set").getByTestId("set-incompleted").click();
  await page.getByTestId("workout-set").getByTestId("set-incompleted").click();
  await page.getByTestId("workout-set").getByTestId("set-incompleted").click();
  await page.getByTestId("workout-set").getByTestId("set-incompleted").click();
  await page.getByTestId("workout-set").getByTestId("set-incompleted").click();

  await page.getByTestId("exercise-name").click();
  await expect(page.getByTestId("menu-item-value-1-rep-max")).toHaveValue("140");
  await page.getByTestId("menu-item-value-1-rep-max").clear();
  await page.getByTestId("menu-item-value-1-rep-max").type("150");

  await page.getByTestId("navbar-back").click();

  await expect(page.getByTestId("workout-set").getByTestId("weight-value")).toHaveText("150");
  await page.getByTestId("workout-set").getByTestId("set-nonstarted").click();
  await expect(page.getByTestId("variable-changes-value-1-rm")).toHaveText("150 lb -> 155 lb");

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await expect(page.getByTestId("history-entry-exercise").nth(0).getByTestId("history-entry-weight")).toHaveText("155");
});
