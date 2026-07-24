export type IConsentMode = "optin" | "optout" | "none";

export interface IConsentCategories {
  analytics: boolean;
  advertising: boolean;
}

export interface IConsentDecision extends IConsentCategories {
  needsBanner: boolean;
}

interface IStoredConsent extends IConsentCategories {
  v: number;
  ts: number;
}

const STORAGE_KEY = "lft_consent_v1";
const GEO_CACHE_KEY = "lft_consent_geo";
const CONSENT_VERSION = 1;
const GEO_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

export function Consent_getStored(): IConsentCategories | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as IStoredConsent;
    if (parsed.v !== CONSENT_VERSION) {
      return undefined;
    }
    return { analytics: !!parsed.analytics, advertising: !!parsed.advertising };
  } catch {
    return undefined;
  }
}

export function Consent_store(categories: IConsentCategories): void {
  try {
    const value: IStoredConsent = { v: CONSENT_VERSION, ts: Date.now(), ...categories };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore - storage may be unavailable (private mode); consent just won't persist
  }
}

export function Consent_hasGPC(): boolean {
  return (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export async function Consent_getMode(): Promise<IConsentMode> {
  try {
    const cachedRaw = window.localStorage.getItem(GEO_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as { mode: IConsentMode; ts: number };
      if (Date.now() - cached.ts < GEO_CACHE_MS) {
        return cached.mode;
      }
    }
  } catch {
    // fall through to fetch
  }
  try {
    const res = await fetch("/api/geo", { credentials: "omit" });
    const json = (await res.json()) as { consentMode: IConsentMode };
    const mode = json.consentMode === "optin" || json.consentMode === "none" ? json.consentMode : "optout";
    try {
      window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ mode, ts: Date.now() }));
    } catch {
      // ignore
    }
    return mode;
  } catch {
    return "optout";
  }
}

export function Consent_resolve(
  mode: IConsentMode,
  stored: IConsentCategories | undefined,
  gpc: boolean
): IConsentDecision {
  if (stored) {
    return { analytics: stored.analytics, advertising: stored.advertising && !gpc, needsBanner: false };
  }
  if (mode === "optin") {
    return { analytics: false, advertising: false, needsBanner: true };
  }
  // optout / none: trackers default on, but GPC opts out of advertising and no banner blocks the page.
  return { analytics: true, advertising: !gpc, needsBanner: false };
}
