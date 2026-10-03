import { Mobile_isMobile } from "../../lambda/utils/mobile";
import * as htmlToImage from "html-to-image";
import { Dialog_alert } from "./dialog";

export class ImageShareUtils {
  constructor(
    private readonly dataURL: string,
    private readonly fileName: string
  ) {}

  public static async generateImageDataUrl(
    element: unknown,
    _options?: { width?: number; height?: number }
  ): Promise<string> {
    const maybeRef = element as { current?: HTMLElement } | null;
    const el = (maybeRef && "current" in maybeRef ? maybeRef.current : (element as HTMLElement)) as HTMLElement;
    await htmlToImage.toPng(el, { pixelRatio: 2 });
    await htmlToImage.toPng(el, { pixelRatio: 2 });
    return htmlToImage.toPng(el, { pixelRatio: 2 });
  }

  public static async shareToSocial(
    _target: "igstory" | "igfeed" | "tiktok",
    _workoutImage: string,
    _options: { backgroundImage?: string } = {}
  ): Promise<void> {}

  public async shareOrDownload(): Promise<void> {
    if (this.canShareDataUrl()) {
      await this.shareDataURL();
    } else {
      this.saveDataURLToFile();
    }
  }

  private canShareDataUrl(): boolean {
    const blob = this.dataURLToBlob();
    const file = new File([blob], this.fileName, { type: blob.type });
    return Mobile_isMobile(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] });
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
      Dialog_alert(
        "Error sharing file. Likely because the image is too large to generate. Try to disable some weeks/days."
      );
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
