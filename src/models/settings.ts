import { TPlate, TBars } from "./weight";
import * as t from "io-ts";

export const TSettingsTimers = t.type(
  {
    warmup: t.union([t.number, t.null]),
    workout: t.union([t.number, t.null]),
  },
  "TSettingsTimers"
);
export type ISettingsTimers = t.TypeOf<typeof TSettingsTimers>;

export const TSettings = t.type(
  {
    timers: TSettingsTimers,
    plates: t.array(TPlate),
    bars: TBars,
  },
  "TSettings"
);

export type ISettings = t.TypeOf<typeof TSettings>;
