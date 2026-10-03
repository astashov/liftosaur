import { useEffect, useState } from "react";

function darkSchemeQuery(): MediaQueryList | undefined {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : undefined;
}

export function Theme_system(): "dark" | "light" {
  return darkSchemeQuery()?.matches ? "dark" : "light";
}

export function useSystemTheme(): "dark" | "light" {
  const [theme, setTheme] = useState(Theme_system);
  useEffect(() => {
    const query = darkSchemeQuery();
    if (query == null) {
      return undefined;
    }
    const onChange = (): void => setTheme(Theme_system());
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return theme;
}

export function Theme_apply(theme: "dark" | "light" | undefined): void {
  const root = document.documentElement;
  if ((theme ?? Theme_system()) === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}
