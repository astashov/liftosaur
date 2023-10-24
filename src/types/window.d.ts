/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface Window {
  handleGapiLoad: () => void;
  disableCopying?: boolean;
  AppleID: {
    auth: {
      signIn: () => Promise<{
        authorization: { code: string; id_token: string };
      }>;
      init: (args: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
    };
  };
  replaceState: (state: any) => void;
  isUndoing?: boolean;
  isPressingShiftCmdCtrl?: boolean;
  lftAndroidVersion?: number;
  lftAndroidAppVersion?: string;
  lftAndroidSafeInsetTop?: number;
  lftAndroidSafeInsetBottom?: number;
  lftAndroidSafeInsetLeft?: number;
  lftAndroidSafeInsetRight?: number;
  lftIosVersion?: string;
  lftIosAppVersion?: string;

  reducerLastState?: any;
  reducerLastActions?: any[];
  loadRollbar: (item: string | number, token: string) => Promise<void>;
}
