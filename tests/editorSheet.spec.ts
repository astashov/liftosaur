import { test, expect, Page } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_clearCodeMirror,
  PlaywrightUtils_typeCodeMirror,
  PlaywrightUtils_createProgram,
  PlaywrightUtils_disableTours,
} from "./playwrightUtils";

const singleWeek = `# Week 1
## Day 1
Squat / 3x8 / 100lb / progress: lp(5lb)`;

const twoWeeks = `# Intro Week
## Push Day
Squat / 3x8 / 100lb

# Volume Week
## Push Day
Squat / 5x5 / 120lb`;

// Seed a program from planner text and land on the UI editor with an unsaved draft
// (staying inside the editor, unlike PlaywrightUtils_createProgramWithCode).
async function seedProgramInEditor(page: Page, code: string): Promise<void> {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await expect(page.getByTestId("program-select-create")).toBeVisible();
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(page, "planner-editor", code);
  await page.getByTestId("editor-v2-ui-program").click();
}

const reuseProgram = `# Week 1
## Day 1
Squat / 3x8 / 100lb

## Day 2
Bench Press / ...Squat`;

// Every day's text, for the cases where a change on one day has to show up on another.
function allDayTexts(page: Page): Promise<string> {
  return page.evaluate(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const state = (window as any).state;
    const draftState: any = Object.values(state.editProgramStates)[0];
    const storageProgram = state.storage.programs.find((p: any) => p.name === "My Program");
    const planner = draftState?.current.program.planner ?? storageProgram?.planner;
    return (planner?.weeks ?? [])
      .flatMap((w: any) => w.days.map((d: any) => d.exerciseText))
      .join("\n")
      .trim();
  });
}

// The first entry of the ongoing workout, which follows the program by exercise key.
function firstWorkoutEntry(page: Page): Promise<{ exerciseId?: string; programExerciseId?: string }> {
  return page.evaluate(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const entry = (window as any).state.storage.progress?.[0]?.entries?.[0];
    return { exerciseId: entry?.exercise?.id, programExerciseId: entry?.programExerciseId };
  });
}

// The two places an editor-sheet save can land: the program editor's unsaved draft
// (editProgramStates) vs the persisted program in storage.
function programTexts(page: Page): Promise<{ draft: string | undefined; storage: string | undefined }> {
  return page.evaluate(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const state = (window as any).state;
    const draftState: any = Object.values(state.editProgramStates)[0];
    const storageProgram = state.storage.programs.find((p: any) => p.name === "My Program");
    return {
      draft: draftState?.current.program.planner?.weeks[0].days[0].exerciseText,
      storage: storageProgram?.planner?.weeks[0].days[0].exerciseText,
    };
  });
}

