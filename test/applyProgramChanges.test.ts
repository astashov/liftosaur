import "mocha";
import { expect } from "chai";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import {
  Program_evaluate,
  Program_getDayExerciseKeys,
  Program_nextHistoryRecord,
  Program_nextHistoryRecordFromEvaluated,
} from "../src/models/program";
import { Progress_applyProgramDay, Progress_reindexEntries } from "../src/models/progress";
import { History_createCustomEntry } from "../src/models/history";
import { Stats_getEmpty } from "../src/models/stats";
import { IExercisePickerState, IExerciseType, IHistoryRecord } from "../src/types";

const settings = Settings_build();

function buildProgress(text: string): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Program_nextHistoryRecord(program, settings, Stats_getEmpty());
}

function applyText(progress: IHistoryRecord, text: string): IHistoryRecord {
  const { program } = PlannerTestUtils_get(text);
  return Progress_applyProgramDay(progress, Program_evaluate(program, settings), progress.day, settings);
}

// A workout standing in front of a program, so a case reads as the story it is: start a program, do something to
// the workout, edit the program, assert what the workout looks like. Mutates and returns itself for chaining.
class Workout {
  public progress: IHistoryRecord;
  private text: string;

  constructor(text: string) {
    this.text = text;
    this.progress = buildProgress(text);
  }

  // The program change, threaded exactly as the reducer will: the keys of the day as it was, plus the day as it
  // now is. `withOldKeys: false` is the fresh-boot case, where there is nothing to diff against.
  public edit(newText: string, options?: { withOldKeys?: boolean }): Workout {
    const oldKeys = Program_getDayExerciseKeys(this.evaluate(this.text), this.progress.day);
    this.text = newText;
    this.progress = Progress_applyProgramDay(
      this.progress,
      this.evaluate(newText),
      this.progress.day,
      settings,
      options?.withOldKeys === false ? {} : { oldDayKeys: oldKeys }
    );
    return this;
  }

  // A duplicate dispatch of the very same change. The listener can fire twice for one logical edit, and that must
  // not compound — no second copy of an inserted exercise, no re-drop of something already reconciled.
  public editTwice(newText: string): Workout {
    const oldKeys = Program_getDayExerciseKeys(this.evaluate(this.text), this.progress.day);
    this.text = newText;
    const evaluated = this.evaluate(newText);
    const once = Progress_applyProgramDay(this.progress, evaluated, this.progress.day, settings, {
      oldDayKeys: oldKeys,
    });
    const twice = Progress_applyProgramDay(once, evaluated, this.progress.day, settings, { oldDayKeys: oldKeys });
    expect(normalize(twice)).to.eql(
      normalize(once),
      "applying the same program change twice changed the workout the second time"
    );
    this.progress = twice;
    return this;
  }

  public complete(entryIndex: number, setIndex: number): Workout {
    const set = this.progress.entries[entryIndex].sets[setIndex];
    set.isCompleted = true;
    set.completedReps = set.reps;
    return this;
  }

  public completeWarmup(entryIndex: number, setIndex: number): Workout {
    const set = this.progress.entries[entryIndex].warmupSets[setIndex];
    set.isCompleted = true;
    set.completedReps = set.reps;
    return this;
  }

  public remove(entryIndex: number): Workout {
    this.progress.entries.splice(entryIndex, 1);
    this.reindex();
    return this;
  }

  public reorder(from: number, to: number): Workout {
    const [entry] = this.progress.entries.splice(from, 1);
    this.progress.entries.splice(to, 0, entry);
    this.reindex();
    return this;
  }

  public addAdhoc(exerciseType: IExerciseType, atIndex?: number): Workout {
    const entry = History_createCustomEntry(exerciseType, this.progress.entries.length);
    this.progress.entries.splice(atIndex ?? this.progress.entries.length, 0, entry);
    this.reindex();
    return this;
  }

