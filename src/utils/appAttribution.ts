import {
  SendMessage_isIos,
  SendMessage_isAndroid,
  SendMessage_iosAppVersion,
  SendMessage_androidAppVersion,
  SendMessage_iosVersion,
  SendMessage_androidVersion,
} from "./sendMessage";

export interface IAppAttribution {
  isMobile: boolean;
  iOSVersion?: number;
  androidVersion?: number;
  iOSOSVersion?: number;
  androidOSVersion?: number;
  deviceModel?: string;
}

export function AppAttribution_get(): IAppAttribution {
  const isIos = SendMessage_isIos();
  const isAndroid = SendMessage_isAndroid();
  return {
    isMobile: isIos || isAndroid,
    iOSVersion: isIos ? SendMessage_iosAppVersion() : undefined,
    androidVersion: isAndroid ? SendMessage_androidAppVersion() : undefined,
    iOSOSVersion: isIos ? SendMessage_iosVersion() : undefined,
    androidOSVersion: isAndroid ? SendMessage_androidVersion() : undefined,
  };
}
