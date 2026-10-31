import "mocha";
import { expect } from "chai";
import { LiftographBench_mutate, LiftographBench_run } from "../src/liftograph/liftographBench";
import { Storage_getDefault } from "../src/models/storage";
import { IStorage } from "../src/types";
import { fxDay, fxEntry, fxRecord, fxSet, fxStats } from "./liftographFixtures";

const now = fxDay(2026, 3, 31).getTime();

function storage(): IStorage {
  const base = Storage_getDefault();
  const history = [
    fxRecord(fxDay(2026, 3, 2), [fxEntry("squat", [fxSet(200, 5)]), fxEntry("benchPress", [fxSet(135, 5)])]),
    fxRecord(fxDay(2026, 3, 9), [fxEntry("squat", [fxSet(205, 5)])]),
    fxRecord(fxDay(2026, 3, 16), [fxEntry("squat", [fxSet(210, 5)])]),
  ];
  return {
    ...base,
    history,
    stats: fxStats([[fxDay(2026, 3, 1), 180]]),
    settings: {
      ...base.settings,
      graphs: {
        ...base.settings.graphs,
        graphs: [
          { vtype: "graph", type: "exercise", id: "squat_barbell" },
          { vtype: "graph", type: "muscleGroup", id: "chest" },
          { vtype: "graph", type: "statsWeight", id: "weight" },
        ],
      },
    },
  };
}

describe("LiftographBench", () => {
  it("changes only an in-memory copy for each scenario", () => {
    const original = storage();
    const ids = (s: IStorage): number[] => s.history.map((r) => r.id).sort((a, b) => a - b);
    const appended = LiftographBench_mutate(original, "appendWorkout", now);
    expect(appended.history.length).to.equal(4);
    expect(appended.history[0].startTime).to.equal(now);
    expect(LiftographBench_mutate(original, "deleteWorkout", now).history.length).to.equal(2);
    const merged = LiftographBench_mutate(original, "mergeOlderWorkout", now);
    expect(Math.min(...merged.history.map((r) => r.startTime))).to.equal(original.history[0].startTime);
    expect(merged.history.length).to.equal(4);
    const edited = LiftographBench_mutate(original, "editOldWorkout", now);
    expect(ids(edited)).to.deep.equal(ids(original));
    expect(edited.history[0]).to.not.equal(original.history[0]);
    expect(LiftographBench_mutate(original, "settingsChange", now).settings.startWeekFromMonday).to.equal(
      !original.settings.startWeekFromMonday
    );
    expect(LiftographBench_mutate(original, "bodyweightEdit", now).stats.weight.weight?.[0].value.value).to.equal(181);
    expect(original.history.length).to.equal(3);
    expect(original.stats.weight.weight?.[0].value.value).to.equal(180);
  });

  it("times each graph for today's code, the engine and the script forms", () => {
    let tick = 0;
    const samples = LiftographBench_run(storage(), now, () => {
      tick += 1;
      return tick;
    });
    const firstVisit = samples.filter((s) => s.scenario === "firstVisit");
    const graphsOf = (impl: string): string[] =>
      Array.from(new Set(firstVisit.filter((s) => s.impl === impl).map((s) => s.graph))).sort();
    expect(graphsOf("legacy")).to.deep.equal(["all", "muscleGroups", "squat_barbell", "stats:weight"]);
    expect(graphsOf("engine")).to.deep.equal(["all", "muscleGroups", "squat_barbell", "stats:weight"]);
    expect(graphsOf("engineScript")).to.deep.equal([
      "squat_barbell:e1rm",
      "squat_barbell:maxWeight",
      "squat_barbell:stateful",
    ]);
    expect(new Set(samples.map((s) => s.scenario)).size).to.equal(8);
    expect(samples.every((s) => s.durationMs > 0)).to.equal(true);
  });
});
