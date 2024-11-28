/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface Window {
  handleGapiLoad: () => void;
  disableCopying?: boolean;
  replaceState: (state: any) => void;
  reducerLastState?: any;
  reducerLastActions?: any[];
  loadRollbar: (item: string | number, token: string) => Promise<void>;
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
  structuredClone?: (obj: any) => any;
  onYouTubeIframeAPIReady?: () => void;
  YT: typeof YT;
  tempUserId?: string;
}

declare namespace YT {
  class Player {
    constructor(element: string, options: YT.PlayerOptions): void;
    public loadVideoById(id: string): void;
    public stopVideo(): void;
  }

  // Player constructor options
  interface IPlayerOptions {
    height?: string;
    width?: string;
    videoId?: string;
    events?: {
      onReady?: (event: PlayerEvent) => void;
    };
  }
}
