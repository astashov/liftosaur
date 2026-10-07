import fr from "./fr.json";

export type ILanguage = "en" | "fr";
export type ILanguagePreference = ILanguage | "system";
export type ITranslationKey = keyof typeof fr;
export type ITranslationParams = Record<string, string | number>;
export type ITranslator = (key: ITranslationKey, params?: ITranslationParams) => string;

// Missing settings in existing backups follow the device language; unsupported locales use English.
export function I18n_resolveLanguage(preference?: string, deviceLocales: readonly string[] = []): ILanguage {
  if (preference === "en" || preference === "fr") {
    return preference;
  }
  const primaryLocale = deviceLocales[0]?.toLowerCase().split(/[-_]/)[0];
  return primaryLocale === "fr" ? "fr" : "en";
}

export function I18n_translate(language: ILanguage, key: string, params: ITranslationParams = {}): string {
  const message = language === "fr" && Object.prototype.hasOwnProperty.call(fr, key) ? fr[key as ITranslationKey] : key;
  // Replace only named tokens, never evaluate or escape program/user content.
  return message.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : token
  );
}

export function I18n_createTranslator(language: ILanguage): ITranslator {
  return (key, params) => I18n_translate(language, key, params);
}
