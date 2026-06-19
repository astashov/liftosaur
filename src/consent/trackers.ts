// Activates the trackers held back until consent. gtag's library is always loaded (with Consent Mode
// defaulted to denied in the page head), so consent is a gtag "update". Analytics covers GA and the
// first-party landing-page cookie; advertising covers the Reddit pixel, Google Ads signals, and UTM.

import { IConsentCategories } from "./consent";

interface IGtagWindow {
  gtag?: (...args: unknown[]) => void;
  rdt?: (...args: unknown[]) => void;
}

export function Trackers_applyAnalytics(granted: boolean): void {
  const w = window as unknown as IGtagWindow;
  if (!granted) {
    return;
  }
  if (w.gtag) {
    w.gtag("consent", "update", { analytics_storage: "granted" });
  }
  setLandingPageCookie();
}

let redditLoaded = false;

function loadRedditPixel(): void {
  if (redditLoaded) {
    return;
  }
  redditLoaded = true;
  const w = window as unknown as IGtagWindow;
  const d = document;
  if (!w.rdt) {
    const p = (w.rdt = function (...args: unknown[]): void {
      const rdt = w.rdt as unknown as { sendEvent?: (...a: unknown[]) => void; callQueue: unknown[] };
      if (rdt.sendEvent) {
        rdt.sendEvent.apply(rdt, args);
      } else {
        rdt.callQueue.push(args);
      }
    });
    (p as unknown as { callQueue: unknown[] }).callQueue = [];
    const t = d.createElement("script");
    t.src = "https://www.redditstatic.com/ads/pixel.js";
    t.async = true;
    const s = d.getElementsByTagName("script")[0];
    s.parentNode?.insertBefore(t, s);
  }
  w.rdt?.("init", "t2_hoob2");
  w.rdt?.("track", "PageVisit");
}

function setLandingPageCookie(): void {
  try {
    if (/(?:^|;\s*)lft_landing=/.test(document.cookie)) {
      return;
    }
    const path = window.location.pathname || "/";
    document.cookie =
      "lft_landing=" + encodeURIComponent(path) + "; path=/; domain=.liftosaur.com; max-age=31536000; samesite=lax";
  } catch {
    // ignore
  }
}

function storeUtm(): void {
  try {
    const params = new URL(window.location.href).searchParams;
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((param) => {
      const value = params.get(param);
      if (value) {
        window.localStorage.setItem(param, value);
      }
    });
  } catch {
    // ignore
  }
}

export function Trackers_applyAdvertising(granted: boolean): void {
  const w = window as unknown as IGtagWindow;
  if (!granted) {
    return;
  }
  if (w.gtag) {
    w.gtag("consent", "update", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  }
  loadRedditPixel();
  storeUtm();
}

// Syncs only gtag's Consent Mode signals to the stored categories, without loading any of the other
// trackers. Used on /app, which has gtag but never had the Reddit pixel / landing cookie / UTM, so we
// respect the saved choice there without expanding what /app tracks (and without a banner).
export function Trackers_applyGtagConsent(categories: IConsentCategories): void {
  const w = window as unknown as IGtagWindow;
  if (!w.gtag) {
    return;
  }
  w.gtag("consent", "update", {
    analytics_storage: categories.analytics ? "granted" : "denied",
    ad_storage: categories.advertising ? "granted" : "denied",
    ad_user_data: categories.advertising ? "granted" : "denied",
    ad_personalization: categories.advertising ? "granted" : "denied",
  });
}

// We can't read the domain/path a cookie was set with, so expire the name across the combos our
// trackers use (current host and the registrable domain, path /).
function expireCookie(name: string): void {
  const expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  const host = window.location.hostname;
  const domains = ["", host, "." + host, ".liftosaur.com"];
  for (const d of domains) {
    document.cookie = `${name}=; ${expires}; path=/` + (d ? `; domain=${d}` : "");
  }
}

function clearCookiesByPrefix(prefixes: string[]): void {
  const names = document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter(Boolean);
  for (const name of names) {
    if (prefixes.some((p) => name.startsWith(p))) {
      expireCookie(name);
    }
  }
}

// Deletes already-set cookies/storage for any category the user has now denied, so a revoke is a clean
// opt-out rather than just halting future tracking. (gtag goes back to denied on the next load.)
export function Trackers_revoke(categories: IConsentCategories): void {
  if (!categories.analytics) {
    clearCookiesByPrefix(["_ga", "_gid"]);
    expireCookie("lft_landing");
  }
  if (!categories.advertising) {
    clearCookiesByPrefix(["_gcl", "_rdt"]);
    try {
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) =>
        window.localStorage.removeItem(k)
      );
    } catch {
      // ignore
    }
  }
}
