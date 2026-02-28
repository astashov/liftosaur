import { IEither } from "./types";
import { URLPolyfill } from "./urlPolyfill";

// Check if native URL is available (not available in QuickJS on watchOS)
const URLConstructor: typeof URL = typeof URL !== "undefined" ? URL : (URLPolyfill as unknown as typeof URL);

export function UrlUtils_build(url: string, base?: string | URL): URL {
  if (base != null) {
    base = base.toString().replace("liftosaur://", "https://");
  }
  try {
    return new URLConstructor(url, base);
  } catch (e) {
    let json: string | undefined;
    try {
      json = JSON.stringify(url);
    } catch {}
    throw new TypeError(`Failed to construct URL: ${json || url}`);
  }
}

export function UrlUtils_buildSafe(url: string, base?: string | URL): IEither<URL, string> {
  try {
    return { success: true, data: UrlUtils_build(url, base) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
