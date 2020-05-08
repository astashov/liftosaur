import { IStorage } from "../ducks/reducer";
import deepmerge from "deepmerge";
import * as The5314BProgram from "../models/programs/the5314bProgram";

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
};
