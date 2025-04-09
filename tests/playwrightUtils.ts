/* eslint-disable @typescript-eslint/no-explicit-any */
import { Locator, Page, expect } from "@playwright/test";
import { localdomain } from "../src/localdomain";

export const startpage = `https://${localdomain}.liftosaur.com:8080/app/`;

type ITestSet = 0 | 1 | { amrap: { reps?: number; weight?: number } };

export class PlaywrightUtils {
  public static async clearCodeMirror(page: Page, dataCy: string, index?: number): Promise<void> {
    await expect(
      page
        .getByTestId(dataCy)
        .locator("css=.cm-content")
        .nth(index ?? 0)
    ).toBeVisible();
    await page.evaluate(
      ([theDataCy, theIndex]) => {
        const i = parseInt(`${theIndex ?? "0"}`, 10);
        const cmContent = document.querySelectorAll(`[data-cy=${theDataCy}] .cm-content`)[i] as any;
        cmContent.cmView.view.update([
          cmContent.cmView.view.state.update({
            changes: { from: 0, to: cmContent.cmView.view.state.doc.length, insert: "" },
          }),
        ]);
      },
      [dataCy, index]
    );
  }

  public static async finishExercise(page: Page, name: string, sets: ITestSet[], aLocator?: Locator): Promise<void> {
    const locator = aLocator || page;
    await locator.getByTestId(`workout-tab-${name}`).click();
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      if (set !== 0) {
        await locator.getByTestId(`entry-${name}`).getByTestId("complete-set").nth(i).click();
        if (typeof set !== "number") {
          if (set.amrap) {
            if (set.amrap.reps != null) {
              await page.getByTestId("modal-amrap-input").fill(`${set.amrap.reps}`);
            }
            await page.getByTestId("modal-amrap-submit").click();
          }
        }
      }
    }
  }

  public static async typeKeyboard(page: Page, locator: Locator, text: string): Promise<void> {
    const chars = text.split("");
    await locator.click();
    let currentText = "";
    for (const char of chars) {
      await page.getByTestId(`keyboard-button-${char}`).click();
      currentText += char;
      await expect(locator).toHaveText(currentText);
    }
    await page.getByTestId("keyboard-close").click();
  }

  public static async swipeLeft(page: Page, locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();

    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      const swipeDistance = 100; // adjust as needed
      const endX = centerX - swipeDistance;

      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.move(endX, centerY, { steps: 20 });
      await page.waitForTimeout(100);
      await page.mouse.up();
    }
  }

  public static typeCodeMirror(page: Page, dataCy: string, text: string, index?: number): Promise<void> {
    return page.evaluate(
      ([theDataCy, theText, theIndex]) => {
        const i = parseInt(`${theIndex ?? "0"}`, 10);
        const cmContent = document.querySelectorAll(`[data-cy=${theDataCy}] .cm-content`)[i] as any;
        cmContent.cmView.view.update([
          cmContent.cmView.view.state.update({
            changes: { from: 0, to: cmContent.cmView.view.state.doc.length, insert: theText },
          }),
        ]);
      },
      [dataCy, text, index]
    );
  }

  public static async type(value: string, locator: () => Locator): Promise<void> {
    await locator().clear();
    await expect(locator()).toHaveValue("");
    await locator().type(value);
    await expect(locator()).toHaveValue(value);
    await locator().blur();
  }

  public static disableSubscriptions(page: Page): Promise<void> {
    return page.evaluate(() => {
      (window as any).state.storage.subscription.key = "test";
    }, []);
  }

  public static async forEach(locator: Locator, cb: (el: Locator) => Promise<void>): Promise<void> {
    const count = (await locator.count()) ?? 0;
    for (let i = 0; i < count; i++) {
      await cb(locator.nth(i));
    }
  }

  public static async clickAll(locator: Locator): Promise<void> {
    for (const el of await locator.elementHandles()) {
      await el.click();
    }
  }
}
