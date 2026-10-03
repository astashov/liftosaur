import { WatchHost_appVersion, WatchHost_isAvailable } from "./watchHost";

export interface IAppAttribution {
  isMobile: boolean;
  iOSVersion?: number;
  androidVersion?: number;
  iOSOSVersion?: number;
  androidOSVersion?: number;
  deviceModel?: string;
}

export function AppAttribution_get(): IAppAttribution {
  const isWatch = WatchHost_isAvailable();
  return {
    isMobile: isWatch,
    iOSVersion: isWatch ? WatchHost_appVersion() : undefined,
  };
}
