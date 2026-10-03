import { Uniwind, useUniwind } from "uniwind";

export function Theme_system(): "dark" | "light" {
  return Uniwind.currentTheme === "dark" ? "dark" : "light";
}

export function useSystemTheme(): "dark" | "light" {
  return useUniwind().theme === "dark" ? "dark" : "light";
}

export function Theme_apply(theme: "dark" | "light" | undefined): void {
  // RN 0.84 caches "unspecified" as the scheme on every setColorScheme("unspecified") until the OS
  // sends a change, and Uniwind reads that as light. So never re-enter "system" mode.
  if (theme == null && Uniwind.hasAdaptiveThemes) {
    return;
  }
  Uniwind.setTheme(theme ?? "system");
}
