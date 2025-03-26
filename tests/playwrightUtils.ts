/* eslint-disable @typescript-eslint/no-explicit-any */
import { Locator, Page, expect } from "@playwright/test";
import { localdomain } from "../src/localdomain";

export const startpage = `https://${localdomain}.liftosaur.com:8080/app/`;

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
