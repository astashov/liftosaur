import "mocha";
import { expect } from "chai";
import {
  Storage_getDefault,
  Storage_validate,
  Storage_fillVersions,
  Storage_updateVersions,
  Storage_mergeStorage,
} from "../src/models/storage";
import { ImportSession_apply } from "../src/models/importSession";
import { ImportUtils_customExercisesForRecords } from "../src/utils/importTypes";
import { ICustomExercise, IHistoryEntry, IHistoryRecord, IImportSession, IStorage, VStorage } from "../src/types";

function buildRecord(id: number, overrides: Partial<IHistoryRecord> = {}): IHistoryRecord {
  return {
    vtype: "history_record",
    date: new Date(id).toISOString(),
    programId: "emptyprogram",
    programName: "Adhoc",
    day: 1,
    dayName: "Workout",
    entries: [],
    startTime: id,
    id,
    ...overrides,
  };
}

function buildCustomExercise(id: string): ICustomExercise {
  return {
    vtype: "custom_exercise",
    id,
    name: id,
    isDeleted: false,
    meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [] },
  };
}

function buildStorage(overrides: Partial<IStorage> = {}): IStorage {
  return { ...Storage_getDefault(), ...overrides };
}

function buildSession(overrides: Partial<IImportSession> = {}): IImportSession {
  return {
    vtype: "import_session",
    id: "abcd1234",
    timestamp: 1717804800000,
    source: "hevy",
    historyRecordIds: [1717804800123, 1717804800456],
    customExerciseIds: ["customex1"],
    workoutCount: 2,
    ...overrides,
  };
}

describe("importSessions storage field", () => {
  it("validates storage without importSessions", () => {
    const result = Storage_validate(Storage_getDefault(), VStorage, "storage");
    expect(result.success).to.equal(true);
  });

  it("validates storage with valid importSessions", () => {
    const storage = {
      ...Storage_getDefault(),
      importSessions: [buildSession(), buildSession({ source: "liftosaurCsv" })],
    };
    const result = Storage_validate(storage, VStorage, "storage");
    expect(result.success).to.equal(true);
    if (result.success) {
      const sessions = (result.data as { importSessions?: IImportSession[] }).importSessions;
      expect(sessions).to.have.length(2);
      expect(sessions?.[0].historyRecordIds).to.eql([1717804800123, 1717804800456]);
    }
  });

  it("rejects malformed import session objects", () => {
    const storage = {
      ...Storage_getDefault(),
      importSessions: [{ ...buildSession(), source: "strong", historyRecordIds: ["not-a-number"] }],
    };
    const result = Storage_validate(storage, VStorage, "storage");
    expect(result.success).to.equal(false);
  });
});

