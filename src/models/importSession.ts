import { IAllCustomExercises, ICustomExercise, IHistoryRecord, IImportSession, IStorage } from "../types";
import { CollectionUtils_sortBy, CollectionUtils_uniqBy } from "../utils/collection";
import { UidFactory_generateUid } from "../utils/generator";
import { Exercise_deleteCustomExercise } from "./exercise";
import { History_deleteRecords } from "./history";

const maxImportSessions = 5;

export interface IAppliedImport {
  history: IHistoryRecord[];
  exercises: IAllCustomExercises;
  importSessions: IImportSession[];
}

export function ImportSession_apply(
  storage: IStorage,
  historyRecords: IHistoryRecord[],
  customExercises: Record<string, ICustomExercise>,
  source: IImportSession["source"]
): IAppliedImport {
  const existingIds = new Set(storage.history.map((r) => r.id));
  const history = CollectionUtils_sortBy(CollectionUtils_uniqBy(storage.history.concat(historyRecords), "id"), "id");
  const addedHistoryIds = history.filter((r) => !existingIds.has(r.id)).map((r) => r.id);
  const addedCustomExerciseIds = Object.keys(customExercises).filter((k) => storage.settings.exercises[k] == null);
  // Only add custom exercises that don't already exist - an existing one with the same id may have
  // been renamed/edited locally, and overwriting it would be silent and unrecoverable (undo can't
  // restore it because it's excluded from the receipt as a pre-existing id).
  const exercises = { ...storage.settings.exercises };
  for (const id of addedCustomExerciseIds) {
    exercises[id] = customExercises[id];
  }
  const session: IImportSession = {
    vtype: "import_session",
    id: UidFactory_generateUid(8),
    timestamp: Date.now(),
    source,
    historyRecordIds: addedHistoryIds,
    customExerciseIds: addedCustomExerciseIds,
    workoutCount: addedHistoryIds.length,
  };
  return {
    history,
    exercises,
    importSessions: [...(storage.importSessions ?? []), session].slice(-maxImportSessions),
  };
}

export function ImportSession_findEditedRecordIds(storage: IStorage, session: IImportSession): number[] {
  const importedIds = new Set(session.historyRecordIds);
  return storage.history
    .filter((r) => importedIds.has(r.id) && r.updatedAt != null && r.updatedAt > session.timestamp)
    .map((r) => r.id);
}

export function ImportSession_undo(storage: IStorage, sessionId: string): IStorage | undefined {
  const session = (storage.importSessions ?? []).find((s) => s.id === sessionId);
  if (session == null) {
    return undefined;
  }
  const undone = History_deleteRecords(storage, session.historyRecordIds);
  let exercises = undone.settings.exercises;
  for (const exerciseId of session.customExerciseIds) {
    if (!isExerciseReferenced(undone, exerciseId)) {
      exercises = Exercise_deleteCustomExercise(exercises, exerciseId);
    }
  }
  return {
    ...undone,
    settings: { ...undone.settings, exercises },
    importSessions: (undone.importSessions ?? []).filter((s) => s.id !== sessionId),
  };
}

function isExerciseReferenced(storage: IStorage, exerciseId: string): boolean {
  const exercise = storage.settings.exercises[exerciseId];
  if (exercise == null) {
    return false;
  }
  if (storage.history.concat(storage.progress).some((r) => r.entries.some((e) => e.exercise.id === exerciseId))) {
    return true;
  }
  const name = exercise.name.toLowerCase();
  return storage.programs.some((p) =>
    (p.planner?.weeks ?? []).some((w) => w.days.some((d) => d.exerciseText.toLowerCase().includes(name)))
  );
}
