import "mocha";
import { expect } from "chai";
import { Storage_getDefault, Storage_fillVersions, Storage_updateVersions } from "../src/models/storage";
import { History_deleteRecords } from "../src/models/history";
import {
  ImportSession_apply,
  ImportSession_findEditedRecordIds,
  ImportSession_undo,
} from "../src/models/importSession";
import { ICollectionVersions } from "../src/models/versionTracker";
import { ICustomExercise, IHistoryEntry, IHistoryRecord, IImportSession, IStorage } from "../src/types";

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

function buildCustomExercise(id: string, name?: string): ICustomExercise {
  return {
    vtype: "custom_exercise",
    id,
    name: name ?? id,
    isDeleted: false,
    meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [] },
  };
}

function buildSession(overrides: Partial<IImportSession> = {}): IImportSession {
  return {
    vtype: "import_session",
    id: "session1",
    timestamp: 1000,
    source: "hevy",
    historyRecordIds: [],
    customExerciseIds: [],
    workoutCount: 0,
    ...overrides,
  };
}

function buildStorage(overrides: Partial<IStorage> = {}): IStorage {
  return { ...Storage_getDefault(), ...overrides };
}

describe("History_deleteRecords", () => {
  it("removes the given records", () => {
    const storage = buildStorage({ history: [buildRecord(100), buildRecord(200), buildRecord(300)] });
    const result = History_deleteRecords(storage, [100, 300]);
    expect(result.history.map((r) => r.id)).to.eql([200]);
  });

  it("is a no-op for ids not in history", () => {
    const storage = buildStorage({ history: [buildRecord(100)] });
    const result = History_deleteRecords(storage, [200]);
    expect(result.history.map((r) => r.id)).to.eql([100]);
  });

  // History_deleteRecords intentionally does NOT write tombstones - the VersionTracker does that on
  // the storage diff (the reducer runs Storage_updateVersions on every change). Verify that guarantee.
  it("removed records get tombstoned by the version tracker on the storage diff", () => {
    const before = Storage_fillVersions(buildStorage({ history: [buildRecord(100), buildRecord(200)] }), "device1");
    const after = History_deleteRecords(before, [200]);
    const versions = Storage_updateVersions(before, after, "device1");
    const deleted = (versions.history as ICollectionVersions | undefined)?.deleted ?? {};
    expect(Object.keys(deleted)).to.eql(["200"]);
    expect(deleted["200"]).to.be.a("number");
  });
});

describe("ImportSession_undo", () => {
  it("removes exactly the receipt's records and the receipt itself", () => {
    const session = buildSession({ historyRecordIds: [200, 300], workoutCount: 2 });
    const storage = buildStorage({
      history: [buildRecord(100), buildRecord(200), buildRecord(300)],
      importSessions: [session],
    });
    const result = ImportSession_undo(storage, "session1");
    expect(result).to.not.equal(undefined);
    expect(result!.history.map((r) => r.id)).to.eql([100]);
    expect(result!.importSessions).to.eql([]);
  });

  it("its removed records get tombstoned via the version tracker", () => {
    const session = buildSession({ historyRecordIds: [200, 300], workoutCount: 2 });
    const before = Storage_fillVersions(
      buildStorage({
        history: [buildRecord(100), buildRecord(200), buildRecord(300)],
        importSessions: [session],
      }),
      "device1"
    );
    const after = ImportSession_undo(before, "session1")!;
    const versions = Storage_updateVersions(before, after, "device1");
    const deleted = (versions.history as ICollectionVersions | undefined)?.deleted ?? {};
    expect(Object.keys(deleted).sort()).to.eql(["200", "300"]);
  });

  it("returns undefined for unknown session id", () => {
    const storage = buildStorage({ importSessions: [buildSession()] });
    expect(ImportSession_undo(storage, "nope")).to.equal(undefined);
  });

  it("tolerates records already deleted by hand", () => {
    const session = buildSession({ historyRecordIds: [200, 300], workoutCount: 2 });
    const storage = buildStorage({
      history: [buildRecord(100), buildRecord(300)],
      importSessions: [session],
    });
    const result = ImportSession_undo(storage, "session1");
    expect(result!.history.map((r) => r.id)).to.eql([100]);
  });

  it("soft-deletes unreferenced custom exercises, keeps referenced ones", () => {
    const session = buildSession({
      historyRecordIds: [200],
      customExerciseIds: ["importedused", "importedunused"],
    });
    const storage = buildStorage({
      history: [
        buildRecord(100, { entries: [buildEntry("importedused")] }),
        buildRecord(200, { entries: [buildEntry("importedused"), buildEntry("importedunused")] }),
      ],
      importSessions: [session],
    });
    storage.settings = {
      ...storage.settings,
      exercises: {
        importedused: buildCustomExercise("importedused"),
        importedunused: buildCustomExercise("importedunused"),
      },
    };
    const result = ImportSession_undo(storage, "session1");
    expect(result!.settings.exercises.importedused?.isDeleted).to.equal(false);
    expect(result!.settings.exercises.importedunused?.isDeleted).to.equal(true);
  });

  it("keeps custom exercises referenced by a program", () => {
    const session = buildSession({ historyRecordIds: [200], customExerciseIds: ["myspecialcurl"] });
    const storage = buildStorage({
      history: [buildRecord(200, { entries: [buildEntry("myspecialcurl")] })],
      importSessions: [session],
    });
    storage.settings = {
      ...storage.settings,
      exercises: { myspecialcurl: buildCustomExercise("myspecialcurl", "My Special Curl") },
    };
    storage.programs = [
      {
        ...storage.programs[0],
        vtype: "program",
        id: "p1",
        name: "P1",
        url: "",
        author: "",
        shortDescription: "",
        description: "",
        nextDay: 1,
        weeks: [],
        days: [],
        exercises: [],
        tags: [],
        planner: {
          vtype: "planner",
          name: "P1",
          weeks: [
            {
              name: "Week 1",
              days: [{ name: "Day 1", exerciseText: "My Special Curl / 3x10" }],
            },
          ],
        },
      },
    ];
    const result = ImportSession_undo(storage, "session1");
    expect(result!.settings.exercises.myspecialcurl?.isDeleted).to.equal(false);
  });
});

describe("ImportSession_findEditedRecordIds", () => {
  it("finds records edited after the import", () => {
    const session = buildSession({ historyRecordIds: [200, 300], timestamp: 1000 });
    const storage = buildStorage({
      history: [buildRecord(100, { updatedAt: 5000 }), buildRecord(200, { updatedAt: 5000 }), buildRecord(300)],
    });
    expect(ImportSession_findEditedRecordIds(storage, session)).to.eql([200]);
  });
});

describe("round trip: apply then undo", () => {
  it("returns history to the original set", () => {
    const original = buildStorage({ history: [buildRecord(100)] });
    const applied = ImportSession_apply(
      original,
      [buildRecord(200), buildRecord(300)],
      { newex: buildCustomExercise("newex") },
      "hevy"
    );
    const imported: IStorage = {
      ...original,
      history: applied.history,
      settings: { ...original.settings, exercises: applied.exercises },
      importSessions: applied.importSessions,
    };
    const result = ImportSession_undo(imported, applied.importSessions[0].id);
    expect(result!.history.map((r) => r.id)).to.eql([100]);
    expect(result!.settings.exercises.newex?.isDeleted).to.equal(true);
    expect(result!.importSessions).to.eql([]);
  });
});
