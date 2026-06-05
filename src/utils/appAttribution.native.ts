import { Platform } from "react-native";

export interface IAppAttribution {
  isMobile: boolean;
  iOSVersion?: number;
  androidVersion?: number;
  iOSOSVersion?: number;
  androidOSVersion?: number;
}

export function AppAttribution_get(): IAppAttribution {
  if (Platform.OS === "ios") {
    return { isMobile: true, iOSOSVersion: parseInt(String(Platform.Version), 10) };
  }
  if (Platform.OS === "android") {
    return { isMobile: true, androidOSVersion: parseInt(String(Platform.Version), 10) };
  }
  return { isMobile: false };
}
