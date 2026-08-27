import { test, expect, Locator, Page } from "@playwright/test";
import {
  startpage,
  PlaywrightUtils_createProgramWithCode,
  PlaywrightUtils_disableTours,
  PlaywrightUtils_dragBy,
  PlaywrightUtils_readCodeMirror,
} from "./playwrightUtils";

// Every week's exercises differ, so no exercise repeats into the week beside it and every strip is
// one column wide — which is what makes `grid-cell-<name>-<week>` address exactly one of them.
const PROGRAM = `# Week 1
## Day 1
Squat / 3x8 100lb
Bench Press / 3x8 100lb

## Day 2
Deadlift / 3x8 100lb
Bicep Curl / 3x8 20lb

# Week 2
## Day 1
Squat / 3x5 120lb
Bench Press / 3x5 120lb

## Day 2
Deadlift / 3x5 120lb
Bicep Curl / 3x5 30lb
`;

async function openGrid(page: Page, program: string = PROGRAM): Promise<void> {
  await page.goto(startpage + "?skipintro=1");
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_createProgramWithCode(page, "My Program", program);
  await page.getByTestId("footer-program").click();
  await page.getByTestId("tab-edit").click();
  await page.getByTestId("editor-v2-grid-program").click();
}

// The grid's whole job is to rewrite Liftoscript, so the full text is what every one of these
// asserts on. The round trip prints its own blank line before each week heading and pads the end,
// neither of which is what is under test.
async function expectProgram(page: Page, expected: string): Promise<void> {
  await page.getByTestId("editor-v2-full-program").click();
  await expect
    .poll(async () => (await PlaywrightUtils_readCodeMirror(page, "planner-editor")).replace(/\n{3,}/g, "\n\n").trim())
    .toBe(expected.trim());
}

function cell(page: Page, name: string, weekIndex: number): Locator {
  return page.getByTestId(`grid-cell-${name}-${weekIndex}`);
}

// Drop one thing where another currently sits, measured from the layout rather than from a pixel
// count that a lane height would quietly invalidate. An exercise lands in the gap its pointer is
// nearest to, and a strip's centre is exactly halfway between two of them — so a drop that means
// one side or the other has to aim at an edge, which is a gap itself.
async function dragOnto(page: Page, from: Locator, to: Locator, edge?: "above" | "below"): Promise<void> {
  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();
  if (fromBox == null || toBox == null) {
    throw new Error("Can't drag between elements that aren't both on the screen");
  }
  const toY = edge === "above" ? toBox.y : edge === "below" ? toBox.y + toBox.height : toBox.y + toBox.height / 2;
  await PlaywrightUtils_dragBy(
    page,
    from,
    toBox.x + toBox.width / 2 - (fromBox.x + fromBox.width / 2),
    toY - (fromBox.y + fromBox.height / 2)
  );
}

test("selects one exercise at a time, and lets go of it", async ({ page }) => {
  await openGrid(page);

  await cell(page, "Squat", 0).click();
  await expect(page.getByTestId("grid-details")).toHaveText(/^Squat$/);

  // The selection moves to what was tapped rather than growing by it.
  await cell(page, "Bench Press", 0).click();
  await expect(page.getByTestId("grid-details")).toHaveText(/^Bench Press$/);

  // Tapping the selected one again keeps it selected — the ✕ is what lets go.
  await cell(page, "Bench Press", 0).click();
  await expect(page.getByTestId("grid-details")).toHaveText(/^Bench Press$/);

  await page.getByTestId("grid-clear-selection").click();
  await expect(page.getByTestId("grid-details")).toBeHidden();
});

test("selecting a day or a week takes over from the exercises", async ({ page }) => {
  await openGrid(page);

  await cell(page, "Squat", 0).click();
  await expect(page.getByTestId("grid-action-edit")).toHaveAttribute("aria-label", "Edit");

  await page.getByTestId("grid-select-day-0-1").click();
  await expect(page.getByTestId("grid-details")).toContainText("Day 2");
  await expect(page.getByTestId("grid-action-edit")).toHaveAttribute("aria-label", "Edit day");

  await page.getByTestId("grid-select-week-1").click();
  await expect(page.getByTestId("grid-details")).toContainText("Week 2");
  await expect(page.getByTestId("grid-action-edit")).toHaveAttribute("aria-label", "Edit week");
});

test("drags an exercise below the one under it", async ({ page }) => {
  await openGrid(page);

  await dragOnto(page, cell(page, "Squat", 0), cell(page, "Bench Press", 0), "below");

  // A strip is one week of a lane that runs across all of them, so both weeks reorder together.
  await expectProgram(
    page,
    `# Week 1
## Day 1
Bench Press / 3x8 100lb
Squat / 3x8 100lb

## Day 2
Deadlift / 3x8 100lb
Bicep Curl / 3x8 20lb

# Week 2
## Day 1
Bench Press / 3x5 120lb
Squat / 3x5 120lb

## Day 2
Deadlift / 3x5 120lb
Bicep Curl / 3x5 30lb`
  );
});

test("drags an exercise into the day below", async ({ page }) => {
  await openGrid(page);

  await dragOnto(page, cell(page, "Squat", 0), cell(page, "Deadlift", 0), "above");

  await expectProgram(
    page,
    `# Week 1
## Day 1
Bench Press / 3x8 100lb

## Day 2
Squat / 3x8 100lb
Deadlift / 3x8 100lb
Bicep Curl / 3x8 20lb

# Week 2
## Day 1
Bench Press / 3x5 120lb

## Day 2
Squat / 3x5 120lb
Deadlift / 3x5 120lb
Bicep Curl / 3x5 30lb`
  );
});

