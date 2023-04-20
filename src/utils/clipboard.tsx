import { SendMessage } from "./sendMessage";

export namespace ClipboardUtils {
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
  }

  function copyTextToClipboard(text: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      navigator.permissions
        .query({ name: "clipboard-write" })
        .then((result) => {
          if (result.state === "granted" || result.state === "prompt") {
            navigator.clipboard.writeText(text);
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch(() => resolve(false));
    });
  }
}
