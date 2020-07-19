/* eslint-disable @typescript-eslint/no-explicit-any */

import { IStorage } from "../ducks/reducer";
import deepmerge from "deepmerge";
import * as The5314BProgram from "../models/programs/the5314bProgram";
import { lf } from "../utils/lens";

export const migrations = {
  "20200422101500_add_history_record_timestamps": (aStorage: IStorage): IStorage => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    const now = Date.now();
    storage.history.forEach((record) => {
      record.startTime = record.startTime ?? now;
      record.endTime = record.endTime ?? now;
      record.entries.forEach((entry) => {
        entry.sets.forEach((set) => {
          set.timestamp = set.timestamp ?? now;
        });
      });
    });
    return storage;
  },
  "20200503211300_add_accessories_to_5314b_state": (aStorage: IStorage): IStorage => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    storage.programStates.the5314b = deepmerge(
      The5314BProgram.getInitialState(),
      storage.programStates.the5314b || {},
      {
        arrayMerge: (destinationArray, sourceArray, options) => sourceArray,
      }
    );
    return storage;
  },
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