  // What the user's own "Swap exercise" does: the entry keeps its program id but stops following the program.
  public swap(entryIndex: number, exerciseType: IExerciseType): Workout {
    this.progress.entries[entryIndex] = {
      ...this.progress.entries[entryIndex],
      exercise: exerciseType,
      changed: true,
    };
    return this;
  }

  public keys(): (string | undefined)[] {
    return this.progress.entries.map((e) => e.programExerciseId);
  }

  public exerciseIds(): string[] {
    return this.progress.entries.map((e) => e.exercise.id);
  }

  public entryAt(key: string): IHistoryRecord["entries"][number] | undefined {
    return this.progress.entries.find((e) => e.programExerciseId === key);
  }

  private evaluate(text: string): ReturnType<typeof Program_evaluate> {
    const { program } = PlannerTestUtils_get(text);
    return Program_evaluate(program, settings);
  }

  private reindex(): void {
    this.progress.entries = this.progress.entries.map((e, i) => ({ ...e, index: i }));
  }
}

function workout(text: string): Workout {
  return new Workout(text);
}

// The value pass rebuilds sets with every optional property spelled out, so an entry that went through it has
// explicit `undefined` keys where a freshly built one simply omits them. Deep-equal counts that as a difference;
// nothing downstream does.
function normalize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function day(...lines: string[]): string {
  return `# Week 1\n## Day 1\n${lines.join("\n")}\n`;
}

const SQUAT = "Squat / 3x5 / 100lb";
const BENCH = "Bench Press, Barbell / 3x5 / 80lb";
const CURL = "Bicep Curl, Dumbbell / 3x10 / 20lb";
const ROW = "Bent Over Row, Barbell / 3x8 / 70lb";
const squatKey = "squat_barbell";
const benchKey = "benchpress_barbell";
const curlKey = "bicepcurl_dumbbell";
const rowKey = "bentoverrow_barbell";

const tricepType: IExerciseType = { id: "tricepsExtension", equipment: "cable" };
const lateralType: IExerciseType = { id: "lateralRaise", equipment: "dumbbell" };

describe("Progress_applyProgramDay", () => {
  it("applies changed global rest timer to uncompleted sets", () => {
    const progress = buildProgress("# Week 1\n## Day 1\nSquat / 3x5 / 100lb / 60s\n");
    expect(progress.entries[0].sets.map((s) => s.timer)).to.eql([60, 60, 60]);

    const newProgress = applyText(progress, "# Week 1\n## Day 1\nSquat / 3x5 / 100lb / 180s\n");
    expect(newProgress.entries[0].sets.map((s) => s.timer)).to.eql([180, 180, 180]);
  });

  it("applies a rest timer added after the workout started", () => {
    const progress = buildProgress("# Week 1\n## Day 1\nSquat / 3x5 / 100lb\n");
    expect(progress.entries[0].sets.map((s) => s.timer)).to.eql([undefined, undefined, undefined]);

    const newProgress = applyText(progress, "# Week 1\n## Day 1\nSquat / 3x5 / 100lb / 120s\n");
    expect(newProgress.entries[0].sets.map((s) => s.timer)).to.eql([120, 120, 120]);
  });

  it("applies per-set rest timers", () => {
    const progress = buildProgress("# Week 1\n## Day 1\nSquat / 1x5 60s, 2x5 90s / 100lb\n");
    expect(progress.entries[0].sets.map((s) => s.timer)).to.eql([60, 90, 90]);

    const newProgress = applyText(progress, "# Week 1\n## Day 1\nSquat / 1x5 30s, 2x5 240s / 100lb\n");
    expect(newProgress.entries[0].sets.map((s) => s.timer)).to.eql([30, 240, 240]);
  });

  it("keeps the timer of already completed sets", () => {
    const progress = buildProgress("# Week 1\n## Day 1\nSquat / 3x5 / 100lb / 60s\n");
    progress.entries[0].sets[0].isCompleted = true;
    progress.entries[0].sets[0].completedReps = 5;

    const newProgress = applyText(progress, "# Week 1\n## Day 1\nSquat / 3x5 / 100lb / 180s\n");
    expect(newProgress.entries[0].sets.map((s) => s.timer)).to.eql([60, 180, 180]);
  });

  it("applies changed set timer and askWeight", () => {
    const progress = buildProgress("# Week 1\n## Day 1\nPlank / 3x5 30s|60s / 100lb\n");
    expect(progress.entries[0].sets.map((s) => s.setTimer)).to.eql([30, 30, 30]);

    const newProgress = applyText(progress, "# Week 1\n## Day 1\nPlank / 3x5 45s+|60s / 100lb+\n");
    expect(newProgress.entries[0].sets.map((s) => s.setTimer)).to.eql([45, 45, 45]);
    expect(newProgress.entries[0].sets.map((s) => s.isOverflowSetTimer)).to.eql([true, true, true]);
    expect(newProgress.entries[0].sets.map((s) => s.askWeight)).to.eql([true, true, true]);
  });
});

