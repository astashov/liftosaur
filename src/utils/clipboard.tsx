export namespace ClipboardUtils {
  export function copy(text: string): void {
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text);
    } else {
      navigator.clipboard.writeText(text);
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
}
