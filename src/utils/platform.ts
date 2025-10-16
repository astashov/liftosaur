import { UrlUtils } from "./url";

export class Platform {
  public static isiOS(userAgent?: string): boolean {
    userAgent = userAgent || (typeof window !== "undefined" && window.navigator ? window.navigator.userAgent : "");
    console.log(userAgent);
    return /iPhone|iPad|iPod/i.test(userAgent);
  }

  public static isAndroid(userAgent?: string): boolean {
    userAgent = userAgent || (typeof window !== "undefined" && window.navigator ? window.navigator.userAgent : "");
    console.log(userAgent);
    return /Android/i.test(userAgent);
  }

  public static onelink(): string {
    const url = UrlUtils.build("https://liftosaur.onelink.me/cG8a/aylyqael");
    if (typeof window !== "undefined") {
      const currentSearchParams = new URL(window.location.href).searchParams;
      const utmSource = currentSearchParams?.get("utm_source");
      if (utmSource) {
        url.searchParams.set("utm_source", utmSource);
      }
      const utmMedium = currentSearchParams?.get("utm_medium");
      if (utmMedium) {
        url.searchParams.set("utm_medium", utmMedium);
      }
      const utmCampaign = currentSearchParams?.get("utm_campaign");
      if (utmCampaign) {
        url.searchParams.set("utm_campaign", utmCampaign);
      }
      const utmContent = currentSearchParams?.get("utm_content");
      if (utmContent) {
        url.searchParams.set("utm_content", utmContent);
      }
      const utmTerm = currentSearchParams?.get("utm_term");
      if (utmTerm) {
        url.searchParams.set("utm_term", utmTerm);
      }
    }
    return url.toString();
  }
}
