import "mocha";
import { expect } from "chai";
import {
  LoginConflict_description,
  LoginConflict_isConfirmed,
  LoginConflict_mergedStorage,
  LoginConflict_overwrittenStorage,
  LoginConflict_typedPrompt,
} from "../src/models/loginConflict";
import {
  ILoginConflictSummary,
  LoginConflictSummary_build,
  LoginConflictSummary_fromIds,
  LoginConflictSummary_hasAnyData,
  LoginConflictSummary_hasPhoneOnlyData,
  LoginConflictSummary_parsePhoneIds,
  LoginConflictSummary_phoneIds,
} from "../src/models/loginConflictSummary";
import { Storage_fillVersions, Storage_getDefault } from "../src/models/storage";
import { Program_create } from "../src/models/program";
import { VersionTracker } from "../src/models/versionTracker";
import { Sync_getStorageUpdate2 } from "../src/utils/sync";
import { Service } from "../src/api/service";
import { ICustomExercise, IHistoryRecord, IProgram, IStorage, STORAGE_VERSION_TYPES } from "../src/types";

function workout(id: number): IHistoryRecord {
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

function weight(timestamp: number): { vtype: "stat"; value: { value: number; unit: "kg" }; timestamp: number } {
  return { vtype: "stat", value: { value: 80, unit: "kg" }, timestamp };
}

function customExercise(id: string): ICustomExercise {
  return {
    vtype: "custom_exercise",
    id,
    name: id,
    isDeleted: false,
    meta: { targetMuscles: [], synergistMuscles: [], bodyParts: [], sortedEquipment: [] },
  };
}

function program(name: string, clonedAt: number): IProgram {
  return { ...Program_create(name), clonedAt };
}

const account = { userId: "cloudid", email: "a@b.c", key: "newkey" };
const now = 1_900_000_000_000;

function phone(changes: Partial<IStorage> = {}): IStorage {
  const base = Storage_getDefault();
  return Storage_fillVersions({ ...base, tempUserId: "localid", ...changes }, "phone");
}

function cloud(changes: Partial<IStorage> = {}): IStorage {
  const base = Storage_getDefault();
  return Storage_fillVersions({ ...base, tempUserId: "cloudid", ...changes }, "web");
}

function uploadAndMerge(result: IStorage, server: IStorage): IStorage {
  const update = Sync_getStorageUpdate2(result, server._versions, "phone");
  const { _versions, ...serverFields } = server;
  const tracker = new VersionTracker(STORAGE_VERSION_TYPES, { deviceId: "phone" });
  return tracker.mergeByVersions(serverFields, _versions || {}, update.versions || {}, update.storage || {});
}

const summary: ILoginConflictSummary = {
  accountWorkouts: 120,
  accountPrograms: 3,
  phoneOnlyWorkouts: 5,
  phoneOnlyPrograms: 1,
  phoneOnlyStats: 0,
};

describe("LoginConflictSummary_build", () => {
  it("counts only items the account lacks", () => {
    const shared = program("Shared", 100);
    const local = phone({
      history: [workout(1), workout(2)],
      programs: [shared, program("Phone", 200)],
      stats: { weight: { weight: [weight(1), weight(2)] }, length: {}, percentage: {} },
    });
    const server = cloud({
      history: [workout(1), workout(3), workout(4)],
      programs: [shared],
      stats: { weight: { weight: [weight(1)] }, length: {}, percentage: {} },
    });
    expect(LoginConflictSummary_build(local, server)).to.eql({
      accountWorkouts: 3,
      accountPrograms: 1,
      phoneOnlyWorkouts: 1,
      phoneOnlyPrograms: 1,
      phoneOnlyStats: 1,
    });
  });

  it("treats a program with the same clonedAt as the same program", () => {
    const local = phone({ programs: [{ ...Program_create("A"), id: "a", clonedAt: 5 }] });
    const server = cloud({ programs: [{ ...Program_create("A"), id: "b", clonedAt: 5 }] });
    expect(LoginConflictSummary_build(local, server).phoneOnlyPrograms).to.equal(0);
  });

  it("treats the same timestamp under another measurement as different", () => {
    const local = phone({ stats: { weight: { weight: [weight(1)] }, length: {}, percentage: {} } });
    const value = { vtype: "stat" as const, value: { value: 30, unit: "cm" as const }, timestamp: 1 };
    const server = cloud({ stats: { weight: {}, length: { waist: [value] }, percentage: {} } });
    expect(LoginConflictSummary_build(local, server).phoneOnlyStats).to.equal(1);
  });

  it("gives the same summary from ids sent over the network", () => {
    const local = phone({ history: [workout(1), workout(2)], programs: [program("Phone", 200)] });
    const server = cloud({ history: [workout(1)] });
    const sent = LoginConflictSummary_parsePhoneIds(JSON.parse(JSON.stringify(LoginConflictSummary_phoneIds(local))));
    expect(LoginConflictSummary_fromIds(sent!, server)).to.eql(LoginConflictSummary_build(local, server));
  });

  it("rejects malformed phone ids and drops bad items", () => {
    expect(LoginConflictSummary_parsePhoneIds(undefined)).to.equal(undefined);
    expect(LoginConflictSummary_parsePhoneIds({ workoutIds: [1] })).to.equal(undefined);
    const parsed = LoginConflictSummary_parsePhoneIds({
      workoutIds: [1, "2"],
      programs: [{ id: "a", clonedAt: "x" }, { clonedAt: 5 }],
      statIds: ["1_weight", 3],
    });
    expect(parsed).to.eql({ workoutIds: [1], programs: [{ id: "a", clonedAt: undefined }], statIds: ["1_weight"] });
  });

  it("finds no data on an empty phone", () => {
    expect(LoginConflictSummary_hasAnyData(LoginConflictSummary_phoneIds(phone()))).to.equal(false);
    expect(LoginConflictSummary_hasAnyData(LoginConflictSummary_phoneIds(phone({ history: [workout(1)] })))).to.equal(
      true
    );
  });

  it("reports phone-only data from any kind of item", () => {
    const none = { ...summary, phoneOnlyWorkouts: 0, phoneOnlyPrograms: 0 };
    expect(LoginConflictSummary_hasPhoneOnlyData(none)).to.equal(false);
    expect(LoginConflictSummary_hasPhoneOnlyData({ ...none, phoneOnlyStats: 1 })).to.equal(true);
  });
});

describe("LoginConflict text", () => {
  it("describes both sides and omits zero counts", () => {
    expect(LoginConflict_description(summary, "a@b.c")).to.equal(
      "a@b.c has 120 workouts and 3 programs.\nThis device has 5 workouts and 1 program not in the account."
    );
  });

  it("names the amount and the word in each typed prompt", () => {
    expect(LoginConflict_typedPrompt("overwrite", summary, "a@b.c")).to.contain("deletes 120 workouts and 3 programs");
    expect(LoginConflict_typedPrompt("overwrite", summary, "a@b.c")).to.contain("Type 'overwrite'");
    expect(LoginConflict_typedPrompt("merge", summary, "a@b.c")).to.contain("adds 5 workouts and 1 program");
    expect(LoginConflict_typedPrompt("merge", summary, "a@b.c")).to.contain("Type 'merge'");
  });

  it("accepts only the matching word", () => {
    expect(LoginConflict_isConfirmed("merge", " Merge ")).to.equal(true);
    expect(LoginConflict_isConfirmed("merge", "overwrite")).to.equal(false);
    expect(LoginConflict_isConfirmed("overwrite", "")).to.equal(false);
    expect(LoginConflict_isConfirmed("overwrite", undefined)).to.equal(false);
  });
});

describe("LoginConflict_mergedStorage", () => {
  it("uploads phone-only items and keeps the account's items and settings", () => {
    const shared = program("Shared", 100);
    const phoneProgram = program("Phone", 200);
    const local = phone({
      history: [workout(1), workout(2)],
      programs: [shared, phoneProgram],
      currentProgramId: phoneProgram.id,
      stats: { weight: { weight: [weight(10)] }, length: {}, percentage: {} },
    });
    local.settings = { ...local.settings, units: "kg", exercises: { phone: customExercise("phone") } };
    const server = cloud({
      history: [workout(1), workout(3)],
      programs: [shared],
      currentProgramId: shared.id,
      stats: { weight: { weight: [weight(20)] }, length: {}, percentage: {} },
    });
    server.settings = { ...server.settings, units: "lb", exercises: { cloud: customExercise("cloud") } };
    const result = LoginConflict_mergedStorage(local, server, account, "phone", now);
    expect(result.tempUserId).to.equal("cloudid");
    expect(result.history.map((r) => r.id)).to.eql([3, 2, 1]);

    const merged = uploadAndMerge(result, server);
    expect(merged.history.map((r) => r.id)).to.have.members([1, 2, 3]);
    expect(merged.programs.map((p) => p.id)).to.have.members([shared.id, phoneProgram.id]);
    expect(merged.stats.weight.weight?.map((s) => s.timestamp)).to.have.members([10, 20]);
    expect(Object.keys(merged.settings.exercises)).to.have.members(["phone", "cloud"]);
    expect(merged.settings.units).to.equal("lb");
    expect(merged.currentProgramId).to.equal(shared.id);
  });

  it("adds phone-only exercise data, gyms, equipment and muscle groups, and the account wins on a clash", () => {
    const local = phone({ history: [workout(2)] });
    const server = cloud({ history: [workout(1)] });
    const phoneDefault = local.settings.gyms[0];
    const accountDefault = server.settings.gyms[0];
    const plates = { ...phoneDefault.equipment.barbell!, name: "Phone plates" };
    local.settings = {
      ...local.settings,
      exerciseData: { bench: { rm1: { value: 100, unit: "kg" } }, squat: { notes: "phone" } },
      gyms: [
        { ...phoneDefault, equipment: { ...phoneDefault.equipment, phoneplates: plates } },
        { ...phoneDefault, id: "home", name: "Home" },
      ],
      muscleGroups: {
        vtype: "muscle_groups_settings",
        data: { phonegroup: { name: "Phone" }, shared: { name: "Phone shared" } },
      },
    };
    server.settings = {
      ...server.settings,
      exerciseData: { bench: { rm1: { value: 80, unit: "kg" } } },
      gyms: [accountDefault, { ...accountDefault, id: "work", name: "Work" }],
      muscleGroups: { vtype: "muscle_groups_settings", data: { shared: { name: "Account shared" } } },
    };
    const merged = uploadAndMerge(LoginConflict_mergedStorage(local, server, account, "phone", now), server);
    expect(merged.settings.exerciseData.bench?.rm1).to.eql({ value: 80, unit: "kg" });
    expect(merged.settings.exerciseData.squat?.notes).to.equal("phone");
    expect(merged.settings.gyms.map((gym) => gym.id)).to.have.members(["default", "work", "home"]);
    expect(merged.settings.gyms.find((gym) => gym.id === "default")?.equipment.phoneplates?.name).to.equal(
      "Phone plates"
    );
    expect(merged.settings.muscleGroups.data.phonegroup?.name).to.equal("Phone");
    expect(merged.settings.muscleGroups.data.shared?.name).to.equal("Account shared");
  });

  it("keeps the phone's workout in progress only when the account has none", () => {
    const inProgress = { ...workout(9), vtype: "progress" as const };
    const local = phone({ history: [workout(2)], progress: [inProgress] });
    const server = cloud({ history: [workout(1)] });
    expect(LoginConflict_mergedStorage(local, server, account, "phone", now).progress.map((p) => p.id)).to.eql([9]);
    const busy = cloud({ history: [workout(1)], progress: [{ ...workout(8), vtype: "progress" as const }] });
    expect(LoginConflict_mergedStorage(local, busy, account, "phone", now).progress.map((p) => p.id)).to.eql([8]);
  });

  it("does not add a program the account already has by clonedAt", () => {
    const local = phone({ programs: [{ ...Program_create("A"), id: "a", clonedAt: 5 }] });
    const server = cloud({ programs: [{ ...Program_create("A"), id: "b", clonedAt: 5 }] });
    const result = LoginConflict_mergedStorage(local, server, account, "phone", now);
    expect(result.programs.map((p) => p.id)).to.eql(["b"]);
  });
});

describe("LoginConflict_overwrittenStorage", () => {
  it("deletes account items the phone lacks and uploads the phone's", () => {
    const accountProgram = program("Account", 100);
    const phoneProgram = program("Phone", 200);
    const local = phone({ history: [workout(1)], programs: [phoneProgram], currentProgramId: phoneProgram.id });
    local.settings = { ...local.settings, units: "kg" };
    const server = cloud({
      history: [workout(2), workout(3)],
      programs: [accountProgram],
      currentProgramId: accountProgram.id,
      stats: {
        weight: { weight: [weight(20)] },
        length: {},
        percentage: {},
        health: { sleep: [{ vtype: "stat", value: 420, timestamp: 30 }] },
      },
    });
    server.settings = { ...server.settings, units: "lb", exercises: { cloud: customExercise("cloud") } };
    const merged = uploadAndMerge(LoginConflict_overwrittenStorage(local, server, account, "phone", now), server);
    expect(merged.history.map((r) => r.id)).to.eql([1]);
    expect(merged.programs.map((p) => p.id)).to.eql([phoneProgram.id]);
    expect(merged.stats.weight.weight).to.eql([]);
    expect(merged.stats.health?.sleep).to.eql([]);
    expect(merged.currentProgramId).to.equal(phoneProgram.id);
    expect(merged.settings.units).to.equal("kg");
    expect(Object.keys(merged.settings.exercises)).to.eql([]);
  });

  it("sends a nested delete marker for each account measurement", () => {
    const local = phone();
    const server = cloud({ stats: { weight: { weight: [weight(20)] }, length: {}, percentage: {} } });
    const result = LoginConflict_overwrittenStorage(local, server, account, "phone", now);
    const update = Sync_getStorageUpdate2(result, server._versions, "phone");
    expect(update.versions?.stats).to.nested.include({ "weight.weight.deleted.20": now });
  });
});

describe("Service.checkLogin", () => {
  const credentials = { provider: "email" as const, email: "a@b.c", password: "secret123" };
  const phoneIds = { workoutIds: [1], programs: [], statIds: [] };

  beforeEach(() => {
    // @ts-ignore
    global.__API_HOST__ = "https://www.liftosaur.com";
  });

  function serviceAnswering(answer: () => Promise<Response>): Service {
    return new Service(() => answer());
  }

  it("treats a network failure as unavailable instead of throwing", async () => {
    const service = serviceAnswering(() => Promise.reject(new TypeError("Network request failed")));
    expect(await service.checkLogin(credentials, "phone1", phoneIds)).to.eql({ status: "unavailable" });
  });

  it("treats a 404 as unavailable", async () => {
    const service = serviceAnswering(async () => new Response("{}", { status: 404 }));
    expect(await service.checkLogin(credentials, "phone1", phoneIds)).to.eql({ status: "unavailable" });
  });

  it("passes a conflict through", async () => {
    const body = { status: "conflict", email: "a@b.c", summary };
    const service = serviceAnswering(async () => new Response(JSON.stringify(body), { status: 200 }));
    expect(await service.checkLogin(credentials, "phone1", phoneIds)).to.eql(body);
  });
});
