import { test, expect, Page } from "@playwright/test";
import { startpage, PlaywrightUtils_selectBuiltin, PlaywrightUtils_disableTours } from "./playwrightUtils";

interface IFocused {
  testId: string | null;
  entry: string | null;
}

const STOP_IDS = ["input-set-reps-field", "input-set-weight-field", "complete-set", "start-set-timer"];

async function focused(page: Page): Promise<IFocused> {
  return page.evaluate(() => {
    const el = document.activeElement;
    const entry = el?.closest("[data-testid^='entry-']");
    return {
      testId: el?.getAttribute("data-testid") ?? null,
      entry: entry?.getAttribute("data-testid") ?? null,
    };
  });
}

async function pagerIndex(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scroller = document.querySelector(".parent-scroller");
    if (!(scroller instanceof HTMLElement)) {
      return -1;
    }
    return Math.round(scroller.scrollLeft / scroller.clientWidth);
  });
}

test("tab walks reps, weight, check, then the next exercise", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_selectBuiltin(page);
  await page.locator("button:has-text('Basic Beginner Routine')").click();
  await page.getByTestId("clone-program").click();
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();
  await expect(page.getByTestId("entry-bent-over-row")).toBeVisible();

  await page.getByTestId("entry-bent-over-row").getByTestId("input-set-reps-field").first().click();
  expect(await focused(page)).toEqual({ testId: "input-set-reps-field", entry: "entry-bent-over-row" });
  await page.keyboard.press("5");
  await page.keyboard.press("Tab");
  expect(await focused(page)).toEqual({ testId: "input-set-weight-field", entry: "entry-bent-over-row" });
  await page.keyboard.press("Tab");
  expect(await focused(page)).toEqual({ testId: "complete-set", entry: "entry-bent-over-row" });

  await page.keyboard.press("Enter");
  await expect(page.getByTestId("entry-bent-over-row").getByTestId("set-completed").first()).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await focused(page)).toEqual({ testId: "input-set-reps-field", entry: "entry-bent-over-row" });

  const walked: string[] = [];
  let landed: IFocused = { testId: null, entry: null };
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const current = await focused(page);
    if (current.entry !== "entry-bent-over-row") {
      landed = current;
      break;
    }
    walked.push(current.testId ?? "null");
  }
  expect(walked.every((id) => STOP_IDS.includes(id))).toBe(true);
  expect(walked[walked.length - 1]).toBe("complete-set");
  expect(landed).toEqual({ testId: "input-set-reps-field", entry: "entry-bench-press" });
  await expect.poll(() => pagerIndex(page)).toBe(1);
});
