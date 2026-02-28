import { UrlUtils_build } from "./url";

export function Platform_isiOS(userAgent?: string): boolean {
  userAgent = userAgent || (typeof window !== "undefined" && window.navigator ? window.navigator.userAgent : "");
  return /iPhone|iPad|iPod/i.test(userAgent);
}

export function Platform_isAndroid(userAgent?: string): boolean {
  userAgent = userAgent || (typeof window !== "undefined" && window.navigator ? window.navigator.userAgent : "");
  return /Android/i.test(userAgent);
}

export function Platform_onelink(noparams: boolean, type?: "ios" | "android"): string {
  const url = UrlUtils_build("https://liftosaur.onelink.me/cG8a/aylyqael");
  let afr: string | undefined = undefined;
  if (type) {
    afr =
      type === "ios"
        ? "https://apps.apple.com/us/app/liftosaur-scriptable-workouts/id1661880849"
        : "https://play.google.com/store/apps/details?id=com.liftosaur.www.twa";
  }
  if (typeof window !== "undefined" && !noparams) {
    const currentSearchParams = new URL(window.location.href).searchParams;
    const utmSource = currentSearchParams?.get("utm_source") ?? window.localStorage?.getItem("utm_source");
    if (utmSource) {
      url.searchParams.set("utm_source", utmSource);
      url.searchParams.set("pid", `${utmSource}_int`);
    }
    const utmMedium = currentSearchParams?.get("utm_medium") ?? window.localStorage?.getItem("utm_medium");
    if (utmMedium) {
      url.searchParams.set("utm_medium", utmMedium);
      url.searchParams.set("af_channel", utmMedium);
    }
    const utmCampaign = currentSearchParams?.get("utm_campaign") ?? window.localStorage?.getItem("utm_campaign");
    if (utmCampaign) {
      url.searchParams.set("utm_campaign", utmCampaign);
      url.searchParams.set("c", utmCampaign);
    }
    const utmContent = currentSearchParams?.get("utm_content") ?? window.localStorage?.getItem("utm_content");
    if (utmContent) {
      url.searchParams.set("utm_content", utmContent);
      url.searchParams.set("af_ad", utmContent);
    }
    const utmTerm = currentSearchParams?.get("utm_term") ?? window.localStorage?.getItem("utm_term");
    if (utmTerm) {
      url.searchParams.set("utm_term", utmTerm);
      url.searchParams.set("af_adset", utmTerm);
    }
    if (afr) {
      url.searchParams.set("af_r", afr);
    }
  }
  return url.toString();
}
