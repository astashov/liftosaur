import semanticColors from "../../tailwind.semantic.generated.json";
import { SafeLocalStorage_getItem, SafeLocalStorage_setItem } from "./safeLocalStorage";
import { Theme_apply } from "./theme";

export const PAGE_THEME_STORAGE_KEY = "liftosaurSiteTheme";

export function PageTheme_backgroundColor(theme: "dark" | "light"): string {
  return semanticColors[theme].background.default;
}

export function PageTheme_current(): "dark" | "light" {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function PageTheme_set(theme: "dark" | "light"): void {
  SafeLocalStorage_setItem(PAGE_THEME_STORAGE_KEY, theme);
  Theme_apply(theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", PageTheme_backgroundColor(theme));
}

export function PageTheme_toggle(): void {
  PageTheme_set(PageTheme_current() === "dark" ? "light" : "dark");
}

// Uniwind's web runtime rewrites the theme class on <html> from the system color scheme while it is
// being imported, so the stored choice has to be re-applied from the entry body, after that import.
export function PageTheme_restore(): void {
  const stored = SafeLocalStorage_getItem(PAGE_THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    PageTheme_set(stored);
  }
}
