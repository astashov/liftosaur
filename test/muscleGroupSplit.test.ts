import "mocha";
import { expect } from "chai";
import { Storage_getDefault, Storage_mergeStorage, Storage_updateVersions } from "../src/models/storage";
import { VersionTrackerUtils_SERVER_DEVICE_ID } from "../src/models/versionTracker/utils";
import { MuscleGroupSplit_migrate, MuscleGroupSplit_replaceGraphs } from "../src/models/muscleGroupSplit";
import { IGraph, IStorage } from "../src/types";
import { IVectorClock } from "../src/models/versionTracker/types";
import { ObjectUtils_clone } from "../src/utils/object";
import { runMigrations } from "../src/migrations/runner";
import { Settings_webEditorInitial } from "../src/models/settings";

const versionBeforeSplit = "20261018120000";

function muscleGroupGraph(id: string): IGraph {
  return { vtype: "graph", type: "muscleGroup", id };
}

function clock(vc: Record<string, number>, t: number): IVectorClock {
  return { vc, t };
}

function legacyStorage(args: {
  shoulders?: [number, number];
  shouldersClock?: IVectorClock;
  graphs?: IGraph[];
  graphsClock?: IVectorClock;
  muscleGroupsData?: IStorage["settings"]["muscleGroups"]["data"];
  muscleGroupsClock?: IVectorClock;
}): IStorage {
  const storage = Storage_getDefault();
  storage.version = versionBeforeSplit;
  storage.settings.planner.weeklyRangeSets = { shoulders: args.shoulders ?? [10, 12], back: [8, 14], forearms: [4, 6] };
  storage.settings.planner.weeklyFrequency = { shoulders: 2, back: 3, forearms: 1 };
  storage.settings.graphs = { vtype: "graphs", graphs: args.graphs ?? [] };
  storage.settings.muscleGroups = { vtype: "muscle_groups_settings", data: args.muscleGroupsData ?? {} };
  const baseClock = clock({ X: 1 }, 1000);
  storage._versions = {
    settings: {
      graphs: args.graphsClock ?? baseClock,
      muscleGroups: args.muscleGroupsClock ?? baseClock,
      planner: {
        weeklyRangeSets: { shoulders: args.shouldersClock ?? baseClock, back: baseClock, forearms: baseClock },
        weeklyFrequency: { shoulders: baseClock, back: baseClock, forearms: baseClock },
      },
    },
  };
  return storage;
}

function mergeBothWays(a: IStorage, b: IStorage): [IStorage, IStorage] {
  return [
    Storage_mergeStorage(ObjectUtils_clone(a), ObjectUtils_clone(b), "deviceA"),
    Storage_mergeStorage(ObjectUtils_clone(b), ObjectUtils_clone(a), "deviceB"),
  ];
}

describe("MuscleGroupSplit merges", () => {
  it("keeps a real graph edit when another replica migrates later from a stale copy", () => {
    const base = legacyStorage({ graphs: [muscleGroupGraph("shoulders")] });
    const a = MuscleGroupSplit_migrate(base);
    a.version = "20261022120000";
    a.settings.graphs.graphs = [muscleGroupGraph("chest")];
    a._versions!.settings = { ...(a._versions!.settings as object), graphs: clock({ X: 1, A: 1 }, 2000) };
    const staleB = ObjectUtils_clone(base);

    for (const merged of mergeBothWays(a, staleB)) {
      expect(merged.settings.graphs.graphs).to.deep.equal([muscleGroupGraph("chest")]);
    }
  });

  it("copies the newer of two differing legacy ranges on both replicas", () => {
    const a = legacyStorage({ shoulders: [10, 12], shouldersClock: clock({ X: 1 }, 1000) });
    const b = legacyStorage({ shoulders: [15, 20], shouldersClock: clock({ X: 1, B: 1 }, 2000) });

    for (const merged of mergeBothWays(a, b)) {
      expect(merged.settings.planner.weeklyRangeSets.frontDelts).to.deep.equal([15, 20]);
      expect(merged.settings.planner.weeklyRangeSets.rearDelts).to.deep.equal([15, 20]);
    }
  });

  it("gives identical graph lists when only the muscle group settings differ", () => {
    const graphsClock = clock({ X: 1 }, 1000);
    const a = legacyStorage({
      graphs: [muscleGroupGraph("shoulders")],
      graphsClock,
      muscleGroupsClock: clock({ X: 1 }, 1000),
    });
    const b = legacyStorage({
      graphs: [muscleGroupGraph("shoulders")],
      graphsClock,
      muscleGroupsData: { shoulders: { muscles: ["Quadriceps"] } },
      muscleGroupsClock: clock({ X: 1, B: 1 }, 2000),
    });

    const [ab, ba] = mergeBothWays(a, b);
    expect(ab.settings.graphs.graphs).to.deep.equal(ba.settings.graphs.graphs);
    expect(ab.settings.muscleGroups).to.deep.equal(ba.settings.muscleGroups);
    expect(ab.settings.muscleGroups.data.shoulders?.muscles).to.deep.equal(["Quadriceps"]);
  });
});

