import "mocha";
import { expect } from "chai";
import { Storage_getDefault, Storage_fillVersions } from "../src/models/storage";
import { IStorage, IHistoryRecord } from "../src/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).__HOST__ = "https://www.liftosaur.com";
(globalThis as any).__BUNDLE_VERSION_WATCH_IOS__ = 1;
(globalThis as any).__BUNDLE_VERSION_WATCH_ANDROID__ = 1;
(globalThis as any).__COMMIT_HASH__ = "test";
require("../src/watch/index");
const Liftosaur = (globalThis as any).Liftosaur;
/* eslint-enable @typescript-eslint/no-explicit-any */

function buildRecord(id: number): IHistoryRecord {
  return {
    vtype: "history_record",
    id,
    date: new Date(id).toISOString(),
    programId: "prog",
    programName: "Program",
    day: 1,
    dayName: "Day",
    entries: [],
    startTime: id,
    endTime: id + 1000,
  };
}

describe("watch pruneHistory cache behaviour", () => {
  beforeEach(() => {
    Liftosaur.invalidateStorageCache();
  });

  // WatchSyncManager.pruneStoredHistory prunes current storage and then lastSyncedStorage. When
  // pruneHistory seeded the cache, the second call left it holding the baseline, so the next read
  // returned a workout that had already finished.
  it("does not leave the cache pointing at whichever storage was pruned last", () => {
    const current: IStorage = Storage_fillVersions(
      { ...Storage_getDefault(), history: [buildRecord(2000), buildRecord(1000)], progress: [] },
      "watch"
    );
    // Two records so the baseline prune actually drops one: history[0] is always kept, so a
    // single-record baseline returns early and never reaches the cache assignment.
    const baseline: IStorage = Storage_fillVersions(
      {
        ...Storage_getDefault(),
        history: [buildRecord(2000), buildRecord(1000)],
        progress: [{ ...buildRecord(3000), vtype: "progress" }],
      },
      "watch"
    );
    const confirmed = JSON.stringify(["1000"]);

    const prunedCurrent = Liftosaur.pruneHistory(JSON.stringify(current), confirmed);
    Liftosaur.pruneHistory(JSON.stringify(baseline), confirmed);

    const progress = JSON.parse(Liftosaur.getProgress(prunedCurrent));

    expect(progress.success, progress.error).to.equal(true);
    expect(progress.data, "cache leaked the baseline's active workout").to.equal(undefined);
  });
});