describe("Progress_applyProgramDay - structure - insertion", () => {
  it("inserts an exercise added to the day", () => {
    const w = workout(day(SQUAT, BENCH)).edit(day(SQUAT, BENCH, CURL));
    expect(w.keys()).to.eql([squatKey, benchKey, curlKey]);
  });

  it("builds the inserted entry with its program sets and warmups", () => {
    const w = workout(day(SQUAT)).edit(day(SQUAT, CURL));
    const inserted = w.entryAt(curlKey)!;
    const fresh = Program_nextHistoryRecordFromEvaluated(
      Program_evaluate(PlannerTestUtils_get(day(SQUAT, CURL)).program, settings),
      settings,
      Stats_getEmpty()
    ).entries[1];
    expect(inserted.sets.map((s) => s.reps)).to.eql(fresh.sets.map((s) => s.reps));
    expect(inserted.sets.map((s) => s.weight)).to.eql(fresh.sets.map((s) => s.weight));
    expect(inserted.warmupSets.length).to.eql(fresh.warmupSets.length);
  });

  it("inserts mid-day after the entry matching its program predecessor", () => {
    const w = workout(day(SQUAT, CURL)).edit(day(SQUAT, BENCH, CURL));
    expect(w.keys()).to.eql([squatKey, benchKey, curlKey]);
  });

  it("walks back when the program predecessor has no entry", () => {
    // Bench is removed from the workout, then Row is added to the day right after it — Row lands after Squat.
    const w = workout(day(SQUAT, BENCH, CURL))
      .remove(1)
      .edit(day(SQUAT, BENCH, ROW, CURL));
    expect(w.keys()).to.eql([squatKey, rowKey, curlKey]);
  });

  it("inserts at the head when added at the head of the day", () => {
    const w = workout(day(BENCH, CURL)).edit(day(SQUAT, BENCH, CURL));
    expect(w.keys()).to.eql([squatKey, benchKey, curlKey]);
  });

  it("does not re-insert an exercise the user removed from the workout", () => {
    // The day still has Curl; the user took it out of today. Editing Squat must not bring it back.
    const w = workout(day(SQUAT, CURL)).remove(1).edit(day("Squat / 5x5 / 110lb", CURL));
    expect(w.keys()).to.eql([squatKey]);
  });

  it("does not re-insert even when the removed exercise itself is edited", () => {
    const w = workout(day(SQUAT, CURL)).remove(1).edit(day(SQUAT, "Bicep Curl, Dumbbell / 4x12 / 25lb"));
    expect(w.keys()).to.eql([squatKey]);
  });

  it("inserts when a removed exercise is dropped from the day and later re-added", () => {
    const w = workout(day(SQUAT, CURL)).remove(1).edit(day(SQUAT)).edit(day(SQUAT, CURL));
    expect(w.keys()).to.eql([squatKey, curlKey]);
  });

  it("does no structural work when there is no old day to diff against", () => {
    const w = workout(day(SQUAT, BENCH)).edit(day(SQUAT, BENCH, CURL), { withOldKeys: false });
    expect(w.keys()).to.eql([squatKey, benchKey]);
  });
});

