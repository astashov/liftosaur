import "mocha";
import { expect } from "chai";
import { LoginAdoptLocal_plan, LoginAdoptLocal_storage } from "../src/models/loginAdoptLocal";
import { Storage_fillVersions, Storage_getDefault } from "../src/models/storage";
import { Program_create } from "../src/models/program";
import { Sync_getStorageUpdate2 } from "../src/utils/sync";
import { VersionTracker } from "../src/models/versionTracker";
import { IHistoryRecord, IStorage, ISubscriptionReceipt, STORAGE_VERSION_TYPES } from "../src/types";

function historyRecord(id: number): IHistoryRecord {
  return {
    vtype: "history_record",
    date: "2026-11-01T10:00:00.000Z",
    programId: "p1",
    programName: "Program",
    day: 1,
    dayName: "Day 1",
    entries: [],
    startTime: id,
    id,
  };
}

function receipt(id: string): ISubscriptionReceipt {
  return { vtype: "subscription_receipt", id, value: `value-${id}`, createdAt: 1 };
}

const account = { userId: "cloudid", email: "a@b.c", key: "newkey" };
const now = 1_900_000_000_000;

function localStorage(): IStorage {
  const storage = { ...Storage_getDefault(), tempUserId: "localid", history: [historyRecord(1000)] };
  storage.settings = { ...storage.settings, units: "kg" };
  return Storage_fillVersions(storage, "phone");
}

function serverStorage(): IStorage {
  const storage = { ...Storage_getDefault(), tempUserId: "cloudid" };
  storage.settings = { ...storage.settings, units: "lb" };
  return Storage_fillVersions(storage, "web");
}

function uploadAndMerge(adopted: IStorage, server: IStorage): IStorage {
  const update = Sync_getStorageUpdate2(adopted, server._versions, "phone");
  const { _versions, ...serverFields } = server;
  const tracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "phone" });
  return tracker.mergeByVersions(serverFields, _versions || {}, update.versions || {}, update.storage || {});
}

function planFor(server: IStorage): string {
  return LoginAdoptLocal_plan({
    oldUserId: "localid",
    newUserId: "cloudid",
    adoption: "if-empty",
    local: localStorage(),
    server,
  });
}

describe("LoginAdoptLocal_plan freshness", () => {
  it("adopts a default storage with filled versions", () => {
    expect(planFor(serverStorage())).to.equal("adopt");
  });

  it("asks with a workout", () => {
    expect(planFor({ ...Storage_getDefault(), history: [historyRecord(1)] })).to.equal("conflict");
  });

  it("asks with a program", () => {
    expect(planFor({ ...Storage_getDefault(), programs: [Program_create("P")] })).to.equal("conflict");
  });

  it("asks with a body stat", () => {
    const storage = Storage_getDefault();
    storage.stats.weight.weight = [{ vtype: "stat", value: { value: 80, unit: "kg" }, timestamp: 1 }];
    expect(planFor(storage)).to.equal("conflict");
  });

  it("asks with a health stat", () => {
    const storage = Storage_getDefault();
    storage.stats.health = { sleep: [{ vtype: "stat", value: 480, timestamp: 1 }] };
    expect(planFor(storage)).to.equal("conflict");
  });

  it("replaces when the account already has every phone item", () => {
    expect(planFor({ ...Storage_getDefault(), history: [historyRecord(1000)] })).to.equal("replace");
  });

  it("replaces when adoption is not allowed, even with phone-only data", () => {
    expect(
      LoginAdoptLocal_plan({
        oldUserId: "localid",
        newUserId: "cloudid",
        adoption: "never",
        local: localStorage(),
        server: { ...Storage_getDefault(), history: [historyRecord(1)] },
      })
    ).to.equal("replace");
  });

  it("asks when the phone only has a program", () => {
    expect(
      LoginAdoptLocal_plan({
        oldUserId: "localid",
        newUserId: "cloudid",
        adoption: "if-empty",
        local: { ...Storage_getDefault(), programs: [Program_create("Phone")] },
        server: { ...Storage_getDefault(), history: [historyRecord(1)] },
      })
    ).to.equal("conflict");
  });
});

describe("LoginAdoptLocal_plan", () => {
  const empty = Storage_getDefault();
  const nonEmpty = { ...Storage_getDefault(), history: [historyRecord(1)] };

  it("keeps the same user even when adoption is allowed", () => {
    expect(
      LoginAdoptLocal_plan({ oldUserId: "a", newUserId: "a", adoption: "if-empty", local: empty, server: empty })
    ).to.equal("same-user");
  });

  it("adopts into an empty account", () => {
    expect(
      LoginAdoptLocal_plan({ oldUserId: "a", newUserId: "b", adoption: "if-empty", local: empty, server: empty })
    ).to.equal("adopt");
  });

  it("replaces when the account has data", () => {
    expect(
      LoginAdoptLocal_plan({ oldUserId: "a", newUserId: "b", adoption: "if-empty", local: empty, server: nonEmpty })
    ).to.equal("replace");
  });

  it("replaces when adoption is not allowed", () => {
    expect(
      LoginAdoptLocal_plan({ oldUserId: "a", newUserId: "b", adoption: "never", local: empty, server: empty })
    ).to.equal("replace");
  });
});

