import { getLocales } from "react-native-localize";

export function I18n_deviceLocales(): readonly string[] {
  return getLocales().map((locale) => locale.languageTag);
}
