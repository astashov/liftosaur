import { IEither } from "./types";

export class UrlUtils {
  public static build(url: string, base?: string | URL): URL {
    if (base != null) {
      base = base.toString().replace("liftosaur://", "https://");
    }
    try {
      return new URL(url, base);
    } catch (e) {
      let json: string | undefined;
      try {
        json = JSON.stringify(url);
      } catch {}
      throw new TypeError(`Failed to construct URL: ${json || url}`);
    }
  }

  public static buildSafe(url: string, base?: string | URL): IEither<URL, string> {
    try {
      return { success: true, data: this.build(url, base) };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
