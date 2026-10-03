import { useEffect } from "react";
import { ISettings } from "../types";
import { SendMessage_toIosAndAndroid } from "./sendMessage";
import { Theme_apply, Theme_system, useSystemTheme } from "./theme";

export function AppliedTheme_get(settings: ISettings): "dark" | "light" {
  return settings.theme ?? Theme_system();
}

export function AppliedTheme_apply(theme: "dark" | "light" | undefined): void {
  Theme_apply(theme);
  SendMessage_toIosAndAndroid({ type: "theme", value: theme ?? Theme_system() });
}

export function useAppliedTheme(settings: ISettings): void {
  const systemTheme = useSystemTheme();
  useEffect(() => {
    AppliedTheme_apply(settings.theme);
  }, [settings.theme, systemTheme]);
}
