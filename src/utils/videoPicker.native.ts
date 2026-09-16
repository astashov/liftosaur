import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { IVideoPick } from "./videoPick";
import { CameraPermission_ensure } from "./cameraPermission";

export async function VideoPicker_pick(source: "camera" | "photo-library"): Promise<IVideoPick | undefined> {
  if (source === "camera" && !(await CameraPermission_ensure())) {
    return undefined;
  }
  const launcher = source === "camera" ? launchCamera : launchImageLibrary;
  const result = await launcher({ mediaType: "video", videoQuality: "high" });
  if (result.errorCode || result.errorMessage) {
    return undefined;
  }
  const asset = result.assets?.[0];
  const uri = asset?.uri;
  if (!uri) {
    return undefined;
  }
  return { uri, type: asset.type, size: asset.fileSize };
}