describe("ImportSession_apply", () => {
  it("merges records and captures a receipt of added ids", () => {
    const storage = buildStorage({ history: [buildRecord(100)] });
    const applied = ImportSession_apply(storage, [buildRecord(200), buildRecord(300)], {}, "hevy");
    expect(applied.history.map((r) => r.id)).to.eql([100, 200, 300]);
    const session = applied.importSessions[0];
    expect(session.source).to.equal("hevy");
    expect(session.historyRecordIds).to.eql([200, 300]);
    expect(session.workoutCount).to.equal(2);
    expect(session.customExerciseIds).to.eql([]);
  });

  it("does not claim records dropped by id collision with existing history", () => {
    const storage = buildStorage({ history: [buildRecord(100), buildRecord(200)] });
    const applied = ImportSession_apply(
      storage,
      [buildRecord(200, { dayName: "Imported" }), buildRecord(300)],
      {},
      "liftosaurCsv"
    );
    expect(applied.history.map((r) => r.id)).to.eql([100, 200, 300]);
    expect(applied.history.find((r) => r.id === 200)?.dayName).to.equal("Workout");
    expect(applied.importSessions[0].historyRecordIds).to.eql([300]);
  });

  it("does not double-count within-import id collisions", () => {
    const storage = buildStorage();
    const applied = ImportSession_apply(storage, [buildRecord(200), buildRecord(200)], {}, "hevy");
    expect(applied.history.map((r) => r.id)).to.eql([200]);
    expect(applied.importSessions[0].historyRecordIds).to.eql([200]);
  });

  it("only claims newly-created custom exercises", () => {
    const storage = buildStorage();
    storage.settings = { ...storage.settings, exercises: { existingex: buildCustomExercise("existingex") } };
    const applied = ImportSession_apply(
      storage,
      [],
      { existingex: buildCustomExercise("existingex"), newex: buildCustomExercise("newex") },
      "hevy"
    );
    expect(applied.importSessions[0].customExerciseIds).to.eql(["newex"]);
    expect(Object.keys(applied.exercises)).to.have.members(["existingex", "newex"]);
  });

  it("does not overwrite an existing custom exercise that was renamed locally", () => {
    const storage = buildStorage();
    const renamed = { ...buildCustomExercise("flye"), name: "My Cable Flye" };
    storage.settings = { ...storage.settings, exercises: { flye: renamed } };
    const applied = ImportSession_apply(
      storage,
      [],
      { flye: { ...buildCustomExercise("flye"), name: "My Custom Flye" } },
      "liftosaurCsv"
    );
    expect(applied.exercises.flye?.name).to.equal("My Cable Flye");
    expect(applied.importSessions[0].customExerciseIds).to.eql([]);
  });

  it("caps importSessions at 5, dropping oldest", () => {
    let storage = buildStorage();
    for (let i = 0; i < 6; i += 1) {
      const applied = ImportSession_apply(storage, [buildRecord(100 + i)], {}, "hevy");
      storage = {
        ...storage,
        history: applied.history,
        settings: { ...storage.settings, exercises: applied.exercises },
        importSessions: applied.importSessions,
      };
    }
    expect(storage.importSessions).to.have.length(5);
    expect(storage.importSessions?.map((s) => s.historyRecordIds[0])).to.eql([101, 102, 103, 104, 105]);
  });
});

describe("importSessions convergence under concurrent imports", () => {
  function importOnDevice(base: IStorage, deviceId: string, session: IImportSession, record: IHistoryRecord): IStorage {
    const newStorage: IStorage = {
      ...base,
      history: base.history.concat([record]),
      importSessions: [...(base.importSessions ?? []), session],
    };
    return { ...newStorage, _versions: Storage_updateVersions(base, newStorage, deviceId) };
  }

  it("keeps both receipts when two devices import before syncing", () => {
    const base = Storage_fillVersions(buildStorage({ history: [buildRecord(100)] }), "device0");

    const deviceA = importOnDevice(
      base,
      "deviceA",
      buildSession({ id: "sessionA", historyRecordIds: [200] }),
      buildRecord(200)
    );
    const deviceB = importOnDevice(
      base,
      "deviceB",
      buildSession({ id: "sessionB", historyRecordIds: [300] }),
      buildRecord(300)
    );

    const merged = Storage_mergeStorage(deviceA, deviceB, "deviceA");

    expect((merged.importSessions ?? []).map((s) => s.id).sort()).to.eql(["sessionA", "sessionB"]);
    expect(merged.history.map((r) => r.id).sort((a, b) => a - b)).to.eql([100, 200, 300]);
  });
});

describe("ImportUtils_customExercisesForRecords", () => {
  function buildEntry(exerciseId: string): IHistoryEntry {
    return {
      vtype: "history_entry",
      id: exerciseId,
      index: 0,
      exercise: { id: exerciseId },
      sets: [],
      warmupSets: [],
    };
  }

  it("keeps only custom exercises referenced by the given records", () => {
    const records = [buildRecord(1, { entries: [buildEntry("kept")] })];
    const customExercises = { kept: buildCustomExercise("kept"), dropped: buildCustomExercise("dropped") };
    const result = ImportUtils_customExercisesForRecords(records, customExercises);
    expect(Object.keys(result)).to.eql(["kept"]);
  });

  it("returns empty when no records reference any custom exercise", () => {
    const records = [buildRecord(1, { entries: [buildEntry("builtin")] })];
    const result = ImportUtils_customExercisesForRecords(records, { custom: buildCustomExercise("custom") });
    expect(result).to.eql({});
  });
});
