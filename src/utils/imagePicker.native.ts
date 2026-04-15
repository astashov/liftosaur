import { launchCamera, launchImageLibrary } from "react-native-image-picker";

export async function ImagePicker_pick(source: "camera" | "photo-library"): Promise<string | undefined> {
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