describe("Progress_applyProgramDay - structure - removal", () => {
  it("drops an untouched entry whose exercise left the day", () => {
    const w = workout(day(SQUAT, BENCH)).edit(day(SQUAT));
    expect(w.keys()).to.eql([squatKey]);
  });

  it("keeps an entry with a completed set, and keeps its program id", () => {
    const w = workout(day(SQUAT, BENCH)).complete(1, 0).edit(day(SQUAT));
    expect(w.keys()).to.eql([squatKey, benchKey]);
  });

  it("keeps an entry whose only completed set is a warmup", () => {
    const w = workout(day(SQUAT, BENCH)).completeWarmup(1, 0).edit(day(SQUAT));
    expect(w.keys()).to.eql([squatKey, benchKey]);
  });

  it("keeps a hand-swapped entry with its own exercise", () => {
    const w = workout(day(SQUAT, BENCH)).swap(1, lateralType).edit(day(SQUAT));
    expect(w.keys()).to.eql([squatKey, benchKey]);
    expect(w.exerciseIds()[1]).to.eql(lateralType.id);
  });

  it("reunites a kept entry with its exercise when it is added back, without duplicating", () => {
    const w = workout(day(SQUAT, BENCH)).complete(1, 0).edit(day(SQUAT)).edit(day(SQUAT, BENCH));
    expect(w.keys()).to.eql([squatKey, benchKey]);
    expect(w.entryAt(benchKey)!.sets[0].isCompleted).to.eql(true);
  });

  it("leaves adhoc entries alone", () => {
    const w = workout(day(SQUAT, BENCH)).addAdhoc(tricepType).edit(day(SQUAT));
    expect(w.keys()).to.eql([squatKey, undefined]);
  });
});

describe("Progress_applyProgramDay - structure - order", () => {
  it("re-sorts entries when the program order changed", () => {
    const w = workout(day(SQUAT, BENCH, CURL)).edit(day(CURL, SQUAT, BENCH));
    expect(w.keys()).to.eql([curlKey, squatKey, benchKey]);
  });

  it("leaves entry order alone when the program order did not change", () => {
    const w = workout(day(SQUAT, BENCH, CURL))
      .reorder(2, 0)
      .edit(day(SQUAT, "Bench Press, Barbell / 5x5 / 90lb", CURL));
    expect(w.keys()).to.eql([curlKey, squatKey, benchKey]);
  });

  it("lets a program reorder win over an earlier hand reorder", () => {
    const w = workout(day(SQUAT, BENCH, CURL))
      .reorder(2, 0)
      .edit(day(BENCH, CURL, SQUAT));
    expect(w.keys()).to.eql([benchKey, curlKey, squatKey]);
  });

  it("does not treat a delete that renumbers order as a reorder", () => {
    const w = workout(day(SQUAT, BENCH, CURL))
      .reorder(2, 0)
      .edit(day(SQUAT, CURL));
    expect(w.keys()).to.eql([curlKey, squatKey]);
  });

  it("keeps an adhoc entry anchored to the entry it follows", () => {
    const w = workout(day(SQUAT, BENCH, CURL))
      .addAdhoc(tricepType, 1)
      .edit(day(CURL, BENCH, SQUAT));
    expect(w.keys()).to.eql([curlKey, benchKey, squatKey, undefined]);
    expect(w.progress.entries[2].programExerciseId).to.eql(squatKey);
    expect(w.progress.entries[3].exercise.id).to.eql(tricepType.id);
  });

  it("keeps an adhoc entry at the head at the head", () => {
    const w = workout(day(SQUAT, BENCH)).addAdhoc(tricepType, 0).edit(day(BENCH, SQUAT));
    expect(w.keys()).to.eql([undefined, benchKey, squatKey]);
  });

  it("preserves the relative order of consecutive adhoc entries", () => {
    const w = workout(day(SQUAT, BENCH)).addAdhoc(tricepType, 1).addAdhoc(lateralType, 2).edit(day(BENCH, SQUAT));
    expect(w.exerciseIds()).to.eql(["benchPress", "squat", tricepType.id, lateralType.id]);
  });

  it("keeps an orphan kept for its logged sets anchored where it was", () => {
    const w = workout(day(SQUAT, BENCH, CURL))
      .complete(1, 0)
      .edit(day(CURL, SQUAT));
    expect(w.keys()).to.eql([curlKey, squatKey, benchKey]);
  });

  it("orders a workout the same way a freshly started one would be", () => {
    const text = day(CURL, SQUAT, BENCH);
    const w = workout(day(SQUAT, BENCH, CURL)).edit(text);
    const fresh = buildProgress(text);
    expect(w.keys()).to.eql(fresh.entries.map((e) => e.programExerciseId));
  });
});