describe("MuscleGroupSplit_migrate", () => {
  it("copies shoulders and back into missing keys only", () => {
    const storage = legacyStorage({ shoulders: [6, 9] });
    storage.settings.planner.weeklyRangeSets.sideDelts = [12, 20];
    const result = MuscleGroupSplit_migrate(storage);
    const ranges = result.settings.planner.weeklyRangeSets;
    expect(ranges.frontDelts).to.deep.equal([6, 9]);
    expect(ranges.sideDelts).to.deep.equal([12, 20]);
    expect(ranges.lats).to.deep.equal([8, 14]);
    expect(ranges.upperBack).to.deep.equal([8, 14]);
    expect(result.settings.planner.weeklyFrequency.lats).to.equal(3);
  });

  it("does not copy forearms and gives unranged groups no range", () => {
    const result = MuscleGroupSplit_migrate(legacyStorage({}));
    const ranges = result.settings.planner.weeklyRangeSets;
    expect(ranges.forearmFlexors).to.equal(undefined);
    expect(ranges.forearmExtensors).to.equal(undefined);
    expect(ranges.neck).to.equal(undefined);
  });

  it("fills Moderate with the fixed clock where no legacy source exists", () => {
    const result = MuscleGroupSplit_migrate(legacyStorage({}));
    expect(result.settings.planner.weeklyRangeSets.chest).to.deep.equal([10, 18]);
    expect(result.settings.planner.weeklyFrequency.chest).to.equal(2);
    const planner = (result._versions?.settings as Record<string, Record<string, Record<string, unknown>>>).planner;
    expect(planner.weeklyRangeSets.chest).to.equal(1);
  });

  it("copies the source clock verbatim and never advances graph or group clocks", () => {
    const shouldersClock = clock({ X: 2, B: 1 }, 1500);
    const graphsClock = clock({ X: 3 }, 1700);
    const storage = legacyStorage({ shouldersClock, graphs: [muscleGroupGraph("back")], graphsClock });
    const result = MuscleGroupSplit_migrate(storage);
    const settingsVersions = result._versions?.settings as Record<string, unknown>;
    const planner = settingsVersions.planner as Record<string, Record<string, unknown>>;
    expect(planner.weeklyRangeSets.frontDelts).to.deep.equal(shouldersClock);
    expect(settingsVersions.graphs).to.deep.equal(graphsClock);
  });

  it("leaves copies without a clock when the source has none", () => {
    const storage = legacyStorage({});
    storage._versions = undefined;
    const result = MuscleGroupSplit_migrate(storage);
    expect(result.settings.planner.weeklyRangeSets.frontDelts).to.deep.equal([10, 12]);
    expect(result._versions).to.equal(undefined);
  });

  it("keeps a legacy group with an explicit muscle list, removes name-only entries", () => {
    const storage = legacyStorage({
      graphs: [muscleGroupGraph("shoulders")],
      muscleGroupsData: { shoulders: { muscles: [] }, back: { name: "My Back" }, forearms: { isHidden: true } },
    });
    const result = MuscleGroupSplit_migrate(storage);
    expect(result.settings.muscleGroups.data).to.deep.equal({ shoulders: { muscles: [] } });
    expect(result.settings.graphs.graphs.map((g) => g.id)).to.deep.equal(["frontDelts", "sideDelts", "rearDelts"]);
  });

  it("changes nothing on a second run", () => {
    const once = MuscleGroupSplit_migrate(
      legacyStorage({ graphs: [muscleGroupGraph("back")], muscleGroupsData: { forearms: { name: "Grip" } } })
    );
    expect(MuscleGroupSplit_migrate(once)).to.deep.equal(once);
  });
});

