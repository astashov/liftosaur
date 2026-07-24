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

// Returns the original local file:// uri. We deliberately don't pass maxWidth/maxHeight/quality:
// those make the picker re-encode to JPEG, which flattens transparent PNGs onto a black background.
// assetRepresentationMode "current" keeps the original format (alpha intact); the downscale happens
// later in the native LiftosaurImageResizer, which preserves transparency.
export async function ImagePicker_pick(source: "camera" | "photo-library"): Promise<string | undefined> {
  if (source === "camera" && !(await ensureCameraPermission())) {
    return undefined;
  }
  const fn = source === "camera" ? launchCamera : launchImageLibrary;
  const res = await fn({
    mediaType: "photo",
    assetRepresentationMode: "current",
  });
  // Normal user cancellation is not an error - return undefined so callers can quietly close.
  if (res.didCancel) {
    return undefined;
  }
  if (res.errorCode) {
    throw new Error(res.errorMessage ?? `Image picker error: ${res.errorCode}`);
  }
  const uri = res.assets?.[0]?.uri;
  if (!uri) {
    throw new Error("No image was selected");
  }
  return uri;
}
