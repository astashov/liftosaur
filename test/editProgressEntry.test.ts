import "mocha";
import { expect } from "chai";
import { EditProgressEntry_deleteEditedSet } from "../src/models/editProgressEntry";
import { IHistoryEntry, IHistoryRecord, ISet } from "../src/types";

function buildSet(id: string, index: number): ISet {
  return { vtype: "set", id, index, reps: 5 };
}

function buildEntry(id: string, sets: ISet[]): IHistoryEntry {
  return { vtype: "history_entry", id, index: 0, exercise: { id: "squat" }, sets, warmupSets: [] };
}

function buildRecord(entries: IHistoryEntry[], setIndex?: number): IHistoryRecord {
  return {
    vtype: "history_record",
    date: "2026-02-28T10:30:00.000Z",
    programId: "emptyprogram",
    programName: "Adhoc",
    day: 1,
    dayName: "Workout",
    entries,
    startTime: 0,
    id: 0,
    ui: {
      editSetModal: { isWarmup: false, entryIndex: 1, setIndex, set: buildSet("edited", setIndex ?? 0) },
    },
  };
}

describe("EditProgressEntry_deleteEditedSet", () => {
  it("removes the edited set, reindexes the rest and closes the modal", () => {
    const other = buildEntry("bench", [buildSet("b0", 0)]);
    const entry = buildEntry("squat", [buildSet("s0", 0), buildSet("s1", 1), buildSet("s2", 2)]);
    const result = EditProgressEntry_deleteEditedSet(buildRecord([other, entry], 1));
    expect(result.entries[0]).to.equal(other);
    expect(result.entries[1].sets.map((s) => [s.id, s.index])).to.deep.equal([
      ["s0", 0],
      ["s2", 1],
    ]);
    expect(result.ui?.editSetModal).to.equal(undefined);
  });

  it("leaves progress unchanged when the modal has no set index", () => {
    const progress = buildRecord([buildEntry("squat", [buildSet("s0", 0)])]);
    expect(EditProgressEntry_deleteEditedSet(progress)).to.equal(progress);
  });
});
