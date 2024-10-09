import { SendMessage } from "./sendMessage";
import { IEither } from "./types";

export namespace ClipboardUtils {
  export async function paste(): Promise<string | undefined> {
    if (!navigator.clipboard) {
      return fallbackReadTextFromClipboard();
    } else {
      try {
        const result = await readTextFromClipboard();
        if (result.success) {
          return result.data;
        } else {
          return fallbackReadTextFromClipboard();
        }
      } catch (e) {
        return fallbackReadTextFromClipboard();
      }
    }
  }

  export async function copy(text: string): Promise<void> {
    if (!SendMessage.toIos({ type: "copyToClipboard", value: text })) {
      if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
      } else {
        try {
          await copyTextToClipboard(text);
          fallbackCopyTextToClipboard(text);
        } catch (e) {
          fallbackCopyTextToClipboard(text);
        }
      }
    }
  }

  function fallbackCopyTextToClipboard(text: string): void {
    window.disableCopying = true;
    const textArea = document.createElement("textarea");
    textArea.value = text;

    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    document.execCommand("copy");
    document.body.removeChild(textArea);
    window.disableCopying = false;
  }

  function copyTextToClipboard(text: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        navigator.permissions
          .query({ name: "clipboard-write" as PermissionName })
          .then(async (result) => {
            if (result.state === "granted" || result.state === "prompt") {
              await navigator.clipboard.writeText(text);
              resolve(true);
            } else {
              resolve(false);
            }
          })
          .catch(async () => {
            try {
              await navigator.clipboard.writeText(text);
              resolve(true);
            } catch (e) {
              resolve(false);
            }
          });
      } catch (_) {
        try {
          await navigator.clipboard.writeText(text);
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      }
    });
  }

  export async function canReadTextFromClipboard(): Promise<boolean> {
    try {
      const queryResult = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
      return queryResult.state === "granted" || queryResult.state === "prompt";
    } catch (_) {
      return false;
    }
  }

  async function readTextFromClipboard(): Promise<IEither<string | undefined, undefined>> {
    try {
      const queryResult = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
      if (queryResult.state === "granted" || queryResult.state === "prompt") {
        return { success: true, data: await navigator.clipboard.readText() };
      } else {
        throw new Error("Can't read from clipboard");
      }
    } catch (_) {
      try {
        return { success: true, data: await navigator.clipboard.readText() };
      } catch {
        return { success: false, error: undefined };
      }
    }
  }

  function fallbackReadTextFromClipboard(): string | undefined {
    const contentEditableElement = document.createElement("div");
    contentEditableElement.contentEditable = "true";
    document.body.appendChild(contentEditableElement);
    contentEditableElement.focus();

    document.execCommand("paste");
    const result = contentEditableElement.innerText;
    document.body.removeChild(contentEditableElement);
    return result;
  }
}