describe("MuscleGroupSplit with a web settings save", () => {
  function serverSaveAfterMigration(raw: IStorage, edit: (settings: IStorage["settings"]) => void): IStorage {
    const migrated = runMigrations(raw);
    const edited = ObjectUtils_clone(migrated);
    edit(edited.settings);
    edited._versions = Storage_updateVersions(migrated, edited, VersionTrackerUtils_SERVER_DEVICE_ID);
    return edited;
  }

  it("keeps a web range edit over an offline client's migrated copy", () => {
    const raw = legacyStorage({ shoulders: [6, 9], shouldersClock: clock({ srv_api: 5 }, 1000) });
    const server = serverSaveAfterMigration(raw, (settings) => {
      settings.planner.weeklyRangeSets.frontDelts = [12, 15];
    });
    const offlineClient = runMigrations(ObjectUtils_clone(raw));
    for (const merged of mergeBothWays(server, offlineClient)) {
      expect(merged.settings.planner.weeklyRangeSets.frontDelts).to.deep.equal([12, 15]);
    }
  });

  it("keeps a web frequency edit over an offline client's migrated copy", () => {
    const raw = legacyStorage({});
    const server = serverSaveAfterMigration(raw, (settings) => {
      settings.planner.weeklyFrequency.lats = 4;
    });
    const offlineClient = runMigrations(ObjectUtils_clone(raw));
    for (const merged of mergeBothWays(server, offlineClient)) {
      expect(merged.settings.planner.weeklyFrequency.lats).to.equal(4);
    }
  });
});

describe("MuscleGroupSplit on the web editor page", () => {
  it("shows copied ranges for an account the app has not synced since the split", () => {
    const storage = legacyStorage({ shoulders: [6, 9] });
    const settings = Settings_webEditorInitial(runMigrations(storage).settings, undefined);
    expect(settings.planner.weeklyRangeSets.frontDelts).to.deep.equal([6, 9]);
    expect(settings.planner.weeklyRangeSets.lats).to.deep.equal([8, 14]);
  });
});

describe("MuscleGroupSplit_replaceGraphs", () => {
  it("replaces a legacy graph in place", () => {
    const result = MuscleGroupSplit_replaceGraphs([
      muscleGroupGraph("chest"),
      muscleGroupGraph("forearms"),
      muscleGroupGraph("abs"),
    ]);
    expect(result.map((g) => g.id)).to.deep.equal(["chest", "forearmFlexors", "forearmExtensors", "abs"]);
  });

  it("does not duplicate a target graph that comes before the legacy graph", () => {
    const result = MuscleGroupSplit_replaceGraphs([muscleGroupGraph("lats"), muscleGroupGraph("back")]);
    expect(result.map((g) => g.id)).to.deep.equal(["lats", "upperBack", "lowerBack"]);
  });

  it("does not duplicate or move a target graph that comes after the legacy graph", () => {
    const result = MuscleGroupSplit_replaceGraphs([muscleGroupGraph("back"), muscleGroupGraph("lats")]);
    expect(result.map((g) => g.id)).to.deep.equal(["upperBack", "lowerBack", "lats"]);
  });
});
