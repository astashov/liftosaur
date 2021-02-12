import { ISettings, IPlate, IBars } from "../types";

export namespace Settings {
  export function plates(settings: ISettings): IPlate[] {
    return settings.plates.filter((p) => p.weight.unit === settings.units);
  }

  export function bars(settings: ISettings): IBars {
    return settings.bars[settings.units];
  }
}
