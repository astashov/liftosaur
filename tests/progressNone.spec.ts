import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("disable progress on marked days", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
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
  await page.getByTestId("menu-item-my-program").click();

  await expect(page.getByTestId("history-record").first().getByTestId("history-entry-weight").first()).toHaveText(
    "115"
  );

  for (const weight of [120, 125, 130, 130, 130, 135]) {
    await page.getByTestId("start-workout").click();
    await page.getByTestId("set-nonstarted").click();
    await page.getByRole("button", { name: "Finish the workout" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByTestId("history-record").first().getByTestId("history-entry-weight").first()).toHaveText(
      `${weight}`
    );
  }
});
