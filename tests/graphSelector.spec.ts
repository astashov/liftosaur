import { expect, test } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("Graphs", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await page.click("button:has-text('Basic Beginner Routine')");
  await PlaywrightUtils.disableSubscriptions(page);
  await page.getByTestId("clone-program").click();
  await page.getByTestId("footer-graphs").click();

  await expect(page.getByTestId("screen")).toContainText("Select graphs you want to display");
  await page.getByTestId("graphs-modify").click();
  await expect(page.getByTestId("modal-graphs")).toContainText("You haven't tracked any workouts or measurements yet.");
  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await page.getByTestId("footer-home").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  // Complete workout
  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();
  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Bench Press') [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();
  await PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Squat') [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();
  await page.click("text=Finish the workout");
  await page.click("text=Continue");

  await page.getByTestId("footer-graphs").click();

  await expect(page.getByTestId("screen")).toContainText("Select graphs you want to display");

  await page.getByTestId("graphs-modify").click();

  await page.getByTestId("item-graph-bent-over-row").click();
  await page.getByTestId("item-graph-bench-press").click();

  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await expect(page.getByTestId("graph")).toHaveCount(2);
  await expect(page.getByTestId("graph").nth(0).locator("css=.u-title")).toContainText("Bent Over Row");
  await expect(page.getByTestId("graph").nth(1).locator("css=.u-title")).toContainText("Bench Press");

  await page.getByTestId("graphs-modify").click();

  await page.getByTestId("item-graph-exercise-bentoverrow_barbell").getByTestId("remove-graph").click();
  await page.getByTestId("item-graph-squat").click();

  await page.getByTestId("modal-close").and(page.locator(":visible")).click();

  await expect(page.getByTestId("graph")).toHaveCount(2);
  await expect(page.getByTestId("graph").nth(0).locator("css=.u-title")).toContainText("Bench Press");
  await expect(page.getByTestId("graph").nth(1).locator("css=.u-title")).toContainText("Squat");
});
