/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_createProgram,
  PlaywrightUtils_disableTours,
} from "./playwrightUtils";

test("Invalid program pins the screen to the Edit tab", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(page, "planner-editor", "# Week 1\n## Day 1\nBench Press / 3x8 / 100lb\n");

  await expect(page.getByTestId("tab-preview")).toHaveCSS("opacity", "1");
  await expect(page.getByTestId("tab-edit")).not.toContainText("⚠️");

  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(
    page,
    "planner-editor",
    "# Week 1\n## Day 1\nBench Press / ...Bench Press / 3x8 / 100lb\n"
  );

  await expect(page.getByTestId("tab-edit")).toContainText("⚠️");
  await expect(page.getByTestId("tab-preview")).toHaveCSS("opacity", "0.4");
  await expect(page.getByTestId("tab-playground")).toHaveCSS("opacity", "0.4");

  await page.getByTestId("tab-preview").click({ force: true });
  await expect(page.getByTestId("planner-editor")).toBeVisible();
  await expect(page.getByTestId("tab-edit")).toContainText("⚠️");
});

test("Arriving at a saved-but-broken program lands on Edit, not an empty Preview", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");

  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(page, "planner-editor", "# Week 1\n## Day 1\nBench Press / 3x8 / 100lb\n");
  await page.getByTestId("save-program").click();

  // A program saved while valid that a later Liftoscript change turned invalid - the only way
  // to get one through the UI is to break it behind the editor's back.
  await page.evaluate(() => {
    const storage = (window as any).state.storage;
    const index = storage.programs.findIndex((p: any) => p.name === "My Program");
    const program = storage.programs[index];
    storage.programs[index] = {
      ...program,
      planner: {
        ...program.planner,
        weeks: program.planner.weeks.map((week: any, wi: number) =>
          wi !== 0
            ? week
            : {
                ...week,
                days: week.days.map((day: any, di: number) =>
                  di !== 0 ? day : { ...day, exerciseText: "Bench Press / ...Bench Press / 3x8 / 100lb" }
                ),
              }
        ),
      },
    };
  });

  await page.getByTestId("footer-program").click();
  await expect(page.getByTestId("tab-edit")).toContainText("⚠️");
  await expect(page.getByTestId("tab-preview")).toHaveCSS("opacity", "0.4");
  await expect(page.getByTestId("planner-editor")).toBeVisible();
});
