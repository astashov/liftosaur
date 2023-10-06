export class UrlUtils {
  public static build(url: string, base?: string | URL): URL {
    try {
      return new URL(url, base);
    } catch (e) {
      throw new TypeError(`Failed to construct URL: ${url}`);
    }
  }
}
