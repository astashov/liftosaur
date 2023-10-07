export class UrlUtils {
  public static build(url: string, base?: string | URL): URL {
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
}
