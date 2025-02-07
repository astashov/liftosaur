import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("rep ranges", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&legacy=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-program-submit").click();
  await page.getByTestId("edit-day").click();

  await page.getByText("Create New Exercise").click();
  await page.getByTestId("tab-advanced").click();
  await page.getByTestId("menu-item-name-enable-rep-ranges").click();

  await page.getByTestId("add-new-set").click();
  await PlaywrightUtils.clearCodeMirror(page, "oneline-editor-minreps", 1);
  await PlaywrightUtils.typeCodeMirror(page, "oneline-editor-minreps", "3", 1);

  await page.getByTestId("edit-warmup-set-delete").first().click();
  await page.getByTestId("edit-warmup-set-delete").first().click();
  await page.getByTestId("edit-warmup-set-delete").first().click();

  await PlaywrightUtils.clearCodeMirror(page, "multiline-editor-finish-day");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "multiline-editor-finish-day",
    `if (completedReps >= reps) {
  state.weight += 10lb
} else if (completedReps >= minReps) {
  state.weight += 5lb
} else {
  state.weight -= 15lb
}`
  );
  await page.getByTestId("save-exercise").click();

  await page.getByTestId("footer-workout").click();
  await expect(page.getByTestId("history-entry-sets-next").nth(0)).toHaveText("5 × 135lb");
  await expect(page.getByTestId("history-entry-sets-next").nth(1)).toHaveText("3-5 × 135lb");

  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await expect(page.getByTestId("set-nonstarted").nth(0).getByTestId("reps-value")).toHaveText("5");
  await expect(page.getByTestId("set-nonstarted").nth(1).getByTestId("reps-value")).toHaveText("3-5");

  await page.getByTestId("set-nonstarted").nth(0).click();
  await page.getByTestId("set-nonstarted").nth(0).click();

  await expect(page.getByTestId("state-changes-value-weight")).toHaveText("135 lb -> 145 lb");

  await expect(page.getByTestId("set-completed").nth(0).getByTestId("reps-value")).toHaveText("5");
  await expect(page.getByTestId("set-completed").nth(1).getByTestId("reps-value")).toHaveText("5");

  await page.getByTestId("set-completed").nth(1).click();
  await expect(page.getByTestId("set-completed")).toHaveCount(1);
  await expect(page.getByTestId("set-in-range")).toHaveCount(1);

  await expect(page.getByTestId("state-changes-value-weight")).toHaveText("135 lb -> 140 lb");

  await page.getByTestId("set-in-range").nth(0).click();
  await expect(page.getByTestId("set-completed")).toHaveCount(1);
  await expect(page.getByTestId("set-in-range")).toHaveCount(1);
  await expect(page.getByTestId("set-in-range").nth(0).getByTestId("reps-value")).toHaveText("3");

  await expect(page.getByTestId("exercise-in-range-completed")).toHaveCount(1);

  await page.getByTestId("set-in-range").nth(0).click();
  await expect(page.getByTestId("set-completed")).toHaveCount(1);
  await expect(page.getByTestId("set-in-range")).toHaveCount(0);
  await expect(page.getByTestId("set-incompleted")).toHaveCount(1);
  await expect(page.getByTestId("state-changes-value-weight")).toHaveText("135 lb -> 120 lb");

  await page.getByTestId("set-incompleted").nth(0).click();
  await page.getByTestId("set-incompleted").nth(0).click();
  await page.getByTestId("set-incompleted").nth(0).click();
  await page.getByTestId("set-nonstarted").nth(0).click();
  await page.getByTestId("set-completed").nth(1).click();

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await expect(page.getByTestId("history-entry-sets-completed")).toHaveCount(1);
  await expect(page.getByTestId("history-entry-sets-completed")).toHaveText("5 × 135lb");

  await expect(page.getByTestId("history-entry-sets-in-range")).toHaveCount(1);
  await expect(page.getByTestId("history-entry-sets-in-range")).toHaveText("4 × 135lb");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await expect(page.getByTestId("history-entry-sets-completed")).toHaveCount(1);
  await expect(page.getByTestId("history-entry-sets-completed")).toHaveText("5 × 135lb");

  await expect(page.getByTestId("history-entry-sets-in-range")).toHaveCount(1);
  await expect(page.getByTestId("history-entry-sets-in-range")).toHaveText("4 × 135lb");

  await page.getByTestId("set-nonstarted").nth(0).click();

  await expect(page.getByTestId("next-set")).toHaveText("Next Set: 3-5 reps x 140lb");
});
