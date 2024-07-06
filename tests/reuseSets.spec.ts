import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("reuses sets", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
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

Squat, Barbell / 1x1 / 100% / progress: lp(5lb)
Bench Press, Barbell / 1x1 / 100%
Biceps Curl, Dumbbell / 1x1 / 100%

## Day 2
a: Squat, Barbell / 1x2 / 95%
Triceps Extension, Cable / 1x2 95%
Leg Press, LeverageMachine / 1x2 / 95%
Squat, Barbell / 1x2 / 95%
Bench Press, Barbell / 1x2 / 95%
Hack Squat, Barbell / ...Squat, Barbell[_:1]

## Day 3
Deadlift, Barbell / ...Leg Press
Front Raise / ...Bench Press, Barbell[2]


# Week 2
## Day 1
Squat, Barbell / ...Bench Press, Barbell
Bench Press, Barbell / 2x1 / 100%
Biceps Curl, Dumbbell / ...Triceps Extension[1:2]

## Day 2
a: Squat, Barbell / ...Squat, Barbell[1:2]
Triceps Extension, Cable / ...Bench Press, Barbell[1]`
  );

  await page.getByTestId("editor-v2-save-full").click();

  await page.getByTestId("program-preview").click();
  expect(
    page.getByTestId("preview-day-day-2").getByTestId("hack-squat").getByTestId("history-entry-sets-next")
  ).toHaveCount(1);
  expect(
    page.getByTestId("preview-day-day-2").getByTestId("hack-squat").getByTestId("history-entry-sets-next").first()
  ).toHaveText("1");
  await page.getByTestId("tab-week-2").nth(1).click();
  expect(page.getByTestId("preview-day-day-2").getByTestId("squat").getByTestId("history-entry-sets-next")).toHaveCount(
    1
  );
  expect(
    page.getByTestId("preview-day-day-2").getByTestId("squat").getByTestId("history-entry-sets-next").first()
  ).toHaveText("2");
  await page.getByTestId("modal-close-program-preview").click();

  await page.getByTestId("editor-save-v2-top").click();
  await page.getByTestId("menu-item-my-program").click();
  await page.getByTestId("start-workout").click();

  await page.getByTestId("workout-set").nth(0).getByTestId("set-nonstarted").click();

  await page.getByTestId("finish-workout").click();
  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("footer-program").click();
  await page.getByTestId("editor-v2-full-program").click();

  expect(page.getByTestId("planner-editor").first()).toContainText("Squat, Barbell / 1x1 / 140lb");
  expect(page.getByTestId("planner-editor").nth(1)).toContainText("Squat, Barbell / 1x2 / 133.25lb");
  expect(page.getByTestId("planner-editor").nth(1)).toContainText("Hack Squat, Barbell / ...Squat, Barbell[1] / 100%");
  expect(page.getByTestId("planner-editor").nth(2)).toContainText("Deadlift, Barbell / ...Leg Press");
  expect(page.getByTestId("planner-editor").nth(2)).toContainText("Front Raise / ...Bench Press, Barbell[2]");

  await page.getByTestId("tab-week-2").click();
  expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "Triceps Extension, Cable / ...Bench Press, Barbell[1]"
  );
  expect(page.getByTestId("planner-editor").and(page.locator(":visible")).nth(1)).toContainText(
    "a: Squat, Barbell / ...Squat, Barbell[1:2] / 95%"
  );
});
