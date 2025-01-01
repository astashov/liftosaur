import { lb } from "lens-shmens";
import { IDispatch } from "./ducks/types";
import { updateSettings } from "./models/state";
import { ISettings, IUnit } from "./types";

export const lensRegistry = {
  setUnitsSetting: (dispatch: IDispatch, unit: IUnit) => {
    return updateSettings(dispatch, lb<ISettings>().p("units").record(unit));
  },
} as const;
