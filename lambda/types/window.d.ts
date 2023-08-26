// eslint-disable-next-line @typescript-eslint/naming-convention
interface Window {
  handleGapiLoad: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replaceState: (state: any) => void;
  isUndoing?: boolean;
  lftAndroidAppVersion?: string;
  lftIosAppVersion?: string;
  lftAndroidVersion?: number;
  lftIosVersion?: string;
  isPressingShiftCmdCtrl?: boolean;
  AppleID: {
    auth: {
      signIn: () => Promise<{
        authorization: { code: string; id_token: string };
      }>;
      init: (args: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
    };
  };
}
