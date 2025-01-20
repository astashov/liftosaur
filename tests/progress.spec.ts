import { test, expect } from "@playwright/test";
import { PlaywrightUtils, startpage } from "./playwrightUtils";

test("Clones a program and goes through first day", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await page.locator("button:has-text('Basic Beginner Routine')").click();

  PlaywrightUtils.disableSubscriptions(page);

  await page.getByTestId("clone-program").click();
  await page.getByTestId("start-workout").click();

  // Testing set clicks
  const firstset = page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') [data-cy^=set-]").first();
  await expect(firstset.locator("[data-cy=reps-value]")).toHaveText("5");
  await expect(firstset.locator("[data-cy=weight-value]")).toHaveText("95");
  await expect(firstset).toHaveAttribute("data-cy", "set-nonstarted");
  await firstset.click();
  await expect(firstset.locator("[data-cy=reps-value]")).toHaveText("5");
  await expect(firstset).toHaveAttribute("data-cy", "set-completed");
  await firstset.click();
  await expect(firstset.locator("[data-cy=reps-value]")).toHaveText("4");
  await expect(firstset).toHaveAttribute("data-cy", "set-incompleted");
  await firstset.click();
  await firstset.click();
  await firstset.click();
  await expect(firstset.locator("[data-cy=reps-value]")).toHaveText("1");
  await expect(firstset.locator("[data-cy=weight-value]")).toHaveText("95");
  await expect(firstset).toHaveAttribute("data-cy", "set-incompleted");
  await firstset.click();
  await firstset.click();
  await expect(firstset.locator("[data-cy=reps-value]")).toHaveText("5");
  await expect(firstset.locator("[data-cy=weight-value]")).toHaveText("95");
  await expect(firstset).toHaveAttribute("data-cy", "set-nonstarted");
  await firstset.click();
  await expect(firstset.locator("[data-cy=reps-value]")).toHaveText("5");
  await expect(firstset).toHaveAttribute("data-cy", "set-completed");
  await firstset.click();
  await expect(firstset.locator("[data-cy=reps-value]")).toHaveText("4");
  await expect(firstset).toHaveAttribute("data-cy", "set-incompleted");

  await page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') [data-cy^=set-]").nth(1).click();

  // Testing AMRAP set clicks
  const thirdSet = page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') [data-cy^=set-]").nth(2);
  await expect(thirdSet.locator("[data-cy=reps-value]")).toHaveText("5+");
  await expect(thirdSet).toHaveAttribute("data-cy", "set-amrap-nonstarted");
  await thirdSet.click();
  await page.getByTestId("modal-amrap-input").fill("8");
  await page.getByTestId("modal-amrap-submit").click();

  await expect(thirdSet.locator("[data-cy=reps-value]")).toHaveText("8");
  await expect(thirdSet.locator("[data-cy=reps-completed-amrap]")).toHaveText("5+");
  await expect(thirdSet).toHaveAttribute("data-cy", "set-amrap-completed");
  await thirdSet.click();
  await page.getByTestId("modal-amrap-clear").click();
  await expect(thirdSet.locator("[data-cy=reps-value]")).toHaveText("5+");
  await expect(thirdSet).toHaveAttribute("data-cy", "set-amrap-nonstarted");
  await thirdSet.click();
  await page.getByTestId("modal-amrap-input").fill("2");
  await page.getByTestId("modal-amrap-submit").click();
  await expect(thirdSet).toHaveAttribute("data-cy", "set-amrap-incompleted");

  // Testing changing weight
  await page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') [data-cy=exercise-edit-mode]").click();
  await page.getByTestId("modal-edit-mode").getByTestId("menu-item-value-equipment").click();
  await page.getByTestId("scroll-barrel-item-barbell").click();
  await page.waitForTimeout(1000); // wait for the changes to take effect
  await page.getByTestId("modal-edit-mode-save-statvars").click();

  await page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') [data-cy=change-weight]").click();
  await page.getByTestId("modal-weight-input").fill("200");
  await page.getByTestId("modal-weight-submit").click();

  const sets = page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') [data-cy^=set-]");
  await expect(sets.nth(3).locator("[data-cy=weight-value]")).toHaveText("200");
  await expect(sets.nth(4).locator("[data-cy=weight-value]")).toHaveText("200");
  await expect(sets.nth(5).locator("[data-cy=weight-value]")).toHaveText("200");

  // Testing warmup weights
  const setContainers = page.locator("[data-cy^=exercise-]:has-text('Bent Over Row') [data-cy=warmup-set]");
  await expect(setContainers.nth(0).locator("[data-cy=warmup-set-title]")).toHaveText("Warmup");
  await expect(setContainers.nth(0).locator("[data-cy=weight-value]")).toHaveText("60");
  await expect(setContainers.nth(1).locator("[data-cy=warmup-set-title]")).toHaveText("Warmup");
  await expect(setContainers.nth(1).locator("[data-cy=weight-value]")).toHaveText("100");
  await expect(setContainers.nth(2).locator("[data-cy=warmup-set-title]")).toHaveText("Warmup");
  await expect(setContainers.nth(2).locator("[data-cy=weight-value]")).toHaveText("160");

  // Completing the rest exercises
  PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Bench Press') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();

  PlaywrightUtils.clickAll(page.locator("[data-cy^=exercise-]:has-text('Squat') >> [data-cy^=set-]"));
  await page.getByTestId("modal-amrap-input").fill("5");
  await page.getByTestId("modal-amrap-submit").click();

  await page.locator("text=Finish the workout").click();
  await page.locator("text=Continue").click();

  // Checking the history record
  const historyEntry = page.locator("[data-cy=history-entry-exercise]:has-text('Bent Over Row')");
  await expect(historyEntry.locator("[data-cy=history-entry-sets-incompleted]").nth(0)).toHaveText("4 × 200lb");
  await expect(historyEntry.locator("[data-cy=history-entry-sets-completed]").nth(0)).toHaveText("5 × 200lb");
  await expect(historyEntry.locator("[data-cy=history-entry-sets-incompleted]").nth(1)).toHaveText("2 × 200lb");
  await expect(
    page.locator("[data-cy=history-entry-exercise]:has-text('Squat') [data-cy=history-entry-sets-completed]")
  ).toHaveText("3 × 5 × 45lb");
});
