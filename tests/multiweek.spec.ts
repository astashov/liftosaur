import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("multiweek", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-program-submit").click();
  await page.getByTestId("edit-day").click();

  await page.getByText("Create New Exercise").click();
  await page.getByTestId("tab-advanced").click();

  await page.getByTestId("add-state-variable").click();
  await page.getByTestId("modal-add-state-variable-input-name").type("week");
  await page.getByTestId("modal-add-state-variable-submit").click();

  await page.getByTestId("add-state-variable").click();
  await page.getByTestId("modal-add-state-variable-input-name").type("day");
  await page.getByTestId("modal-add-state-variable-submit").click();

  await page.getByTestId("add-state-variable").click();
  await page.getByTestId("modal-add-state-variable-input-name").type("dayInWeek");
  await page.getByTestId("modal-add-state-variable-submit").click();

  await PlaywrightUtils.clearCodeMirror(page, "multiline-editor-finish-day");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "multiline-editor-finish-day",
    `state.week = week
state.day = day
state.dayInWeek = dayInWeek`
  );

  await page.getByTestId("save-program").click();
  await page.getByTestId("navbar-back").click();

  await page.getByTestId("menu-item-squat").getByTestId("clone-exercise").click();
  await page.getByTestId("menu-item-squat-copy").getByTestId("edit-exercise").click();
  await page.getByTestId("menu-item-exercise").click();
  await page.getByTestId("modal-exercise").getByTestId("menu-item-bench-press").click();
  await page.getByTestId("save-exercise").click();

  await page.getByTestId("menu-item-squat").getByTestId("clone-exercise").click();
  await page.getByTestId("menu-item-squat-copy").getByTestId("edit-exercise").click();
  await page.getByTestId("menu-item-exercise").click();
  await page.getByTestId("modal-exercise").getByTestId("menu-item-deadlift").click();
  await page.getByTestId("save-exercise").click();

  await page.getByTestId("add-day").click();
  await page.getByTestId("menu-item-bench-press").click();
  await page.getByTestId("navbar-back").click();

  await page.getByTestId("add-day").click();
  await page.getByTestId("menu-item-deadlift").click();
  await page.getByTestId("navbar-back").click();

  await page.getByTestId("menu-item-name-is-multi-week-program?").click();

  await page.getByTestId("menu-item-week-1").getByTestId("edit-week").click();
  await page.getByTestId("menu-item-day-1").click();
  await page.getByTestId("menu-item-day-2").click();
  await page.getByTestId("menu-item-day-3").click();
  await page.getByTestId("navbar-back").click();

  await page.getByTestId("add-week").click();
  await page.getByTestId("menu-item-day-2").click();
  await page.getByTestId("menu-item-day-1").click();
  await page.getByTestId("navbar-back").click();

  await page.getByTestId("add-week").click();
  await page.getByTestId("menu-item-day-3").click();
  await page.getByTestId("menu-item-day-1").click();
  await page.getByTestId("menu-item-day-2").click();
  await page.getByTestId("navbar-back").click();

  await page.getByTestId("footer-workout").click();

  const expectations = [
    { exercise: "squat", name: "Week 1 - Day 1", week: "0 -> 1", day: "0 -> 1", dayinweek: "0 -> 1" },
    { exercise: "bench-press", name: "Week 1 - Day 2", week: "0 -> 1", day: "0 -> 2", dayinweek: "0 -> 2" },
    { exercise: "deadlift", name: "Week 1 - Day 3", week: "0 -> 1", day: "0 -> 3", dayinweek: "0 -> 3" },
    { exercise: "bench-press", name: "Week 2 - Day 2", week: "1 -> 2", day: "2 -> 4", dayinweek: "2 -> 1" },
    { exercise: "squat", name: "Week 2 - Day 1", week: "1 -> 2", day: "1 -> 5", dayinweek: "1 -> 2" },
    { exercise: "deadlift", name: "Week 3 - Day 3", week: "1 -> 3", day: "3 -> 6", dayinweek: "3 -> 1" },
    { exercise: "squat", name: "Week 3 - Day 1", week: "2 -> 3", day: "5 -> 7", dayinweek: undefined },
    { exercise: "bench-press", name: "Week 3 - Day 2", week: "2 -> 3", day: "4 -> 8", dayinweek: "1 -> 3" },
    { exercise: "squat", name: "Week 1 - Day 1", week: "3 -> 1", day: "7 -> 1", dayinweek: "2 -> 1" },
  ];

  for (const expectation of expectations) {
    await page.getByTestId("start-workout").click();
    await page
      .getByTestId(`entry-${expectation.exercise}`)
      .getByTestId("workout-set")
      .getByTestId("set-nonstarted")
      .click();
    await expect(page.getByTestId("day-name")).toHaveText(expectation.name);
    if (expectation.week != null) {
      await expect(page.getByTestId("state-changes-value-week")).toHaveText(expectation.week);
    } else {
      await expect(page.getByTestId("state-changes-value-week")).toHaveCount(0);
    }
    if (expectation.day != null) {
      await expect(page.getByTestId("state-changes-value-day")).toHaveText(expectation.day);
    } else {
      await expect(page.getByTestId("state-changes-value-day")).toHaveCount(0);
    }
    if (expectation.dayinweek != null) {
      await expect(page.getByTestId("state-changes-value-dayinweek")).toHaveText(expectation.dayinweek);
    } else {
      await expect(page.getByTestId("state-changes-value-dayinweek")).toHaveCount(0);
    }
    await page.getByTestId("finish-workout").click();
    await page.getByTestId("finish-day-continue").click();
  }
});
