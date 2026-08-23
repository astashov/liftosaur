import "mocha";
import { expect } from "chai";
import {
  Program_addDayFromHistoryRecord,
  Program_createFromHistoryRecord,
  Program_evaluate,
} from "../src/models/program";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { Settings_build } from "../src/models/settings";
import { IExerciseType, IHistoryEntry, IHistoryRecord, ISet, IWeight } from "../src/types";
import { UidFactory_generateUid } from "../src/utils/generator";

const benchPress: IExerciseType = { id: "benchPress", equipment: "barbell" };
const bentOverRow: IExerciseType = { id: "bentOverRow", equipment: "barbell" };
const squat: IExerciseType = { id: "squat", equipment: "barbell" };

function lb(value: number): IWeight {
  return { value, unit: "lb" };
}

function completedSet(reps: number, weight: IWeight): ISet {
  return {
    vtype: "set",
    id: UidFactory_generateUid(6),
    index: 0,
    reps,
    weight,
    originalWeight: weight,
    isCompleted: true,
    completedReps: reps,
    completedWeight: weight,
  };
}

function entry(exercise: IExerciseType, superset?: string): IHistoryEntry {
  return {
    vtype: "history_entry",
    index: 0,
    id: UidFactory_generateUid(6),
    exercise,
    sets: [completedSet(5, lb(100))],
    warmupSets: [],
    superset,
  };
}

function record(entries: IHistoryEntry[]): IHistoryRecord {
  return {
    vtype: "history_record",
    id: 1,
    date: new Date(2026, 0, 1).toISOString(),
    programId: "p",
    programName: "P",
    day: 1,
    dayName: "Day 1",
    startTime: 1,
    endTime: 2,
    entries,
  };
}

describe("program day from adhoc workout", () => {
  const settings = Settings_build();

  it("carries supersets over when creating a new program", () => {
    const program = Program_createFromHistoryRecord(
      "MyProgram",
      record([entry(benchPress, "A"), entry(bentOverRow, "A"), entry(squat)]),
      settings
    );
    const text = program.planner!.weeks[0].days[0].exerciseText;
    expect(text).to.match(/Bench Press.*\/ superset: A/);
    expect(text).to.match(/Bent Over Row.*\/ superset: A/);
    expect(text).to.not.match(/Squat.*superset/);
  });

  it("carries supersets over when adding a day to an existing program", () => {
    const { program } = PlannerTestUtils_get("# Week 1\n## Day 1\nSquat / 3x5 / 100lb\n");
    const { program: newProgram, dayData } = Program_addDayFromHistoryRecord(
      program,
      1,
      record([entry(benchPress, "A"), entry(bentOverRow, "A")]),
      settings
    );
    const text = newProgram.planner!.weeks[dayData.week - 1].days[dayData.dayInWeek - 1].exerciseText;
    expect(text).to.match(/Bench Press.*\/ superset: A/);
    expect(text).to.match(/Bent Over Row.*\/ superset: A/);

    const evaluated = Program_evaluate(newProgram, settings);
    const exercises = evaluated.weeks[dayData.week - 1].days[dayData.dayInWeek - 1].exercises;
    expect(exercises.map((e) => e.superset?.name)).to.eql(["A", "A"]);
  });
});
