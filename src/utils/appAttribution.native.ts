import { Platform } from "react-native";
import NativeLiftosaurEventReporter from "../specs/NativeLiftosaurEventReporter";

export interface IAppAttribution {
  isMobile: boolean;
  iOSVersion?: number;
  androidVersion?: number;
  iOSOSVersion?: number;
  androidOSVersion?: number;
}

function appVersion(): number | undefined {
  try {
    const version = parseInt(NativeLiftosaurEventReporter.getAppVersion(), 10);
    return isNaN(version) ? undefined : version;
  } catch {
    return undefined;
  }
}

export function AppAttribution_get(): IAppAttribution {
  if (Platform.OS === "ios") {
    return { isMobile: true, iOSVersion: appVersion(), iOSOSVersion: parseInt(String(Platform.Version), 10) };
  }
  if (Platform.OS === "android") {
    return { isMobile: true, androidVersion: appVersion(), androidOSVersion: parseInt(String(Platform.Version), 10) };
  }
  return { isMobile: false };
}