describe("Progress_applyProgramDay - structure - idempotency", () => {
  it("does not compound when the same insertion is dispatched twice", () => {
    const w = workout(day(SQUAT, BENCH)).editTwice(day(SQUAT, BENCH, CURL));
    expect(w.keys()).to.eql([squatKey, benchKey, curlKey]);
  });

  it("does not compound when the same removal is dispatched twice", () => {
    const w = workout(day(SQUAT, BENCH)).editTwice(day(SQUAT));
    expect(w.keys()).to.eql([squatKey]);
  });

  it("does not compound when the same reorder is dispatched twice", () => {
    const w = workout(day(SQUAT, BENCH, CURL)).editTwice(day(CURL, BENCH, SQUAT));
    expect(w.keys()).to.eql([curlKey, benchKey, squatKey]);
  });

  it("does not compound a removal that kept a logged entry", () => {
    const w = workout(day(SQUAT, BENCH)).complete(1, 0).editTwice(day(SQUAT));
    expect(w.keys()).to.eql([squatKey, benchKey]);
  });

  it("changes nothing structural when the day did not change", () => {
    const w = workout(day(SQUAT, BENCH, CURL));
    const before = normalize(w.progress.entries).map((e) => ({ key: e.programExerciseId, sets: e.sets.length }));
    w.edit(day(SQUAT, BENCH, CURL));
    const after = normalize(w.progress.entries).map((e) => ({ key: e.programExerciseId, sets: e.sets.length }));
    expect(after).to.eql(before);
  });
});

describe("Progress_applyProgramDay - structure - existing behavior", () => {
  it("does no structural work when programExerciseIds is given", () => {
    const w = workout(day(SQUAT, BENCH));
    const oldKeys = Program_getDayExerciseKeys(
      Program_evaluate(PlannerTestUtils_get(day(SQUAT, BENCH)).program, settings),
      w.progress.day
    );
    const next = Progress_applyProgramDay(
      w.progress,
      Program_evaluate(PlannerTestUtils_get(day(SQUAT, BENCH, CURL)).program, settings),
      w.progress.day,
      settings,
      { programExerciseIds: [squatKey], oldDayKeys: oldKeys }
    );
    expect(next.entries.map((e) => e.programExerciseId)).to.eql([squatKey, benchKey]);
  });

  it("still applies value changes to entries that survive a structural edit", () => {
    const w = workout(day(SQUAT, BENCH)).edit(day("Squat / 3x5 / 150lb", BENCH, CURL));
    expect(w.keys()).to.eql([squatKey, benchKey, curlKey]);
    expect(w.entryAt(squatKey)!.sets.map((s) => s.weight?.value)).to.eql([150, 150, 150]);
  });

  it("keeps a hand-swapped entry's exercise through a structural edit", () => {
    const w = workout(day(SQUAT, BENCH))
      .swap(0, lateralType)
      .edit(day(SQUAT, BENCH, CURL));
    expect(w.exerciseIds()[0]).to.eql(lateralType.id);
  });
});

