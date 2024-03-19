import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("replaces exercises", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-experimental-program-submit").click();

  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils.clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1
Squat / 3x8
Bench Press[1-2] / 3x8

## Day 2
Bicep Curl / 1x5
t1: Bench Press / 3x5

# Week 2
## Day 1
Squat / 3x8
t1: Squat / 3x5

## Day 2
Bicep Curl / 1x5`
  );

  await page.getByTestId("editor-v2-save-full").click();
  await page.getByTestId("editor-save-v2-top").click();
  await page.getByTestId("menu-item-my-program").click();

  await page.getByTestId("footer-program").click();

  await page.getByTestId("planner-editor").first().locator(".cm-content").click();
  await page.getByTestId("editor-v2-exercise-stats").click();
  await page.getByTestId("planner-swap-exercise").click();

  await page.getByTestId("modal-exercise").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("modal-exercise").getByTestId("scroll-barrel-item-dumbbell").click();
  await page.getByTestId("modal-exercise").getByTestId("menu-item-bent-over-row").click();

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText("Squat / 3x8");
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    "Bent Over Row, Dumbbell[1-2] / 3x8"
  );

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "Bicep Curl / 1x5"
  );
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "t1: Bench Press / 3x5"
  );

  await page.getByTestId("tab-week-2").click();

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    `Squat / 3x8t1: Squat / 3x5`
  );
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "Bicep Curl / 1x5"
  );

  await page.getByTestId("editor-save-v2-top").click();
  await page.getByTestId("start-workout").click();

  await page.getByTestId("exercise-swap").first().click();

  await page.getByTestId("modal-exercise").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("modal-exercise").getByTestId("scroll-barrel-item-dumbbell").click();
  await page.getByTestId("modal-exercise").getByTestId("menu-item-squat").click();
  await expect(page.getByTestId("entry-squat").getByTestId("exercise-equipment")).toHaveText("Dumbbell");

  await page.getByTestId("footer-program").click();
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText("Squat / 3x8");

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();
  await page.getByTestId("exercise-swap").first().click();

  await page.getByTestId("modal-exercise").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("modal-exercise").getByTestId("scroll-barrel-item-dumbbell").click();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByTestId("modal-exercise").getByTestId("menu-item-hack-squat").click();
  await expect(page.getByTestId("entry-hack-squat").getByTestId("exercise-equipment")).toHaveText("Dumbbell");

  await page.getByTestId("footer-program").click();
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    "Hack Squat, Dumbbell / 3x8"
  );

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    "Hack Squat, Dumbbell / 3x8Bent Over Row, Dumbbell[1-2] / 3x8"
  );

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "Bicep Curl / 1x5t1: Bench Press / 3x5"
  );

  await page.getByTestId("tab-week-2").click();

  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).first()).toContainText(
    `Hack Squat, Dumbbell / 3x8t1: Squat / 3x5`
  );
  await expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "Bicep Curl / 1x5"
  );
});
