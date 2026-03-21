export function ReactNativeUtils_isWebViewMode(): boolean {
  return typeof window !== "undefined" && !!new URLSearchParams(window.location?.search).get("webviewmode");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ReactNativeUtils_postToRN(msg: Record<string, any>): void {
  if (typeof window !== "undefined" && window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }
}
