// eslint-disable-next-line @typescript-eslint/naming-convention
interface Window {
  _webpushrScriptReady: () => void;
  webpushr: (name: "fetch_id", fn: (sid: number) => void) => void;
  handleGapiLoad: () => void;
  AppleID: {
    auth: {
      signIn: () => Promise<{
        authorization: { code: string; id_token: string };
      }>;
      init: (args: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
    };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
}
