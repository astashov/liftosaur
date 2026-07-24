import { Alert } from "react-native";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import { captureRef } from "react-native-view-shot";
import NativeLiftosaurShare from "../specs/NativeLiftosaurShare";

export class ImageShareUtils {
  constructor(
    private readonly path: string,
    private readonly fileName: string
  ) {}

  public static async generateImageDataUrl(
    ref: unknown,
    options?: { width?: number; height?: number; useRenderInContext?: boolean }
  ): Promise<string> {
    const path = await captureRef(ref as Parameters<typeof captureRef>[0], {
      format: "png",
      quality: 1,
      result: "tmpfile",
      useRenderInContext: options?.useRenderInContext ?? true,
      ...(options?.width != null ? { width: options.width } : null),
      ...(options?.height != null ? { height: options.height } : null),
    });
    return path.startsWith("file://") ? path : `file://${path}`;
  }

  public async shareOrDownload(): Promise<void> {
    try {
      await Share.open({
        url: this.path,
        type: "image/png",
        filename: this.fileName,
        failOnCancel: false,
      });
    } catch (e) {
      const err = e as { message?: string };
      if (err.message && /cancel|cancelled|user did not share/i.test(err.message)) {
        return;
      }
      Alert.alert("Share failed", err.message ?? "Unknown error");
    } finally {
      await ImageShareUtils.cleanup(this.path);
    }
  }

  public static async shareToSocial(
    target: "igstory" | "igfeed" | "tiktok",
    workoutImage: string,
    options: { backgroundImage?: string } = {}
  ): Promise<void> {
    try {
      if (target === "igstory") {
        await NativeLiftosaurShare.shareToIGStory(workoutImage, options.backgroundImage ?? null);
      } else if (target === "igfeed") {
        await NativeLiftosaurShare.shareToIGFeed(workoutImage);
      } else {
        await NativeLiftosaurShare.shareToTiktok(workoutImage);
      }
    } catch (e) {
      const err = e as { message?: string };
      if (err.message && /cancel|cancelled|user did not share/i.test(err.message)) {
        return;
      }
      Alert.alert("Share failed", err.message ?? "Unknown error");
    } finally {
      await ImageShareUtils.cleanup(workoutImage);
      if (options.backgroundImage) {
        await ImageShareUtils.cleanup(options.backgroundImage);
      }
    }
  }

  private static async cleanup(uri: string): Promise<void> {
    const path = uri.startsWith("file://") ? uri.slice("file://".length) : uri;
    if (!path.startsWith(RNFS.CachesDirectoryPath) && !path.startsWith(RNFS.TemporaryDirectoryPath)) {
      return;
    }
    try {
      if (await RNFS.exists(path)) {
        await RNFS.unlink(path);
      }
    } catch {}
  }
}