test("drags a day past the one under it", async ({ page }) => {
  await openGrid(page);

  // Onto the last strip of the day below rather than onto its name: a row is passed at its own
  // centre, and the two names are exactly one row apart — right on the boundary.
  await dragOnto(page, page.getByTestId("grid-select-day-0-0"), cell(page, "Bicep Curl", 0));

  await expectProgram(
    page,
    `# Week 1
## Day 2
Deadlift / 3x8 100lb
Bicep Curl / 3x8 20lb

## Day 1
Squat / 3x8 100lb
Bench Press / 3x8 100lb

# Week 2
## Day 2
Deadlift / 3x5 120lb
Bicep Curl / 3x5 30lb

## Day 1
Squat / 3x5 120lb
Bench Press / 3x5 120lb`
  );
});

test("drags a week past the one beside it", async ({ page }) => {
  await openGrid(page);

  await dragOnto(page, page.getByTestId("grid-select-week-0"), page.getByTestId("grid-select-week-1"));

  await expectProgram(
    page,
    `# Week 2
## Day 1
Squat / 3x5 120lb
Bench Press / 3x5 120lb

## Day 2
Deadlift / 3x5 120lb
Bicep Curl / 3x5 30lb

# Week 1
## Day 1
Squat / 3x8 100lb
Bench Press / 3x8 100lb

## Day 2
Deadlift / 3x8 100lb
Bicep Curl / 3x8 20lb`
  );
});

test("drags a repeat's edge back a week", async ({ page }) => {
  // One exercise, so there is one resize handle in the grid to reach for.
  await openGrid(
    page,
    `# Week 1
## Day 1
Squat[1-2] / 3x8 100lb

# Week 2
## Day 1
`
  );

  const firstWeek = await page.getByTestId("grid-select-week-0").boundingBox();
  const secondWeek = await page.getByTestId("grid-select-week-1").boundingBox();
  await PlaywrightUtils_dragBy(page, page.getByTestId("grid-resize-handle"), firstWeek!.x - secondWeek!.x, 0);

  // Repeating through week 1 is repeating nowhere, so the range comes off the name entirely.
  await expectProgram(
    page,
    `# Week 1
## Day 1
Squat / 3x8 100lb

# Week 2
## Day 1`
  );
});

test("adds a week and a day", async ({ page }) => {
  await openGrid(page);

  await page.getByTestId("grid-add-week").click();
  await page.getByTestId("grid-add-day-0").click();

  await expectProgram(
    page,
    `# Week 1
## Day 1
Squat / 3x8 100lb
Bench Press / 3x8 100lb

## Day 2
Deadlift / 3x8 100lb
Bicep Curl / 3x8 20lb

## Day 3

# Week 2
## Day 1
Squat / 3x5 120lb
Bench Press / 3x5 120lb

## Day 2
Deadlift / 3x5 120lb
Bicep Curl / 3x5 30lb

# Week 3`
  );
});

test("deletes an exercise from the week it was tapped in", async ({ page }) => {
  await openGrid(page);

  await cell(page, "Bench Press", 0).click();
  await page.getByTestId("grid-action-more").click();
  await page.getByTestId("grid-more-Delete exercise").click();

  // The strip that was tapped is one week of the exercise, and that is all the delete reaches.
  await expectProgram(
    page,
    `# Week 1
## Day 1
Squat / 3x8 100lb

## Day 2
Deadlift / 3x8 100lb
Bicep Curl / 3x8 20lb

# Week 2
## Day 1
Squat / 3x5 120lb
Bench Press / 3x5 120lb

## Day 2
Deadlift / 3x5 120lb
Bicep Curl / 3x5 30lb`
  );
});

test("duplicates a day", async ({ page }) => {
  await openGrid(page);

  await page.getByTestId("grid-select-day-0-0").click();
  await page.getByTestId("grid-action-more").click();
  await page.getByTestId("grid-more-Duplicate day").click();

  // The copy is appended rather than dropped in beside the original, which would move every day
  // below it and renumber the references to them — see PlannerStructure_duplicateDayRow.
  await expectProgram(
    page,
    `# Week 1
## Day 1
Squat / 3x8 100lb
Bench Press / 3x8 100lb

## Day 2
Deadlift / 3x8 100lb
Bicep Curl / 3x8 20lb

## Day 3
Squat / 3x8 100lb
Bench Press / 3x8 100lb

# Week 2
## Day 1
Squat / 3x5 120lb
Bench Press / 3x5 120lb

## Day 2
Deadlift / 3x5 120lb
Bicep Curl / 3x5 30lb

## Day 3
Squat / 3x5 120lb
Bench Press / 3x5 120lb`
  );
});

test("collapses a day row and puts its exercises away", async ({ page }) => {
  await openGrid(page);

  await page.getByTestId("grid-toggle-day-0").first().click();
  await expect(cell(page, "Squat", 0)).toBeHidden();
  await expect(cell(page, "Deadlift", 0)).toBeVisible();

  await page.getByTestId("grid-toggle-day-0").first().click();
  await expect(cell(page, "Squat", 0)).toBeVisible();
});
