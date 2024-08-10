import { test, expect } from "@playwright/test";
import { PlaywrightUtils } from "./playwrightUtils";

test("rpe", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080/app/?skipintro=1&legacy=1");
  await page.getByTestId("create-program").click();

  await page.getByTestId("modal-create-program-input").clear();
  await page.getByTestId("modal-create-program-input").type("My Program");
  await page.getByTestId("modal-create-program-submit").click();
  await page.getByTestId("edit-day").click();

  await page.getByText("Create New Exercise").click();
  await page.getByTestId("tab-advanced").click();
  await page.getByTestId("menu-item-name-enable-rpe").click();

  await PlaywrightUtils.clearCodeMirror(page, "oneline-editor-rpe");
  await PlaywrightUtils.typeCodeMirror(page, "oneline-editor-rpe", "8.2");
  await page.getByTestId("toggle-log-rpe").click();

  await page.getByText("Add New Set").click();
  await page.getByTestId("toggle-log-rpe").nth(1).click();

  await page.getByText("Add New Set").click();
  await PlaywrightUtils.clearCodeMirror(page, "oneline-editor-rpe", 2);

  await page.getByText("Add New Set").click();
  await page.getByTestId("toggle-log-rpe").nth(3).click();

  await page.getByTestId("add-state-variable").click();
  await page.getByTestId("modal-add-state-variable-input-name").type("boom");
  await page.getByTestId("modal-add-state-variable-submit").click();

  await PlaywrightUtils.clearCodeMirror(page, "multiline-editor-finish-day");
  await PlaywrightUtils.typeCodeMirror(
    page,
    "multiline-editor-finish-day",
    "state.boom = completedRPE[3] + completedRPE[4] + RPE[1]"
  );

  await page.getByTestId("save-exercise").click();

  await page.getByTestId("footer-workout").click();

  await expect(page.getByTestId("history-entry-rpe")).toHaveCount(1);
  await expect(page.getByTestId("history-entry-rpe")).toHaveText("@8");

  await expect(page.getByTestId("history-entry-sets-next")).toHaveCount(2);
  await expect(page.getByTestId("history-entry-sets-next").first()).toHaveText("2x5");
  await expect(page.getByTestId("history-entry-sets-next").nth(1)).toHaveText("2x5");

  await page.getByTestId("start-workout").click();

  await expect(page.getByTestId("left-superscript")).toHaveCount(3);
  await expect(page.getByTestId("left-superscript").nth(0)).toHaveText("@8");
  await expect(page.getByTestId("left-superscript").nth(1)).toHaveText("@8");
  await expect(page.getByTestId("left-superscript").nth(2)).toHaveText("@?");

  await page.getByTestId("set-nonstarted").nth(3).click();
  await page.getByTestId("modal-rpe-input").type("7.5");
  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("left-superscript-completed")).toHaveCount(1);
  await expect(page.getByTestId("left-superscript-completed")).toHaveText("@7.5");

  await page.getByTestId("set-nonstarted").nth(3).click();
  await expect(page.getByTestId("left-superscript")).toHaveCount(2);
  await expect(page.getByTestId("left-superscript-completed")).toHaveCount(1);

  await page.getByTestId("set-nonstarted").nth(3).click();

  await page.getByTestId("set-nonstarted").nth(3).click();
  await page.getByTestId("modal-rpe-input").type("11");
  await page.getByTestId("modal-amrap-submit").click();

  await expect(page.getByTestId("left-superscript-completed")).toHaveCount(2);
  await expect(page.getByTestId("left-superscript-completed").nth(0)).toHaveText("@7.5");
  await expect(page.getByTestId("left-superscript-completed").nth(1)).toHaveText("@10");

  await expect(page.getByTestId("state-changes-value-boom")).toHaveText("0 -> 18");

  await page.getByRole("button", { name: "Finish the workout" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByTestId("history-entry-sets-completed")).toHaveCount(4);
  await expect(page.getByTestId("history-entry-sets-completed").nth(0)).toHaveText("5");
  await expect(page.getByTestId("history-entry-sets-completed").nth(1)).toHaveText("5");
  await expect(page.getByTestId("history-entry-sets-completed").nth(2)).toHaveText("5");
  await expect(page.getByTestId("history-entry-sets-completed").nth(3)).toHaveText("5");

  await expect(page.getByTestId("history-entry-completed-rpe")).toHaveCount(2);
  await expect(page.getByTestId("history-entry-completed-rpe").nth(0)).toHaveText("@7.5");
  await expect(page.getByTestId("history-entry-completed-rpe").nth(1)).toHaveText("@10");

  await expect(page.getByTestId("history-entry-rpe")).toHaveCount(2);
  await expect(page.getByTestId("history-entry-rpe").nth(0)).toHaveText("@8");
  await expect(page.getByTestId("history-entry-rpe").nth(1)).toHaveText("@8");
});
