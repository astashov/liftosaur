export function I18n_deviceLocales(): readonly string[] {
  return typeof navigator === "undefined"
    ? []
    : navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
}
