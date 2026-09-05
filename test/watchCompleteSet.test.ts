import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Program_nextHistoryRecord } from "../src/models/program";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { Storage_getDefault } from "../src/models/storage";
import { IStorage, IHistoryRecord } from "../src/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
// The watch bundle reads its build-time version markers at module scope, so they have to exist before
// it's loaded — hence require() here rather than a top-level import.
(globalThis as any).__HOST__ = "https://www.liftosaur.com";
(globalThis as any).__BUNDLE_VERSION_WATCH_IOS__ = 1;
(globalThis as any).__BUNDLE_VERSION_WATCH_ANDROID__ = 1;
(globalThis as any).__COMMIT_HASH__ = "test";
require("../src/watch/index");
const Liftosaur = (globalThis as any).Liftosaur;
/* eslint-enable @typescript-eslint/no-explicit-any */

// General Gainz top set: one set of 3-6 reps, then top-up sets sized from what was actually done.
const ggProgram = `# Week 1
## Day 1
Squat / 1x3-6 / 100lb / update: custom() {~
  if (setIndex == 1) {
    numberOfSets = completedReps[1] > 2 ? completedReps[1] + 1 : 2
  }
~}
`;

function buildStorage(text: string): { storageJson: string; progress: IHistoryRecord } {
  const { program } = PlannerTestUtils_get(text);
  const settings = Settings_build();
  const progress = Program_nextHistoryRecord(program, settings, Stats_getEmpty(), 1);
  const storage: IStorage = {
    ...Storage_getDefault(),
    settings,
    programs: [program],
    currentProgramId: program.id,
    progress: [progress],
  };
  return { storageJson: JSON.stringify(storage), progress };
}

function completeSet(
  storageJson: string,
  globalSetIndex: number,
  reps?: number
): { entries: IHistoryRecord["entries"] } {
  const logValuesJson = reps != null ? JSON.stringify({ reps }) : undefined;
  const result = JSON.parse(Liftosaur.completeSet(storageJson, "device", 0, globalSetIndex, logValuesJson));
  expect(result.success, result.error).to.equal(true);
  return { entries: result.data.progress[0].entries };
}

describe("watch completeSet", () => {
  // The watch keeps the parsed storage in a module-level cache across mutations, so without this each
  // case would run against the previous one's result instead of the storage it just built.
  beforeEach(() => {
    Liftosaur.invalidateStorageCache();
  });

  it("runs the update script against the reps passed with the completion, not the top of the rep range", () => {
    const { storageJson, progress } = buildStorage(ggProgram);
    const warmupSetsCount = progress.entries[0].warmupSets.length;

    const { entries } = completeSet(storageJson, warmupSetsCount, 5);

    expect(entries[0].sets[0].completedReps).to.equal(5);
    // numberOfSets = completedReps + 1 = 6, i.e. the top set plus 5 top-up sets.
    expect(entries[0].sets.length).to.equal(6);
  });

  it("falls back to the target reps when nothing was dialed in", () => {
    const { storageJson, progress } = buildStorage(ggProgram);
    const warmupSetsCount = progress.entries[0].warmupSets.length;

    const { entries } = completeSet(storageJson, warmupSetsCount, undefined);

    // Untouched set records the top of the range (6), so the script sizes 6 + 1 sets off that.
    expect(entries[0].sets[0].completedReps).to.equal(6);
    expect(entries[0].sets.length).to.equal(7);
  });
});

describe("watch checkSetTimer", () => {
  beforeEach(() => {
    Liftosaur.invalidateStorageCache();
  });

  // A timed set whose update script is observable: if the program context was resolved, the set count
  // changes; if it came through as undefined, the script never ran and it stays at 3.
  const timedProgram = `# Week 1
## Day 1
Plank / 3x1 20s|10s / 100lb / update: custom() {~
  if (setIndex == 1) {
    numberOfSets = 5
  }
~}
`;

  it("resolves program context from a countdown, so a wake past countdown+work still runs the script", () => {
    const { storageJson, progress } = buildStorage(timedProgram);
    const storage = JSON.parse(storageJson);
    // Wrist down through the whole countdown and the whole 20s work window.
    storage.progress[0] = {
      ...progress,
      setTimerGetReady: { entryIndex: 0, setIndex: 0, startedAt: Date.now() - 40000, getReady: 5, nonce: 1 },
    };
    const result = JSON.parse(Liftosaur.checkSetTimer(JSON.stringify(storage), "device"));
    expect(result.success, result.error).to.equal(true);
    expect(result.data.progress[0].entries[0].sets.length).to.equal(5);
  });
});
