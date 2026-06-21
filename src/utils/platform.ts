import { UrlUtils_build } from "./url";
import { SafeLocalStorage_getItem } from "./safeLocalStorage";

export function Platform_isiOS(userAgent?: string): boolean {
  userAgent = userAgent || (typeof window !== "undefined" && window.navigator ? window.navigator.userAgent : "");
  return /iPhone|iPad|iPod/i.test(userAgent);
}

export function Platform_isAndroid(userAgent?: string): boolean {
  userAgent = userAgent || (typeof window !== "undefined" && window.navigator ? window.navigator.userAgent : "");
  return /Android/i.test(userAgent);
}

export interface IOnelinkLandingParams {
  id: string;
  type: "program" | "exercise" | "rep-max";
}

// Identifies the SEO page a OneLink click originated from, so AppsFlyer can carry it through the
// install (deferred deep link) and the native app can attribute the install to that page. The `id`
// has no slashes on purpose - it goes into deep_link_value, and the native side reconstructs the path
// from id + type, keeping web-cookie and native landing pages in the same format.
export function Platform_landingPageParams(pathname: string): IOnelinkLandingParams | undefined {
  const programMatch = pathname.match(/^\/programs\/([^/]+)$/);
  if (programMatch) {
    return { id: programMatch[1], type: "program" };
  }
  const exerciseMatch = pathname.match(/^\/exercises\/([^/]+)$/);
  if (exerciseMatch) {
    return { id: exerciseMatch[1], type: "exercise" };
  }
  const repMaxMatch = pathname.match(/^\/([a-z-]*rep-max-calculator)$/);
  if (repMaxMatch) {
    return { id: repMaxMatch[1], type: "rep-max" };
  }
  return undefined;
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
    const utmSource = currentSearchParams?.get("utm_source") ?? SafeLocalStorage_getItem("utm_source");
    if (utmSource) {
      url.searchParams.set("utm_source", utmSource);
      url.searchParams.set("pid", `${utmSource}_int`);
    }
    const utmMedium = currentSearchParams?.get("utm_medium") ?? SafeLocalStorage_getItem("utm_medium");
    if (utmMedium) {
      url.searchParams.set("utm_medium", utmMedium);
      url.searchParams.set("af_channel", utmMedium);
    }
    const utmCampaign = currentSearchParams?.get("utm_campaign") ?? SafeLocalStorage_getItem("utm_campaign");
    if (utmCampaign) {
      url.searchParams.set("utm_campaign", utmCampaign);
      url.searchParams.set("c", utmCampaign);
    }
    const utmContent = currentSearchParams?.get("utm_content") ?? SafeLocalStorage_getItem("utm_content");
    if (utmContent) {
      url.searchParams.set("utm_content", utmContent);
      url.searchParams.set("af_ad", utmContent);
    }
    const utmTerm = currentSearchParams?.get("utm_term") ?? SafeLocalStorage_getItem("utm_term");
    if (utmTerm) {
      url.searchParams.set("utm_term", utmTerm);
      url.searchParams.set("af_adset", utmTerm);
    }
    const landing = Platform_landingPageParams(window.location.pathname);
    if (landing) {
      url.searchParams.set("deep_link_value", landing.id);
      url.searchParams.set("deep_link_sub1", landing.type);
      // Don't clobber a paid UTM source/campaign; only label as SEO when nothing else claimed it.
      if (!url.searchParams.has("pid")) {
        url.searchParams.set("pid", "seo");
      }
      if (!url.searchParams.has("c")) {
        url.searchParams.set("c", `${landing.type}-pages`);
      }
    }
    if (afr) {
      url.searchParams.set("af_r", afr);
    }
  }
  return url.toString();
}
