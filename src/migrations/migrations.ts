/* eslint-disable @typescript-eslint/no-explicit-any */

import { IStorage } from "../ducks/reducer";
import { lf } from "../utils/lens";

export const migrations = {
  "20200604235900_add_bar_weights": (aStorage: IStorage): IStorage => {
    return lf(aStorage).p("settings").p("bars").set({
      barbell: 45,
      dumbbell: 10,
      ezbar: 20,
    });
  },
  "20200609000400_remove_old_amraps": (aStorage: IStorage): IStorage => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.history.forEach((record) => {
      record.entries.forEach((entry) => {
        entry.sets.forEach((set) => {
          if ((set.reps as unknown) === "amrap") {
            set.isAmrap = true;
            set.reps = 1;
          }
        });
      });
    });
    return storage;
  },
  "20200717000000_upgrade_programs": (aStorage: IStorage): IStorage => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    (storage.programs || []).forEach((program) => {
      program.state = program.state || (program as any).initialState;
      program.internalState = program.internalState || { nextDay: 1 };
    });
    return storage;
  },
};