describe("Progress_reindexEntries", () => {
  function threeEntries(): IHistoryRecord {
    return buildProgress(day(SQUAT, BENCH, CURL));
  }

  it("renumbers entry.index with no gaps", () => {
    const progress = threeEntries();
    const reordered = [progress.entries[2], progress.entries[0], progress.entries[1]];
    const next = Progress_reindexEntries(progress, reordered);
    expect(next.entries.map((e) => e.index)).to.eql([0, 1, 2]);
    expect(next.entries.map((e) => e.programExerciseId)).to.eql([curlKey, squatKey, benchKey]);
  });

  it("follows currentEntryIndex across a re-sort", () => {
    const progress = { ...threeEntries(), currentEntryIndex: 2 };
    const next = Progress_reindexEntries(progress, [progress.entries[2], progress.entries[0], progress.entries[1]]);
    expect(next.currentEntryIndex).to.eql(0);
  });

  it("lands currentEntryIndex on a neighbor when its entry was dropped", () => {
    const progress = { ...threeEntries(), currentEntryIndex: 2 };
    const next = Progress_reindexEntries(progress, [progress.entries[0]]);
    expect(next.currentEntryIndex).to.eql(0);
  });

  it("clears currentEntryIndex when nothing is left", () => {
    const progress = { ...threeEntries(), currentEntryIndex: 1 };
    expect(Progress_reindexEntries(progress, []).currentEntryIndex).to.eql(undefined);
  });

  it("follows the running set timer and the open AMRAP prompt", () => {
    const base = threeEntries();
    const progress: IHistoryRecord = {
      ...base,
      timerEntryIndex: 1,
      setTimer: { entryIndex: 1, setIndex: 0, startedAt: 123 },
      amrapModal: { entryIndex: 2, setIndex: 1 },
    };
    const next = Progress_reindexEntries(progress, [progress.entries[2], progress.entries[1], progress.entries[0]]);
    expect(next.timerEntryIndex).to.eql(1);
    expect(next.setTimer?.entryIndex).to.eql(1);
    expect(next.setTimer?.startedAt).to.eql(123);
    expect(next.amrapModal?.entryIndex).to.eql(0);
  });

  it("follows a running get-ready countdown, and clears it when its entry is gone", () => {
    const base = threeEntries();
    const progress: IHistoryRecord = {
      ...base,
      setTimerGetReady: { entryIndex: 1, setIndex: 0, startedAt: 123, getReady: 5 },
    };
    const reordered = Progress_reindexEntries(progress, [
      progress.entries[2],
      progress.entries[1],
      progress.entries[0],
    ]);
    expect(reordered.setTimerGetReady?.entryIndex).to.eql(1);
    expect(reordered.setTimerGetReady?.getReady).to.eql(5);

    const dropped = Progress_reindexEntries(progress, [progress.entries[0], progress.entries[2]]);
    expect(dropped.setTimerGetReady).to.eql(undefined);
  });

  it("clears a timer and a prompt whose entry is gone rather than retargeting them", () => {
    const base = threeEntries();
    const progress: IHistoryRecord = {
      ...base,
      timerEntryIndex: 2,
      setTimer: { entryIndex: 2, setIndex: 0, startedAt: 123 },
      amrapModal: { entryIndex: 2, setIndex: 1 },
    };
    const next = Progress_reindexEntries(progress, [progress.entries[0], progress.entries[1]]);
    expect(next.timerEntryIndex).to.eql(undefined);
    expect(next.setTimer).to.eql(undefined);
    expect(next.amrapModal).to.eql(undefined);
  });

  it("follows every ui index, and clears the ones whose entry is gone", () => {
    const base = threeEntries();
    const progress: IHistoryRecord = {
      ...base,
      ui: {
        editModal: { programExerciseId: benchKey, entryIndex: 1 },
        setTimerEditModal: { entryIndex: 1, setIndex: 0 },
        roundingModal: { entryIndex: 2, setIndex: 0 },
        exerciseBottomSheet: { entryIndex: 0 },
        entryIndexEditMode: 2,
      },
    };
    const next = Progress_reindexEntries(progress, [progress.entries[1], progress.entries[0]]);
    expect(next.ui?.editModal?.entryIndex).to.eql(0);
    expect(next.ui?.setTimerEditModal?.entryIndex).to.eql(0);
    expect(next.ui?.exerciseBottomSheet?.entryIndex).to.eql(1);
    expect(next.ui?.roundingModal).to.eql(undefined);
    expect(next.ui?.entryIndexEditMode).to.eql(undefined);
  });
});

