export type IRNToWebView =
  | { type: "init"; screen: string; params?: unknown; state: string }
  | { type: "stateUpdate"; state: string };

export type IWebViewToRN =
  | { type: "action"; action: unknown }
  | { type: "navigate"; screen: string; params?: unknown; shouldResetStack?: boolean }
  | { type: "goBack" }
  | { type: "rendered" }
  | { type: "ready" };
