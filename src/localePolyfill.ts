if (typeof navigator !== "undefined" && navigator.language) {
  const originalLanguage = navigator.language;
  const sanitizedLanguage = originalLanguage.replace(/@.*$/, "");

  if (originalLanguage !== sanitizedLanguage) {
    Object.defineProperty(navigator, "language", {
      get: () => sanitizedLanguage,
      configurable: true,
    });
  }
}
