import { test, expect } from "@playwright/test";

test("rest timer", async ({ page }) => {
  await page.goto("https://local.liftosaur.com:8080?skipintro=1");
  await page.getByRole("button", { name: "Basic Beginner Routine" }).click();
  await page.getByTestId("clone-program").click();
  await page.getByTestId("start-workout").click();

  await page.getByTestId("set-nonstarted").first().click();
  await page.getByTestId("rest-timer-collapsed").click();

  await page.getByTestId("rest-timer-minus").click();
  await page.getByTestId("rest-timer-minus").click();
  await expect(page.getByTestId("rest-timer-total")).toHaveText("02:30");

  await page.getByTestId("rest-timer-plus").click();
  await expect(page.getByTestId("rest-timer-total")).toHaveText("02:45");

  await page.getByTestId("rest-timer-back").click();
  await page.getByTestId("rest-timer-collapsed").click();

  await page.getByTestId("rest-timer-cancel").click();
  await expect(page.getByTestId("rest-timer-collapsed")).toHaveCount(0);
  await expect(page.getByTestId("rest-timer-expanded")).toHaveCount(0);

  await page.getByTestId("set-nonstarted").first().click();
  await expect(page.getByTestId("rest-timer-collapsed")).toHaveCount(0);
  await expect(page.getByTestId("rest-timer-expanded")).toHaveCount(1);

  await page.getByTestId("rest-timer-back").click();
  await expect(page.getByTestId("rest-timer-collapsed")).toHaveCount(1);
  await expect(page.getByTestId("rest-timer-expanded")).toHaveCount(0);
});
