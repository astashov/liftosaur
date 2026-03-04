import { startpage, PlaywrightUtils_disableSubscriptions, PlaywrightUtils_typeKeyboard } from "./playwrightUtils";
import { test, expect } from "@playwright/test";

test("Copy Workout as Text", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());

  await page.addInitScript(() => {
    const origExecCommand = document.execCommand.bind(document);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document.execCommand = (command: string, ...args: any[]) => {
      if (command === "copy") {
        const active = document.activeElement as HTMLTextAreaElement | null;
        if (active && active.value) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__clipboardText = active.value;
        }
      }
      return origExecCommand(command, ...args);
    };
  });

  await page.goto(startpage + "?skipintro=1&nosync=true");
  await page.getByRole("button", { name: "Basic Beginner Routine" }).click();
  PlaywrightUtils_disableSubscriptions(page);
  await page.getByTestId("clone-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-empty-workout").click();
  await page.getByTestId("exercise-filter-by-name").fill("Bench Press");
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("exercise-picker-confirm").click();

  await page.getByTestId("add-workout-set").click();
  await PlaywrightUtils_typeKeyboard(page, page.getByTestId("input-set-reps-field").nth(0), "5");
  await PlaywrightUtils_typeKeyboard(page, page.getByTestId("input-set-weight-field").nth(0), "100");
  await page.getByTestId("complete-set").nth(0).click();

  await page.getByTestId("finish-workout").click();

  await page.getByTestId("finishday-share-text").click();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clipboardText = await page.evaluate(() => (window as any).__clipboardText);
  expect(clipboardText).toBeTruthy();
  expect(clipboardText).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  expect(clipboardText).toContain("/ exercises: {");
  expect(clipboardText).toContain("Bench Press / 1x5 100lb");
  expect(clipboardText).toMatch(/\}$/);

  await page.getByTestId("finish-day-continue").click();

  await page.getByTestId("history-record").nth(1).click();
  await page.locator(".nm-past-workout-share").click();
  await page.getByTestId("bottom-sheet-share-to-text").click();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clipboardText2 = await page.evaluate(() => (window as any).__clipboardText);
  expect(clipboardText2).toBeTruthy();
  expect(clipboardText2).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  expect(clipboardText2).toContain("/ exercises: {");
  expect(clipboardText2).toContain("Bench Press / 1x5 100lb");
  expect(clipboardText2).toMatch(/\}$/);
});
