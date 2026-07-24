export type IConsentMode = "optin" | "optout" | "none";

const EEA_AND_UK = new Set<string>([
  // EU 27
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  // EEA non-EU
  "IS",
  "LI",
  "NO",
  // UK
  "GB",
]);

const OPT_OUT_COUNTRIES = new Set<string>(["US"]);

export function ConsentMode_fromCountry(country: string | undefined | null): IConsentMode {
  if (!country) {
    return "optout";
  }
  const cc = country.toUpperCase();
  if (EEA_AND_UK.has(cc)) {
    return "optin";
  }
  if (OPT_OUT_COUNTRIES.has(cc)) {
    return "optout";
  }
  return "none";
}
