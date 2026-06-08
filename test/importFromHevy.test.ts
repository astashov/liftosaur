import "mocha";
import { expect } from "chai";
import { ImportFromHevy_convertHevyCsvToHistoryRecords } from "../src/utils/importFromHevy";
import { ImportFileError } from "../src/utils/importTypes";
import { Settings_build } from "../src/models/settings";
import { Weight_build } from "../src/models/weight";
import { ISettings } from "../src/types";

const header =
  "title,start_time,end_time,description,exercise_title,exercise_notes,set_index,set_type,weight_lbs,weight_kg,reps";

function row(overrides: Partial<Record<string, string>> = {}): string {
  const cells: Record<string, string> = {
    title: "Morning Workout",
    start_time: '"13 Mar 2026, 15:22"',
    end_time: '"13 Mar 2026, 16:00"',
    description: "",
    exercise_title: "Squat (Barbell)",
    exercise_notes: "",
    set_index: "0",
    set_type: "normal",
    weight_lbs: "225",
    weight_kg: "",
    reps: "5",
    ...overrides,
  };
  return [
    cells.title,
    cells.start_time,
    cells.end_time,
    cells.description,
    cells.exercise_title,
    cells.exercise_notes,
    cells.set_index,
    cells.set_type,
    cells.weight_lbs,
    cells.weight_kg,
    cells.reps,
  ].join(",");
}

function buildCsv(...rows: string[]): string {
  return [header, ...rows].join("\n");
}

function buildSettings(): ISettings {
  return Settings_build();
}

describe("ImportFromHevy", () => {
  it("imports a valid Hevy CSV with warmup split and weight units", () => {
    const result = ImportFromHevy_convertHevyCsvToHistoryRecords(
      buildCsv(
        row({ set_type: "warmup", set_index: "0", weight_lbs: "135" }),
        row({ set_index: "1" }),
        row({ set_index: "2", exercise_title: "Bench Press (Barbell)", weight_lbs: "", weight_kg: "100" })
      ),
      buildSettings()
    );
    expect(result.errors).to.eql([]);
    expect(result.historyRecords).to.have.length(1);
    const record = result.historyRecords[0];
    expect(record.programName).to.equal("Hevy");
    expect(record.dayName).to.equal("Morning Workout");
    expect(record.entries).to.have.length(2);
    const squat = record.entries[0];
    expect(squat.exercise.id).to.equal("squat");
    expect(squat.warmupSets).to.have.length(1);
    expect(squat.warmupSets[0].weight).to.eql(Weight_build(135, "lb"));
    expect(squat.sets).to.have.length(1);
    const bench = record.entries[1];
    expect(bench.sets[0].weight).to.eql(Weight_build(100, "kg"));
    expect(record.startTime).to.equal(new Date(2026, 2, 13, 15, 22).getTime());
    expect(record.endTime).to.equal(new Date(2026, 2, 13, 16, 0).getTime());
  });

  it("leaves weight undefined for a bodyweight set instead of fabricating 0kg", () => {
    const result = ImportFromHevy_convertHevyCsvToHistoryRecords(
      buildCsv(row({ exercise_title: "Pull Up", weight_lbs: "", weight_kg: "", reps: "10" })),
      buildSettings()
    );
    expect(result.errors).to.eql([]);
    const set = result.historyRecords[0].entries[0].sets[0];
    expect(set.weight).to.equal(undefined);
    expect(set.completedWeight).to.equal(undefined);
    expect(set.originalWeight).to.equal(undefined);
    expect(set.completedReps).to.equal(10);
  });

  it("creates custom exercises for unknown Hevy exercise names and reuses ids", () => {
    const result = ImportFromHevy_convertHevyCsvToHistoryRecords(
      buildCsv(
        row({ exercise_title: "Some Obscure Movement", set_index: "0" }),
        row({
          exercise_title: "Some Obscure Movement",
          set_index: "1",
          start_time: '"14 Mar 2026, 15:22"',
          end_time: '"14 Mar 2026, 16:00"',
        })
      ),
      buildSettings()
    );
    expect(result.errors).to.eql([]);
    const ids = Object.keys(result.customExercises);
    expect(ids).to.have.length(1);
    expect(result.customExercises[ids[0]]?.name).to.equal("Some Obscure Movement");
    expect(result.historyRecords[0].entries[0].exercise.id).to.equal(ids[0]);
    expect(result.historyRecords[1].entries[0].exercise.id).to.equal(ids[0]);
  });

  it("skips rows with malformed dates and reports row errors", () => {
    const result = ImportFromHevy_convertHevyCsvToHistoryRecords(
      buildCsv(row(), row({ start_time: "garbage", end_time: "garbage", set_index: "1" })),
      buildSettings()
    );
    expect(result.errors).to.have.length(1);
    expect(result.errors[0].row).to.equal(3);
    expect(result.errors[0].column).to.equal("start_time");
    expect(result.historyRecords).to.have.length(1);
    expect(result.historyRecords[0].entries[0].sets).to.have.length(1);
  });

  it("falls back to start time with a warning when end_time is invalid", () => {
    const result = ImportFromHevy_convertHevyCsvToHistoryRecords(buildCsv(row({ end_time: "soon" })), buildSettings());
    expect(result.errors).to.eql([]);
    expect(result.warnings.map((w) => w.column)).to.include("end_time");
    expect(result.historyRecords[0].endTime).to.equal(result.historyRecords[0].startTime);
  });

  it("throws a Liftosaur-specific error for a Liftosaur CSV", () => {
    const liftosaurCsv =
      "Workout DateTime,Program,Day Name,Exercise,Is Warmup Set?,Required Reps,Completed Reps,Is AMRAP?," +
      "Required RPE,Completed RPE,Log RPE?,Required Weight Value,Required Weight Unit,Completed Weight Value," +
      "Completed Weight Unit,Ask Weight?,Completed Reps Time,Target Muscles,Synergist Muscles,Notes\n" +
      "2026-03-01T10:00:00.000Z,P,Day 1,Squat,0,5,5,0,,,0,225,lb,225,lb,0,2026-03-01T10:05:00.000Z,,,";
    expect(() => ImportFromHevy_convertHevyCsvToHistoryRecords(liftosaurCsv, buildSettings())).to.throw(
      ImportFileError,
      /Liftosaur/
    );
  });

  it("throws a generic error for non-Hevy garbage", () => {
    expect(() => ImportFromHevy_convertHevyCsvToHistoryRecords("a,b,c\n1,2,3", buildSettings())).to.throw(
      ImportFileError,
      /doesn't look like a Hevy/
    );
  });

  it("throws when most rows fail to parse", () => {
    expect(() =>
      ImportFromHevy_convertHevyCsvToHistoryRecords(
        buildCsv(row({ start_time: "x", end_time: "x" }), row({ start_time: "y", end_time: "y" }), row()),
        buildSettings()
      )
    ).to.throw(ImportFileError, /failed to parse/);
  });

  it("warns about implausible weights and reps but still imports", () => {
    const result = ImportFromHevy_convertHevyCsvToHistoryRecords(
      buildCsv(row({ weight_lbs: "9999", reps: "5000" })),
      buildSettings()
    );
    expect(result.errors).to.eql([]);
    expect(result.historyRecords).to.have.length(1);
    expect(result.warnings.map((w) => w.column)).to.include.members(["weight_lbs", "reps"]);
  });
});
