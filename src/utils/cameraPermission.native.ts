import { Platform, PermissionsAndroid } from "react-native";

// react-native-image-picker asks for the permission itself on iOS, and on Android only when the
// app leaves Manifest.permission.CAMERA undeclared. Liftosaur declares it, so launchCamera
// returns an error until the app obtains the grant.
export async function CameraPermission_ensure(): Promise<boolean> {
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
