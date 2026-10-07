import { createContext, useContext, useEffect, useMemo, type JSX, type ReactNode } from "react";
import { I18n_createTranslator, I18n_resolveLanguage, type ILanguage, type ILanguagePreference } from "./index";
import { I18n_deviceLocales } from "./deviceLocales";

const LanguageContext = createContext<ILanguage>("en");

const I18nContext = createContext(I18n_createTranslator("en"));

export function I18nProvider(props: { language?: ILanguagePreference; children: ReactNode }): JSX.Element {
  const language = I18n_resolveLanguage(props.language, I18n_deviceLocales());
  const translate = useMemo(() => I18n_createTranslator(language), [language]);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement?.setAttribute("lang", language);
    }
  }, [language]);
  return (
    <LanguageContext.Provider value={language}>
      <I18nContext.Provider value={translate}>{props.children}</I18nContext.Provider>
    </LanguageContext.Provider>
  );
}

// Context updates also reach memoized screens that intentionally untrack app settings.
export function useTranslation(): ReturnType<typeof I18n_createTranslator> {
  return useContext(I18nContext);
}

export function useLanguage(): ILanguage {
  return useContext(LanguageContext);
}
