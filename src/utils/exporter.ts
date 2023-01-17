import { SendMessage } from "./sendMessage";

export namespace Exporter {
  export function toFile(filename: string, contents: string): void {
    if (
      !SendMessage.toAndroid({ type: "export", filename, contents }) &&
      !SendMessage.toIos({ type: "export", filename, contents })
    ) {
      const blob = new Blob([contents], { type: "text/plain" });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.setAttribute("download", filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
}
