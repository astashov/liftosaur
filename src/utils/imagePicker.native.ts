import { Platform, PermissionsAndroid } from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return true;
  }
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: "Camera permission",
    message: "Liftosaur needs access to your camera to take a photo.",
    buttonPositive: "OK",
    buttonNegative: "Cancel",
  });
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export async function ImagePicker_pick(source: "camera" | "photo-library"): Promise<string | undefined> {
  if (source === "camera" && !(await ensureCameraPermission())) {
    return undefined;
  }
  const fn = source === "camera" ? launchCamera : launchImageLibrary;
  const res = await fn({
    mediaType: "photo",
    includeBase64: true,
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.8,
  });
  if (res.didCancel || res.errorCode) {
    return undefined;
  }
  const asset = res.assets?.[0];
  if (!asset?.base64) {
    return undefined;
  }
  const mime = asset.type ?? "image/jpeg";
  return `data:${mime};base64,${asset.base64}`;
}
