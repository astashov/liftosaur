import { useEffect } from "react";
import { Rem_set } from "./useRem";
import { useOsFontScale, OsFontScale_get } from "./fontScale";
import { Settings_getTextSize } from "../models/settings";
import { ISettings } from "../types";

export function TextSize_apply(size: number): void {
  Rem_set(size);
}

export function TextSize_resolve(settings: ISettings): number {
  return Settings_getTextSize(settings, OsFontScale_get());
}

// useOsFontScale re-renders when the device font-size setting changes, so an unset textSize
// keeps following the OS for the whole session rather than only at boot.
export function useAppliedTextSize(settings: ISettings): void {
  const size = Settings_getTextSize(settings, useOsFontScale());
  useEffect(() => {
    TextSize_apply(size);
  }, [size]);
}
