import { IPlate } from "./weight";

export interface ISettings {
  timers: ISettingsTimers;
  plates: IPlate[];
}

export interface ISettingsTimers {
  warmup: number | null;
  workout: number | null;
}
