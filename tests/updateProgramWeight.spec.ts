import { test, expect, Page } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_createProgramWithCode,
  PlaywrightUtils_disableTours,
  PlaywrightUtils_typeKeyboard,
} from "./playwrightUtils";
import type { IStorage } from "../src/types";

const program = `# Week 1
## Day 1
Squat / 1x5 200lb, 2x5 180lb / warmup: none / progress: lp(5lb)

# Week 2
## Day 1
Squat / 1x5 210lb, 2x5 190lb / warmup: none`;

async function programText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const storage = (window as unknown as { state: { storage: IStorage } }).state.storage;
    const current = storage.programs.find((p) => p.id === storage.currentProgramId);
    return (current?.planner?.weeks ?? []).map((w) => w.days.map((d) => d.exerciseText).join("\n")).join("\n");
  });
}

test("Update program weights from a set lifted at a different weight", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await expect(page.getByTestId("program-select-create")).toBeVisible();
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgramWithCode(page, "My Program", program);
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();

  const entry = page.getByTestId("entry-squat");
  await PlaywrightUtils_typeKeyboard(page, entry.getByTestId("input-set-weight-field").first(), "170");
  await entry.getByTestId("complete-set").first().click();

  const line = entry.getByTestId("weight-deviation-update-program");
  await expect(line).toContainText("170 lb instead of 200 lb");
  await expect(line).toContainText("Update program…");
  await line.click();

  const fields = page.locator("[data-testid^=input-update-program-weight-]");
  await expect(fields).toHaveCount(2);
  await expect(page.getByText("Set 1 × 5 reps")).toBeVisible();
  await expect(page.getByText("Set 2-3 × 5 reps")).toBeVisible();
  await PlaywrightUtils_typeKeyboard(page, fields.nth(1), "150");
  await page.getByTestId("update-program-weight-apply").click();

  await expect(line).toHaveCount(0);
  const weights = entry.getByTestId("input-set-weight-field");
  await expect(weights.nth(0)).toContainText("170");
  await expect(weights.nth(1)).toContainText("150");
  await expect(weights.nth(2)).toContainText("150");

  const text = await programText(page);
  expect(text).toContain("Squat / 1x5 170lb, 2x5 150lb");
  expect(text).toContain("Squat / 1x5 177.5lb, 2x5 160lb");
});
