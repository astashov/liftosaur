import { IPlate, IBars } from "./weight";

export interface ISettings {
  timers: ISettingsTimers;
  plates: IPlate[];
  bars: IBars;
}

export interface ISettingsTimers {
  warmup: number | null;
  workout: number | null;
}
