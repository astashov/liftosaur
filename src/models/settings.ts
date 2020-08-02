import { TPlate, TBars, IBars, IPlate } from "./weight";
import * as t from "io-ts";
import { IArrayElement } from "../utils/types";

export const units = ["kg", "lb"] as const;

export const TUnit = t.keyof(
  units.reduce<Record<IArrayElement<typeof units>, null>>((memo, excerciseType) => {
    memo[excerciseType] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof units>, null>),
  "TUnit"
);

export type IUnit = t.TypeOf<typeof TUnit>;

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
    plates: t.record(TUnit, t.array(TPlate)),
    bars: t.record(TUnit, TBars),
    units: TUnit,
  },
  "TSettings"
);

export type ISettings = t.TypeOf<typeof TSettings>;

export namespace Settings {
  export function plates(settings: ISettings): IPlate[] {
    return settings.plates[settings.units];
  }

  export function bars(settings: ISettings): IBars {
    return settings.bars[settings.units];
  }
}
