import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("rpe", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").fill("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("editor-v2-full-program").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1
Squat / 1x5 135lb @8+, 1x5 135lb @8, 1x5 135lb, 1x5 135lb @7+ / progress: custom(boom: 0) {~
  state.boom = completedRPE[3] + completedRPE[4] + RPE[1] 
~}`
  );

  await page.getByTestId("editor-v2-save-full").click();
  await page.getByTestId("editor-save-v2-top").click();

  await page.getByTestId("footer-workout").click();

  await expect(page.getByTestId("history-entry-rpe")).toHaveCount(2);
  await expect(page.getByTestId("history-entry-rpe").nth(0)).toHaveText("@8");
  await expect(page.getByTestId("history-entry-rpe").nth(1)).toHaveText("@7");

  await expect(page.getByTestId("history-entry-sets-next")).toHaveCount(3);
  await expect(page.getByTestId("history-entry-sets-next").first()).toHaveText("2 × 5 × 135lb @8");
  await expect(page.getByTestId("history-entry-sets-next").nth(1)).toHaveText("5 × 135lb");
  await expect(page.getByTestId("history-entry-sets-next").nth(2)).toHaveText("5 × 135lb @7");

  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  await expect(page.getByTestId("workout-set-target").nth(3)).toHaveText("5 × 135lb @8+");
  await expect(page.getByTestId("workout-set-target").nth(4)).toHaveText("5 × 135lb @8");
  await expect(page.getByTestId("workout-set-target").nth(5)).toHaveText("5 × 135lb");
  await expect(page.getByTestId("workout-set-target").nth(6)).toHaveText("5 × 135lb @7+");

  await page.getByTestId("complete-set").nth(3).click();
  await page.getByTestId("modal-rpe-input").type("7.5");
  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("rpe-value")).toHaveCount(1);
  await expect(page.getByTestId("rpe-value")).toHaveText("@7.5");

  await page.getByTestId("complete-set").nth(4).click();
  await expect(page.getByTestId("rpe-value")).toHaveCount(1);

  await page.getByTestId("complete-set").nth(5).click();
  await page.getByTestId("complete-set").nth(6).click();
  await page.getByTestId("modal-rpe-input").type("11");
  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("rpe-value")).toHaveCount(2);
  await expect(page.getByTestId("rpe-value").nth(0)).toHaveText("@7.5");
  await expect(page.getByTestId("rpe-value").nth(1)).toHaveText("@10");

  await expect(page.getByTestId("state-changes-value-boom")).toHaveText("0 -> 18");

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await expect(page.getByTestId("history-entry-sets-completed")).toHaveCount(4);
  await expect(page.getByTestId("history-entry-sets-completed").nth(0)).toHaveText("5 × 135lb @7.5");
  await expect(page.getByTestId("history-entry-sets-completed").nth(1)).toHaveText("5 × 135lb @8");
  await expect(page.getByTestId("history-entry-sets-completed").nth(2)).toHaveText("5 × 135lb");
  await expect(page.getByTestId("history-entry-sets-completed").nth(3)).toHaveText("5 × 135lb @10");

  await page.getByTestId("footer-workout").click();
  await expect(page.getByTestId("bottom-sheet").getByTestId("history-entry-rpe").nth(0)).toHaveText("@8");
});
