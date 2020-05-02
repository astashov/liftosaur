import { IPlate } from "./weight";
import { Lens } from "../utils/lens";

export interface ISettings {
  timers: ISettingsTimers;
  plates: IPlate[];
}

export interface ISettingsTimers {
  warmup: number | null;
  workout: number | null;
}

export namespace Settings {
  export const lens = {
    timers: new Lens<ISettings, ISettingsTimers>(
      s => s.timers,
      (s, timers) => ({ ...s, timers }),
      { from: "settings", to: "timers" }
    ),
    timersField: (field: keyof ISettingsTimers) =>
      new Lens<ISettingsTimers, number | null>(
        t => t[field],
        (t, v) => ({ ...t, [field]: v }),
        { from: "timers", to: field }
      ),
    plates: new Lens<ISettings, IPlate[]>(
      s => s.plates,
      (s, plates) => ({ ...s, plates }),
      { from: "settings", to: "plates" }
    )
  };
}
