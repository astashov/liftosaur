/* eslint-disable @typescript-eslint/no-explicit-any */

type IRedditPixelStandardEvent =
  | "PageVisit"
  | "ViewContent"
  | "Search"
  | "AddToCart"
  | "AddToWishlist"
  | "Purchase"
  | "Lead"
  | "SignUp"
  | "Custom";

interface IRedditPixelCustomData {
  value?: number;
  currency?: string;
  itemCount?: number;
  num_items?: number;
  conversionId?: string;
  content_category?: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: any[];
  email?: string;
  phoneNumber?: string;
  externalId?: string;
  idfa?: string;
  aaid?: string;
  [key: string]: any;
}

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
  gtag(...args: any[]): void;
  rdt(command: "init", pixelId: string): void;
  rdt(command: "track", eventName: IRedditPixelStandardEvent | string, customData?: IRedditPixelCustomData): void;
  replaceState: (state: any) => void;
  isUndoing?: boolean;
  webeditor?: boolean;
  isPressingShiftCmdCtrl?: boolean;
  lftAndroidVersion?: number;
  lftAndroidAppVersion?: string;
  lftAndroidSafeInsetTop?: number;
  lftAndroidSafeInsetBottom?: number;
  lftAndroidSafeInsetLeft?: number;
  lftAndroidSafeInsetRight?: number;
  lftIosVersion?: string;
  lftIosAppVersion?: string;
  lftSystemDarkMode?: boolean;

  reducerLastState?: any;
  reducerLastActions?: any[];
  loadRollbar: (item: string | number, token: string) => Promise<void>;

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