test("edit exercise opens the sheet; its save stays a draft until the editor saves", async ({ page }) => {
  await seedProgramInEditor(page, singleWeek);
  await page.getByTestId("edit-exercise").first().click();

  const sheet = page.getByTestId("editor-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId("planner-editor")).toContainText("Squat / 3x8 / 100lb");

  await PlaywrightUtils_clearCodeMirror(page, "editor-sheet");
  await PlaywrightUtils_typeCodeMirror(page, "editor-sheet", "Squat / 4x5 / 110lb / progress: lp(5lb)");
  await sheet.getByTestId("editor-sheet-save").click();
  await expect(sheet).toBeHidden();

  const afterSheetSave = await programTexts(page);
  expect(afterSheetSave.draft).toContain("Squat / 4x5 / 110lb");
  expect(afterSheetSave.storage ?? "").not.toContain("4x5");

  await page.getByTestId("save-program").click();
  await expect.poll(async () => (await programTexts(page)).storage).toContain("Squat / 4x5 / 110lb");
});

test("live validation flags bad text and save is blocked with the error", async ({ page }) => {
  await seedProgramInEditor(page, singleWeek);
  await page.getByTestId("edit-exercise").first().click();

  const sheet = page.getByTestId("editor-sheet");
  await PlaywrightUtils_clearCodeMirror(page, "editor-sheet");
  await PlaywrightUtils_typeCodeMirror(page, "editor-sheet", "Squat / 3x8 / progress: lpx(5lb)");
  await expect(sheet.locator(".planner-editor-error")).toContainText("Error:");

  let alertMessage = "";
  page.once("dialog", (dialog) => {
    alertMessage = dialog.message();
    return dialog.dismiss();
  });
  await sheet.getByTestId("editor-sheet-save").click();
  await expect(sheet).toBeVisible();
  expect(alertMessage).not.toEqual("");
});

test("week chips switch the edited declaration and warn about unsaved changes", async ({ page }) => {
  await seedProgramInEditor(page, twoWeeks);
  await page.getByTestId("edit-exercise").first().click();

  const sheet = page.getByTestId("editor-sheet");
  await expect(sheet.getByTestId("planner-editor")).toContainText("Squat / 3x8 / 100lb");
  await expect(sheet.getByTestId("editor-sheet-instance-1-1")).toHaveText("Intro Week · Push Day");
  await expect(sheet.getByTestId("editor-sheet-instance-2-1")).toHaveText("Volume Week · Push Day");

  await sheet.getByTestId("editor-sheet-instance-2-1").click();
  await expect(sheet.getByTestId("planner-editor")).toContainText("Squat / 5x5 / 120lb");
  await sheet.getByTestId("editor-sheet-instance-1-1").click();
  await expect(sheet.getByTestId("planner-editor")).toContainText("Squat / 3x8 / 100lb");

  await PlaywrightUtils_clearCodeMirror(page, "editor-sheet");
  await PlaywrightUtils_typeCodeMirror(page, "editor-sheet", "Squat / 9x9 / 100lb");
  // Playwright auto-dismisses dialogs, so the discard confirmation resolves to "cancel"
  // and the switch must not happen.
  await sheet.getByTestId("editor-sheet-instance-2-1").click();
  await expect(sheet.getByTestId("planner-editor")).toContainText("Squat / 9x9 / 100lb");

  page.once("dialog", (dialog) => dialog.accept());
  await sheet.getByTestId("editor-sheet-instance-2-1").click();
  await expect(sheet.getByTestId("planner-editor")).toContainText("Squat / 5x5 / 120lb");
});

test("closing the sheet with unsaved changes asks for confirmation", async ({ page }) => {
  await seedProgramInEditor(page, singleWeek);
  await page.getByTestId("edit-exercise").first().click();

  const sheet = page.getByTestId("editor-sheet");
  await PlaywrightUtils_clearCodeMirror(page, "editor-sheet");
  await PlaywrightUtils_typeCodeMirror(page, "editor-sheet", "Squat / 9x9 / 100lb");

  const closeButton = page.getByTestId("bottom-sheet-close").and(page.locator(":visible"));
  // Auto-dismissed confirmation keeps the sheet open.
  await closeButton.click();
  await expect(sheet).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await closeButton.click();
  await expect(sheet).toBeHidden();

  const texts = await programTexts(page);
  expect(texts.draft ?? "").not.toContain("9x9");
});

test("editing from the workout saves straight to the program", async ({ page }) => {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await expect(page.getByTestId("program-select-create")).toBeVisible();
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(page, "planner-editor", singleWeek);
  await page.getByTestId("save-program").click();

  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();
  await page.getByTestId("exercise-options").first().click();
  await page.getByTestId("exercise-edit-mode").click();

  const sheet = page.getByTestId("editor-sheet");
  await expect(sheet.getByTestId("planner-editor")).toContainText("Squat / 3x8 / 100lb");
  await PlaywrightUtils_clearCodeMirror(page, "editor-sheet");
  await PlaywrightUtils_typeCodeMirror(page, "editor-sheet", "Squat / 3x8 / 105lb / progress: lp(5lb)");
  await sheet.getByTestId("editor-sheet-save").click();
  await expect(sheet).toBeHidden();

  await expect.poll(async () => (await programTexts(page)).storage).toContain("Squat / 3x8 / 105lb");
});

test("renaming an exercise something else reuses carries the reference with it", async ({ page }) => {
  await seedProgramInEditor(page, reuseProgram);
  await page.getByTestId("edit-exercise").first().click();

  const sheet = page.getByTestId("editor-sheet");
  await expect(sheet.getByTestId("planner-editor")).toContainText("Squat / 3x8 / 100lb");
  await PlaywrightUtils_clearCodeMirror(page, "editor-sheet");
  await PlaywrightUtils_typeCodeMirror(page, "editor-sheet", "Front Squat / 3x8 / 100lb");

  // A plain text splice would leave `...Squat` pointing at a name the program no longer has,
  // and the save would be refused with nothing the user can do about it from in here.
  await sheet.getByTestId("editor-sheet-save").click();
  await expect(sheet).toBeHidden();

  const texts = await allDayTexts(page);
  expect(texts).toContain("Front Squat / 3x8 / 100lb");
  expect(texts).toContain("...Front Squat");
});

test("a name typed over an unknown one is a typo, not a swap", async ({ page }) => {
  await seedProgramInEditor(page, reuseProgram);
  await page.getByTestId("edit-exercise").first().click();

  const sheet = page.getByTestId("editor-sheet");
  await PlaywrightUtils_clearCodeMirror(page, "editor-sheet");
  await PlaywrightUtils_typeCodeMirror(page, "editor-sheet", "Squatt / 3x8 / 100lb");
  await expect(sheet.locator(".planner-editor-error")).toContainText("Unknown exercise");

  let alertMessage = "";
  page.once("dialog", (dialog) => {
    alertMessage = dialog.message();
    return dialog.dismiss();
  });
  await sheet.getByTestId("editor-sheet-save").click();
  await expect(sheet).toBeVisible();
  expect(alertMessage).toContain("Unknown exercise");
});

test("an exercise on several days asks how far the change should reach", async ({ page }) => {
  await seedProgramInEditor(page, twoWeeks);
  await page.getByTestId("edit-exercise").first().click();

  const sheet = page.getByTestId("editor-sheet");
  await PlaywrightUtils_clearCodeMirror(page, "editor-sheet");
  await PlaywrightUtils_typeCodeMirror(page, "editor-sheet", "Front Squat / 3x8 / 100lb");

  // Accepting picks the first option, "Change only this day".
  let scopeMessage = "";
  page.once("dialog", (dialog) => {
    scopeMessage = dialog.message();
    return dialog.accept();
  });
  await sheet.getByTestId("editor-sheet-save").click();
  await expect(sheet).toBeHidden();
  expect(scopeMessage).toContain("2 days");

  const oneDay = await allDayTexts(page);
  expect(oneDay).toContain("Front Squat / 3x8 / 100lb");
  expect(oneDay).toContain("Squat / 5x5 / 120lb");
});

test("declining the scope question changes the exercise across the whole program", async ({ page }) => {
  await seedProgramInEditor(page, twoWeeks);
  await page.getByTestId("edit-exercise").first().click();

  const sheet = page.getByTestId("editor-sheet");
  await PlaywrightUtils_clearCodeMirror(page, "editor-sheet");
  await PlaywrightUtils_typeCodeMirror(page, "editor-sheet", "Front Squat / 3x8 / 100lb");

  // Dismissing picks the last option, "Change across whole program" — the browser has no
  // three-button dialog, so each branch is spelled out in the message.
  let scopeMessage = "";
  page.once("dialog", (dialog) => {
    scopeMessage = dialog.message();
    return dialog.dismiss();
  });
  await sheet.getByTestId("editor-sheet-save").click();
  await expect(sheet).toBeHidden();
  expect(scopeMessage).toContain("Change across whole program");

  const wholeProgram = await allDayTexts(page);
  expect(wholeProgram).toContain("Front Squat / 3x8 / 100lb");
  expect(wholeProgram).toContain("Front Squat / 5x5 / 120lb");
  expect(wholeProgram).not.toContain("\nSquat");
});

// The ongoing workout tracks the program by exercise key, so a swap has to carry the key over
// or the workout quietly stops following the exercise it came from.
async function startWorkoutOn(page: Page, code: string): Promise<void> {
  await page.goto(startpage + "?skipintro=1&nosync=true");
  await expect(page.getByTestId("program-select-create")).toBeVisible();
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgram(page, "My Program");
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-full-program").click();
  await PlaywrightUtils_clearCodeMirror(page, "planner-editor");
  await PlaywrightUtils_typeCodeMirror(page, "planner-editor", code);
  await page.getByTestId("save-program").click();
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-workout").click();
}

async function swapFirstExerciseFromWorkout(page: Page, text: string): Promise<void> {
  await page.getByTestId("exercise-options").first().click();
  await page.getByTestId("exercise-edit-mode").click();
  const sheet = page.getByTestId("editor-sheet");
  await expect(sheet.getByTestId("planner-editor")).toBeVisible();
  await PlaywrightUtils_clearCodeMirror(page, "editor-sheet");
  await PlaywrightUtils_typeCodeMirror(page, "editor-sheet", text);
  await sheet.getByTestId("editor-sheet-save").click();
  await expect(sheet).toBeHidden();
}

test("the ongoing workout follows an exercise swapped from it", async ({ page }) => {
  await startWorkoutOn(page, singleWeek);
  expect((await firstWorkoutEntry(page)).exerciseId).toEqual("squat");

  await swapFirstExerciseFromWorkout(page, "Front Squat / 3x8 / 100lb / progress: lp(5lb)");

  // Nothing logged, so the entry converts without asking.
  await expect.poll(async () => (await firstWorkoutEntry(page)).exerciseId).toEqual("frontSquat");
  expect((await firstWorkoutEntry(page)).programExerciseId).toEqual("frontsquat_barbell");
});

test("a swap asks before converting sets that are already logged", async ({ page }) => {
  await startWorkoutOn(page, singleWeek);
  await page.getByTestId("entry-squat").getByTestId("complete-set").first().click();

  let confirmMessage = "";
  page.once("dialog", (dialog) => {
    confirmMessage = dialog.message();
    return dialog.dismiss();
  });
  await swapFirstExerciseFromWorkout(page, "Front Squat / 3x8 / 100lb / progress: lp(5lb)");
  expect(confirmMessage).toContain("already logged sets");

  // Declining leaves the logged work alone; the program still changed.
  expect((await firstWorkoutEntry(page)).exerciseId).toEqual("squat");
  expect(await allDayTexts(page)).toContain("Front Squat");
});
