import { IStorage } from "../ducks/reducer";

export const migrations = {
  "202004221015_add_history_record_timestamps": (aStorage: IStorage): IStorage => {
    const storage: IStorage = JSON.parse(JSON.stringify(aStorage));
    const now = Date.now();
    storage.history.forEach(record => {
      record.startTime = record.startTime ?? now;
      record.endTime = record.endTime ?? now;
      record.entries.forEach(entry => {
        entry.sets.forEach(set => {
          set.timestamp = set.timestamp ?? now;
        });
      });
    });
    return storage;
  }
};
