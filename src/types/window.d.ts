// eslint-disable-next-line @typescript-eslint/naming-convention
interface Window {
  _webpushrScriptReady: () => void;
  webpushr: (name: "fetch_id", fn: (sid: number) => void) => void;
}
