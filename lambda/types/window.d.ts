// eslint-disable-next-line @typescript-eslint/naming-convention
interface Window {
  _webpushrScriptReady: () => void;
  webpushr: (name: "fetch_id", fn: (sid: number) => void) => void;
  handleGapiLoad: () => void;
  isUndoing?: boolean;
  lftAndroidAppVersion?: string;
  lftIosAppVersion?: string;
  lftAndroidVersion?: number;
  lftIosVersion?: string;
  AppleID: {
    auth: {
      signIn: () => Promise<{
        authorization: { code: string; id_token: string };
      }>;
      init: (args: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
    };
  };
}
