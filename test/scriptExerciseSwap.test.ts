import "mocha";
import { expect } from "chai";
import {
  Program_computeProgressStateChanges,
  Program_evaluate,
  Program_nextHistoryRecordFromEvaluated,
  Program_runFinishDayScript,
} from "../src/models/program";
import { Progress_runUpdateScriptForEntry } from "../src/models/progress";
import { Settings_build } from "../src/models/settings";
import { Stats_getEmpty } from "../src/models/stats";
import { IHistoryEntry } from "../src/types";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";

const programText = `# Week 1
## Day 1
t1: Squat / 2x5 / 100lb / update: custom() {~
  print(isExercise("Front Squat"), exercise)
~} / progress: custom() {~
  if (isExercise("Front Squat") && isProgramExercise("t1: Squat")) {
    weights += 10lb
  }
  print(exercise)
~}`;

describe("scripts after swapping the exercise during a workout", () => {
  const settings = Settings_build();
  const stats = Stats_getEmpty();
  const evaluated = Program_evaluate(PlannerTestUtils_get(programText).program, settings);
  const programExercise = evaluated.weeks[0].days[0].exercises[0];
  const plannedEntry = Program_nextHistoryRecordFromEvaluated(evaluated, settings, stats).entries[0];

  function completed(entry: IHistoryEntry): IHistoryEntry {
    return {
      ...entry,
      sets: entry.sets.map((set) => ({ ...set, completedReps: 5, completedWeight: set.weight, isCompleted: true })),
    };
  }

  const swappedEntry = completed({ ...plannedEntry, exercise: { id: "frontSquat", equipment: "barbell" } });
  const plannedCompletedEntry = completed(plannedEntry);

  it("matches the swapped-in exercise in the finish preview", () => {
    const changes = Program_computeProgressStateChanges(
      swappedEntry,
      programExercise.dayData,
      settings,
      programExercise,
      evaluated,
      stats
    );
    expect(changes?.diffVars).to.eql({ weights: "+= 10lb" });
    expect(changes?.prints).to.eql(["t1: Front Squat"]);
  });

  it("matches the swapped-in exercise in the real finish, agreeing with the preview", () => {
    const result = Program_runFinishDayScript(
      programExercise,
      evaluated,
      programExercise.dayData,
      swappedEntry,
      settings,
      stats
    );
    expect(result.success).to.equal(true);
    const weightUpdates = result.success ? result.data.updates.filter((u) => u.type === "weights") : [];
    expect(weightUpdates.length).to.equal(1);
  });

  it("matches the swapped-in exercise in the update script", () => {
    const updated = Progress_runUpdateScriptForEntry(
      swappedEntry,
      programExercise.dayData,
      programExercise,
      evaluated.states,
      0,
      settings,
      stats
    );
    expect(updated.updatePrintLines).to.eql(["true, t1: Front Squat"]);
  });

  it("does not match the swapped-in exercise when the entry kept the planned one", () => {
    const changes = Program_computeProgressStateChanges(
      plannedCompletedEntry,
      programExercise.dayData,
      settings,
      programExercise,
      evaluated,
      stats
    );
    expect(changes?.diffVars).to.eql({});
    expect(changes?.prints).to.eql(["t1: Squat"]);
  });
});
