import "mocha";
import { expect } from "chai";
import {
  Dashboard_add,
  Dashboard_current,
  Dashboard_rename,
  Dashboard_fromLegacyGraphs,
  Dashboard_maxCount,
  Dashboard_maxTextBytes,
  Dashboard_seedId,
  Dashboard_validate,
} from "../src/models/dashboard";
import { Settings_build } from "../src/models/settings";
import { Exercise_createCustomExercise } from "../src/models/exercise";
import { LiftographCompile_document } from "../src/liftograph/liftographCompile";
import { LiftographDocument_parse } from "../src/liftograph/liftographDocument";
import { migrations } from "../src/migrations/migrations";
import { Storage_getDefault } from "../src/models/storage";
import { IDashboard, IGraph, ISettings } from "../src/types";

function settingsWith(graphs: IGraph[], patch: Partial<ISettings> = {}): ISettings {
  const settings = Settings_build();
  return { ...settings, ...patch, graphs: { vtype: "graphs", graphs } };
}

function exerciseGraph(id: string): IGraph {
  return { vtype: "graph", type: "exercise", id };
}

function dashboard(id: string, text: string = ""): IDashboard {
  return { vtype: "dashboard", id, name: id, text };
}

describe("Dashboard_fromLegacyGraphs", () => {
  it("writes one captioned graph per saved graph, in order", () => {
    const settings = settingsWith([
      exerciseGraph("squat_barbell"),
      { vtype: "graph", type: "muscleGroup", id: "chest" },
      { vtype: "graph", type: "statsLength", id: "bicepLeft" },
    ]);
    const { text, id, name } = Dashboard_fromLegacyGraphs(settings);
    expect([id, name]).to.deep.equal([Dashboard_seedId, "Graphs"]);
    expect(text.split("\n").filter((line) => line.startsWith("//"))).to.deep.equal([
      "// **Squat, Barbell**",
      "// **Chest**",
      "// **Left Bicep**",
    ]);
    expect(text).to.contain("source: exercise(Squat, Barbell) / y: maxWeight");
    expect(text).to.contain("y: muscleVolume(chest) / group: sum(1w)");
    expect(text).to.contain("source: stats(bicepLeft)");
  });

  it("follows the volume, e1RM, bodyweight and moving average settings", () => {
    const graphs: IGraph[] = [exerciseGraph("squat_barbell"), { vtype: "graph", type: "statsWeight", id: "weight" }];
    const withOneRm = Dashboard_fromLegacyGraphs(
      settingsWith(graphs, {
        graphsSettings: { isWithOneRm: true, isWithBodyweight: true },
        graphOptions: { weight: { movingAverageWindowSize: 7 } },
      })
    ).text;
    expect(withOneRm).to.contain("y: e1rm");
    expect(withOneRm).to.contain("name: Bodyweight / source: stats(weight)");
    expect(withOneRm).to.contain("smooth: avg(7)");
    const volume = Dashboard_fromLegacyGraphs(settingsWith(graphs, { graphsSettings: { defaultType: "volume" } })).text;
    expect(volume).to.contain("y: volume");
    expect(volume).to.not.contain("y: maxWeight");
    expect(volume).to.not.contain("name: Bodyweight");
  });

  it("keeps one muscle metric and puts bodyweight on the right axis", () => {
    const muscle: IGraph = { vtype: "graph", type: "muscleGroup", id: "chest" };
    const sets = Dashboard_fromLegacyGraphs(
      settingsWith([muscle], { graphsSettings: { defaultMuscleGroupType: "sets" } })
    );
    expect(sets.text).to.contain("y: muscleSets(chest)");
    expect(sets.text).to.not.contain("muscleVolume");
    const weight = Dashboard_fromLegacyGraphs(
      settingsWith([exerciseGraph("squat_barbell"), { vtype: "graph", type: "statsWeight", id: "weight" }], {
        graphsSettings: { isWithBodyweight: true },
      })
    );
    expect(weight.text).to.contain("name: Bodyweight / source: stats(weight) / axis: right");
  });

  it("skips a graph whose exercise or muscle group no longer exists", () => {
    const text = Dashboard_fromLegacyGraphs(
      settingsWith([
        exerciseGraph("deletedCustomLift"),
        { vtype: "graph", type: "muscleGroup", id: "removedGroup" },
        exerciseGraph("benchPress_barbell"),
      ])
    ).text;
    expect(text.split("\n")[0]).to.equal("// **Bench Press, Barbell**");
    expect(text.match(/graph \{/g)?.length).to.equal(1);
  });

  it("compiles with no diagnostics, custom exercise names included", () => {
    const custom = Exercise_createCustomExercise("Press (Paused), Close Grip", [], [], []);
    const settings = settingsWith(
      [
        exerciseGraph(custom.id),
        exerciseGraph("squat_barbell"),
        { vtype: "graph", type: "muscleGroup", id: "total" },
        { vtype: "graph", type: "statsPercentage", id: "bodyfat" },
      ],
      { exercises: { [custom.id]: custom }, graphsSettings: { isWithOneRm: true } }
    );
    const { text } = Dashboard_fromLegacyGraphs(settings);
    const compiled = LiftographCompile_document(LiftographDocument_parse(text), settings);
    expect(compiled.diagnostics).to.deep.equal([]);
    expect(compiled.layout.length).to.equal(4);
  });

  it("gives empty text for a user with no saved graphs", () => {
    expect(Dashboard_fromLegacyGraphs(settingsWith([])).text).to.equal("");
  });
});

describe("Dashboard_current", () => {
  it("returns the selected dashboard, the first when the selected one is gone, and nothing for an empty list", () => {
    const dashboards = [dashboard("a"), dashboard("b")];
    expect(Dashboard_current({ dashboards, currentDashboardId: "b" })?.id).to.equal("b");
    expect(Dashboard_current({ dashboards, currentDashboardId: "deleted" })?.id).to.equal("a");
    expect(Dashboard_current({ dashboards: [], currentDashboardId: "a" })).to.equal(undefined);
    expect(Dashboard_current({})).to.equal(undefined);
  });
});

describe("Dashboard_validate", () => {
  it("rejects too many dashboards and text over 64 KB counted in UTF-8 bytes", () => {
    expect(Dashboard_validate([dashboard("a", "x".repeat(Dashboard_maxTextBytes))]).success).to.equal(true);
    expect(Dashboard_validate([dashboard("a", "x".repeat(Dashboard_maxTextBytes + 1))]).success).to.equal(false);
    expect(Dashboard_validate([dashboard("a", "ж".repeat(Dashboard_maxTextBytes / 2 + 1))]).success).to.equal(false);
    const many = Array.from({ length: Dashboard_maxCount + 1 }, (_, i) => dashboard(`d${i}`));
    expect(Dashboard_validate(many).success).to.equal(false);
  });
});

describe("Dashboard_add and Dashboard_rename", () => {
  const storage = { dashboards: [dashboard("a"), dashboard("b")], currentDashboardId: "a" };

  it("appends a dashboard and makes it current", () => {
    expect(Dashboard_add(storage, dashboard("c"))).to.deep.equal({
      kind: "write",
      dashboards: [dashboard("a"), dashboard("b"), dashboard("c")],
      currentDashboardId: "c",
    });
  });

  it("refuses to add past the limit", () => {
    const full = { dashboards: Array.from({ length: Dashboard_maxCount }, (_, i) => dashboard(`d${i}`)) };
    expect(Dashboard_add(full, dashboard("extra"))).to.deep.include({ kind: "error", status: 400 });
  });

  it("renames with a trimmed name and keeps the selection", () => {
    expect(Dashboard_rename(storage, "b", "  Legs  ")).to.deep.equal({
      kind: "write",
      dashboards: [dashboard("a"), { ...dashboard("b"), name: "Legs" }],
      currentDashboardId: "a",
    });
  });

  it("refuses a blank name and a missing dashboard", () => {
    expect(Dashboard_rename(storage, "b", "   ")).to.deep.include({ kind: "error", status: 400 });
    expect(Dashboard_rename(storage, "gone", "Legs")).to.deep.include({ kind: "error", status: 404 });
  });
});

describe("add_dashboards migration", () => {
  const migrate = migrations["20261101120000_add_dashboards"];

  it("seeds the first dashboard once, from the saved graphs", () => {
    const storage = { ...Storage_getDefault(), dashboards: [], currentDashboardId: undefined };
    storage.settings = settingsWith([exerciseGraph("squat_barbell")]);
    const migrated = migrate(storage);
    expect(migrated.currentDashboardId).to.equal(Dashboard_seedId);
    expect(migrated.dashboards?.map((d) => d.id)).to.deep.equal([Dashboard_seedId]);
    expect(migrated.dashboards?.[0].text).to.contain("exercise(Squat, Barbell)");
    expect(migrate(migrated)).to.deep.equal(migrated);
  });

  it("leaves a user who already picked a dashboard alone", () => {
    const storage = { ...Storage_getDefault(), dashboards: [dashboard("mine")], currentDashboardId: "mine" };
    expect(migrate(storage).dashboards).to.deep.equal([dashboard("mine")]);
  });
});