describe("LoginAdoptLocal_storage", () => {
  it("keeps local data under the cloud account id and merges receipts", () => {
    const local = {
      ...localStorage(),
      programs: [Program_create("P")],
      subscription: { apple: [], google: [receipt("g1")], key: "oldkey" },
    };
    const server = { ...serverStorage(), subscription: { apple: [receipt("a1")], google: [receipt("g1")] } };
    const result = LoginAdoptLocal_storage(local, server, account, "phone", now);
    expect(result.tempUserId).to.equal("cloudid");
    expect(result.email).to.equal("a@b.c");
    expect(result.history).to.equal(local.history);
    expect(result.programs).to.equal(local.programs);
    expect(result.subscription).to.eql({ apple: [receipt("a1")], google: [receipt("g1")], key: "newkey" });
  });

  it("uploads local settings over newer server settings", () => {
    const local = localStorage();
    const server = serverStorage();
    const adopted = LoginAdoptLocal_storage(local, server, account, "phone", now);
    const merged = uploadAndMerge(adopted, server);
    expect(merged.settings.units).to.equal("kg");
    expect(merged.history.map((r) => r.id)).to.eql([1000]);
  });

  it("loses the local settings without the version bump", () => {
    const local = localStorage();
    const server = serverStorage();
    const adopted = { ...LoginAdoptLocal_storage(local, server, account, "phone", now), _versions: local._versions };
    expect(uploadAndMerge(adopted, server).settings.units).to.equal("lb");
  });

  it("would lose a workout the server has a delete marker for", () => {
    const local = localStorage();
    const server = withDeletedWorkout(serverStorage(), 1000);
    const adopted = LoginAdoptLocal_storage(local, server, account, "phone", now);
    expect(uploadAndMerge(adopted, server).history).to.eql([]);
  });
});

function withDeletedWorkout(server: IStorage, id: number): IStorage {
  return { ...server, _versions: { ...server._versions, history: { items: {}, deleted: { [`${id}`]: now - 1000 } } } };
}

describe("LoginAdoptLocal_plan with delete markers", () => {
  it("asks with a workout marker", () => {
    expect(planFor(withDeletedWorkout(serverStorage(), 2000))).to.equal("conflict");
  });

  it("asks with a program marker", () => {
    const server = serverStorage();
    const programs = { items: {}, deleted: { "123": now - 1000 } };
    expect(planFor({ ...server, _versions: { ...server._versions, programs } })).to.equal("conflict");
  });

  it("asks with a nested bodyweight marker", () => {
    const server = serverStorage();
    const stats = { weight: { weight: { items: {}, deleted: { "5": now - 1000 } } } };
    expect(planFor({ ...server, _versions: { ...server._versions, stats } })).to.equal("conflict");
  });

  it("asks with a custom exercise marker", () => {
    const server = serverStorage();
    const settings = { exercises: { items: {}, deleted: { abc: now - 1000 } } };
    expect(planFor({ ...server, _versions: { ...server._versions, settings } })).to.equal("conflict");
  });

  it("adopts when the delete markers are empty", () => {
    const server = serverStorage();
    const history = { items: {}, deleted: {} };
    expect(planFor({ ...server, _versions: { ...server._versions, history } })).to.equal("adopt");
  });
});

describe("LoginAdoptLocal_storage server-only fields", () => {
  function serverWithHealthSync(): IStorage {
    const base = serverStorage();
    return Storage_fillVersions({ ...base, settings: { ...base.settings, appleHealthSyncMeasurements: true } }, "web");
  }

  it("copies a setting only the server has, so both sides match", () => {
    const server = serverWithHealthSync();
    const adopted = LoginAdoptLocal_storage(localStorage(), server, account, "phone", now);
    expect(adopted.settings.appleHealthSyncMeasurements).to.equal(true);
    expect(uploadAndMerge(adopted, server).settings.appleHealthSyncMeasurements).to.equal(true);
  });

  it("keeps the local value of a setting both sides have", () => {
    const local = localStorage();
    const localWithHealthSync = { ...local, settings: { ...local.settings, appleHealthSyncMeasurements: false } };
    const adopted = LoginAdoptLocal_storage(localWithHealthSync, serverWithHealthSync(), account, "phone", now);
    expect(adopted.settings.appleHealthSyncMeasurements).to.equal(false);
  });
});
