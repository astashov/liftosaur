import { expect, test } from "@playwright/test";
import {
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_createProgram,
  PlaywrightUtils_disableSubscriptions,
  PlaywrightUtils_disableTours,
  PlaywrightUtils_typeCodeMirror,
  startpage,
} from "./playwrightUtils";

test("shows optimized plate stacks from the bar outward", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "Optimized Plates");
  await PlaywrightUtils_disableSubscriptions(page);

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(
    page,
    "planner-editor",
    `# Week 1
## Day 1
Bench Press / 1x5 50lb, 1x5 70lb / warmup: none`
  );
  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("start-workout").click();

  const entry = page.getByTestId("entry-bench-press");
  await expect(entry.getByTestId("plates-list")).toHaveText("2.5");

  await entry.getByText("Target", { exact: true }).click();
  await entry.getByText("Previous Set", { exact: true }).click();
  await expect(entry.getByTestId("plates-list")).toHaveText(["2.5", "2.5", "2.5/10"]);

  await entry.getByTestId("complete-set").first().click();
  await expect(entry.getByTestId("plates-list").first()).toHaveText("2.5/10");
});
