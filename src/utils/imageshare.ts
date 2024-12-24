import { Mobile } from "../../lambda/utils/mobile";
import * as htmlToImage from "html-to-image";
import { SendMessage } from "./sendMessage";

export class ImageShareUtils {
  constructor(private readonly dataURL: string, private readonly fileName: string) {}

  public static async generateImageDataUrl(element: HTMLElement): Promise<string> {
    await htmlToImage.toPng(element, { pixelRatio: 2 });
    await htmlToImage.toPng(element, { pixelRatio: 2 });
    return htmlToImage.toPng(element, { pixelRatio: 2 });
  }

  public shareOrDownload(): void {
    if (this.canShareDataUrl()) {
      this.shareDataURL();
    } else if (SendMessage.isAndroid() && SendMessage.androidAppVersion() >= 20) {
      SendMessage.toAndroid({
        type: "share",
        target: "image",
        useCustomBackground: "false",
        backgroundImage: undefined,
        workoutImage: this.dataURL,
      });
    } else {
      this.saveDataURLToFile();
    }
  }

  private canShareDataUrl(): boolean {
    const blob = this.dataURLToBlob();
    const file = new File([blob], this.fileName, { type: blob.type });
    return Mobile.isMobile(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] });
  }

  private saveDataURLToFile(): void {
    const link = document.createElement("a");
    link.href = this.dataURL;
    link.download = this.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private async shareDataURL(): Promise<void> {
    // Check if the Web Share API is available
    if (!this.canShareDataUrl()) {
      return;
    }

    try {
      // Convert the data URL to a Blob
      const blob = this.dataURLToBlob();

      // Create a File object
      const file = new File([blob], this.fileName, { type: blob.type });

      // Use the Web Share API to open the share dialog
      await navigator.share({
        files: [file],
        title: "Workout Program Image",
      });
    } catch (error) {
      alert("Error sharing file. Likely because the image is too large to generate. Try to disable some weeks/days.");
    }
  }

  private dataURLToBlob(): Blob {
    const [header, base64Data] = this.dataURL.split(",");
    const mimeTypeMatch = header.match(/:(.*?);/);
    if (!mimeTypeMatch) {
      throw new Error("Invalid data URL format.");
    }
    const mimeType = mimeTypeMatch[1];

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const binaryLength = binaryString.length;
    const bytes = new Uint8Array(binaryLength);

    for (let i = 0; i < binaryLength; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: mimeType });
  }
}
