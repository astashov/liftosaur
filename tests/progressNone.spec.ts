import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("disable progress on marked days", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("editor-v2-full-program").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1
Squat / 1x5 115lb / warmup: none

## Day 2
Squat / 1x5 115lb / progress: lp(5lb) / warmup: none

# Week 2
## Day 1
Squat / 1x5 115lb / warmup: none

## Day 2
Squat / 1x5 115lb / progress: none / warmup: none

# Week 3
## Day 1
Squat / 1x5 115lb / progress: none / warmup: none

## Day 2
Squat / 1x5 115lb / warmup: none`
  );

  await page.getByTestId("editor-v2-save-full").click();
  await page.getByTestId("editor-save-v2-top").click();

  await expect(page.getByTestId("history-record").first().getByTestId("history-entry-weight").first()).toHaveText(
    "115lb"
  );

  for (const weight of [120, 125, 130, 130, 130, 135]) {
    await page.getByTestId("footer-workout").click();
    await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();
    await PlaywrightUtils.finishExercise(page, "squat", [1]);
    await page.getByTestId("finish-workout").click();
    await page.getByTestId("finish-day-continue").click();
    await page.getByTestId("footer-workout").click();
    await expect(
      page.getByTestId("bottom-sheet").getByTestId("history-record").first().getByTestId("history-entry-weight").first()
    ).toHaveText(`${weight}lb`);
    await page.getByTestId("bottom-sheet-close").and(page.locator(":visible")).click();
  }
});
