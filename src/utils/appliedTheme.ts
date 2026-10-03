import { useEffect } from "react";
import { ISettings } from "../types";
import { Theme_apply, Theme_system, useSystemTheme } from "./theme";

export function AppliedTheme_get(settings: ISettings): "dark" | "light" {
  return settings.theme ?? Theme_system();
}

export function useAppliedTheme(settings: ISettings): void {
  const systemTheme = useSystemTheme();
  useEffect(() => {
    Theme_apply(settings.theme);
  }, [settings.theme, systemTheme]);
}