describe("Progress_reindexEntries - review findings", () => {
  function threeEntries(): IHistoryRecord {
    return buildProgress(day(SQUAT, BENCH, CURL));
  }

  // What the workout kebab's "Swap exercise" opens with.
  const emptyPickerState: IExercisePickerState = {
    mode: "workout",
    screenStack: ["exercisePicker"],
    sort: "name_asc",
    filters: {},
    selectedExercises: [],
  };

  it("tells two entries of the same exercise apart", () => {
    // Entry ids come from the exercise, so a program Squat and an ad-hoc Squat carry the same one. Matching by
    // id would hand the timer to whichever the lookup happened to keep.
    const base = threeEntries();
    const adhocSquat = History_createCustomEntry(base.entries[0].exercise, 3);
    expect(adhocSquat.id).to.eql(base.entries[0].id);
    const progress: IHistoryRecord = {
      ...base,
      entries: [...base.entries, adhocSquat],
      timerEntryIndex: 0,
      setTimer: { entryIndex: 0, setIndex: 0, startedAt: 123 },
    };
    const next = Progress_reindexEntries(progress, [adhocSquat, ...base.entries]);
    expect(next.timerEntryIndex).to.eql(1);
    expect(next.setTimer?.entryIndex).to.eql(1);
  });

  it("moves the pager when the selected entry changes position", () => {
    const progress = { ...threeEntries(), currentEntryIndex: 0, ui: { forceUpdateEntryIndex: false } };
    const next = Progress_reindexEntries(progress, [progress.entries[1], progress.entries[0], progress.entries[2]]);
    expect(next.currentEntryIndex).to.eql(1);
    expect(next.ui?.forceUpdateEntryIndex).to.eql(true);
  });

  it("leaves the pager alone when the selected entry did not move", () => {
    const progress = { ...threeEntries(), currentEntryIndex: 0, ui: { forceUpdateEntryIndex: false } };
    const next = Progress_reindexEntries(progress, [progress.entries[0], progress.entries[2], progress.entries[1]]);
    expect(next.currentEntryIndex).to.eql(0);
    expect(next.ui?.forceUpdateEntryIndex).to.eql(false);
  });

  it("follows the open swap picker's target entry", () => {
    const base = threeEntries();
    const progress: IHistoryRecord = {
      ...base,
      ui: { exercisePicker: { state: { ...emptyPickerState, entryIndex: 2 } } },
    };
    const next = Progress_reindexEntries(progress, [progress.entries[2], progress.entries[0]]);
    expect(next.ui?.exercisePicker?.state?.entryIndex).to.eql(0);
  });

  it("clears the swap picker's target when its entry is gone", () => {
    const base = threeEntries();
    const progress: IHistoryRecord = {
      ...base,
      ui: { exercisePicker: { state: { ...emptyPickerState, entryIndex: 2 } } },
    };
    const next = Progress_reindexEntries(progress, [progress.entries[0], progress.entries[1]]);
    expect(next.ui?.exercisePicker?.state?.entryIndex).to.eql(undefined);
  });
});
