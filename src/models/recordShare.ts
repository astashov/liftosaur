import { IExerciseDataValue, IHistoryRecord, ISettings } from "../types";

export function RecordShare_settingsWithoutNotes(settings: ISettings): ISettings {
  const exerciseData: Record<string, IExerciseDataValue | undefined> = {};
  for (const key of Object.keys(settings.exerciseData)) {
    const value = settings.exerciseData[key];
    exerciseData[key] = value != null ? { ...value, notes: undefined } : undefined;
  }
  return { ...settings, exerciseData };
}

export function RecordShare_withoutNotes(record: IHistoryRecord): IHistoryRecord {
  return {
    ...record,
    notes: undefined,
    entries: record.entries.map((entry) => ({ ...entry, notes: undefined })),
  };
}
