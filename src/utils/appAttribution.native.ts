import { Platform } from "react-native";
import NativeLiftosaurEventReporter from "../specs/NativeLiftosaurEventReporter";

export interface IAppAttribution {
  isMobile: boolean;
  iOSVersion?: number;
  androidVersion?: number;
  iOSOSVersion?: number;
  androidOSVersion?: number;
  deviceModel?: string;
}

function appVersion(): number | undefined {
  try {
    const version = parseInt(NativeLiftosaurEventReporter.getAppVersion(), 10);
    return isNaN(version) ? undefined : version;
  } catch {
    return undefined;
  }
}

// iOS returns the hardware identifier (e.g. "iPhone15,2"); Android returns Build.MODEL (e.g.
// "Pixel 7"). Cheap New-Arch sync turbo call — no serialization, no third-party coupling.
function deviceModel(): string | undefined {
  try {
    const model = NativeLiftosaurEventReporter.getDeviceModel();
    return model.length > 0 ? model : undefined;
  } catch {
    return undefined;
  }
}

export function AppAttribution_get(): IAppAttribution {
  if (Platform.OS === "ios") {
    return {
      isMobile: true,
      iOSVersion: appVersion(),
      iOSOSVersion: parseInt(String(Platform.Version), 10),
      deviceModel: deviceModel(),
    };
  }
  if (Platform.OS === "android") {
    return {
      isMobile: true,
      androidVersion: appVersion(),
      androidOSVersion: parseInt(String(Platform.Version), 10),
      deviceModel: deviceModel(),
    };
  }
  return { isMobile: false };
}
