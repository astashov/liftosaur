import "mocha";
import { expect } from "chai";
import { ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords } from "../src/utils/importFromLiftosaur";
import { ImportFileError } from "../src/utils/importTypes";
import { History_exportAsCSV } from "../src/models/history";
import { CSV_toString } from "../src/utils/csv";
import { Settings_build } from "../src/models/settings";
import { Weight_build } from "../src/models/weight";
import { IHistoryRecord, ISettings } from "../src/types";

const header =
  "Workout DateTime,Program,Day Name,Exercise,Is Warmup Set?,Required Reps,Completed Reps,Is AMRAP?," +
  "Required RPE,Completed RPE,Log RPE?,Required Weight Value,Required Weight Unit,Completed Weight Value," +
  "Completed Weight Unit,Ask Weight?,Completed Reps Time,Target Muscles,Synergist Muscles,Notes";

function row(overrides: Partial<Record<string, string>> = {}): string {
  const cells: Record<string, string> = {
    workoutDateTime: "2026-03-01T10:00:00.000Z",
    program: "My Program",
    dayname: "Day 1",
    exercise: "Squat",
    isWarmupSet: "0",
    requiredReps: "5",
    completedReps: "5",
    isAmrap: "0",
    rpe: "",
    completedRpe: "",
    logRpe: "0",
    weightValue: "225",
    weightUnit: "lb",
    completedWeightValue: "225",
    completedWeightUnit: "lb",
    askWeight: "0",
    completedRepsTime: "2026-03-01T10:05:00.000Z",
    targetMuscles: "",
    synergistMuscles: "",
    notes: "",
    ...overrides,
  };
  return [
    cells.workoutDateTime,
    cells.program,
    cells.dayname,
    cells.exercise,
    cells.isWarmupSet,
    cells.requiredReps,
    cells.completedReps,
    cells.isAmrap,
    cells.rpe,
    cells.completedRpe,
    cells.logRpe,
    cells.weightValue,
    cells.weightUnit,
    cells.completedWeightValue,
    cells.completedWeightUnit,
    cells.askWeight,
    cells.completedRepsTime,
    cells.targetMuscles,
    cells.synergistMuscles,
    cells.notes,
  ].join(",");
}

function buildCsv(...rows: string[]): string {
  return [header, ...rows].join("\n");
}

function buildSettings(): ISettings {
  return Settings_build();
}

describe("ImportFromLiftosaur", () => {
  it("imports a valid CSV", () => {
    const result = ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(
      buildCsv(row(), row({ completedReps: "4" })),
      buildSettings()
    );
    expect(result.errors).to.eql([]);
    expect(result.historyRecords).to.have.length(1);
    const record = result.historyRecords[0];
    expect(record.entries).to.have.length(1);
    expect(record.entries[0].sets).to.have.length(2);
    expect(record.entries[0].sets[0].completedWeight).to.eql(Weight_build(225, "lb"));
    expect(record.programName).to.equal("My Program");
  });

  it("round-trips its own export", () => {
    const settings = buildSettings();
    const imported = ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(buildCsv(row()), settings);
    const exported = CSV_toString(History_exportAsCSV(imported.historyRecords, settings));
    const reimported = ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(exported, settings);
    expect(reimported.errors).to.eql([]);
    expect(reimported.historyRecords).to.have.length(1);
    const [a, b]: IHistoryRecord[] = [imported.historyRecords[0], reimported.historyRecords[0]];
    expect(b.entries[0].sets[0].completedReps).to.equal(a.entries[0].sets[0].completedReps);
    expect(b.entries[0].sets[0].completedWeight).to.eql(a.entries[0].sets[0].completedWeight);
    expect(b.startTime).to.equal(a.startTime);
  });

  it("skips rows with bad numbers and reports row errors", () => {
    const result = ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(
      buildCsv(row(), row({ completedReps: "five" }), row({ completedReps: "3" })),
      buildSettings()
    );
    expect(result.errors).to.have.length(1);
    expect(result.errors[0].row).to.equal(3);
    expect(result.errors[0].message).to.contain("five");
    expect(result.historyRecords[0].entries[0].sets).to.have.length(2);
  });

  it("skips rows with bad dates", () => {
    const result = ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(
      buildCsv(row(), row({ workoutDateTime: "not-a-date" })),
      buildSettings()
    );
    expect(result.errors).to.have.length(1);
    expect(result.errors[0].column).to.equal("Workout DateTime");
    expect(result.historyRecords).to.have.length(1);
  });

  it("skips rows with bad units", () => {
    const result = ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(
      buildCsv(row(), row({ weightUnit: "stone" })),
      buildSettings()
    );
    expect(result.errors).to.have.length(1);
    expect(result.errors[0].message).to.contain("stone");
  });

  it("throws a Hevy-specific error for a Hevy CSV", () => {
    const hevyCsv =
      "title,start_time,end_time,description,exercise_title,exercise_notes,set_index,set_type,weight_lbs,reps\n" +
      '"Workout","13 Mar 2026, 15:22","13 Mar 2026, 16:00","","Squat (Barbell)","",0,normal,225,5';
    expect(() => ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(hevyCsv, buildSettings())).to.throw(
      ImportFileError,
      /Hevy/
    );
  });

  it("throws a generic error for an unknown CSV", () => {
    const csv = "a,b,c\n1,2,3";
    expect(() => ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(csv, buildSettings())).to.throw(
      ImportFileError,
      /doesn't look like a Liftosaur history CSV/
    );
  });

  it("throws when most rows fail to parse", () => {
    const result = (): unknown =>
      ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(
        buildCsv(row({ completedReps: "x" }), row({ requiredReps: "y" }), row()),
        buildSettings()
      );
    expect(result).to.throw(ImportFileError, /failed to parse/);
  });

  it("produces warnings for implausible values but still imports", () => {
    const result = ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(
      buildCsv(
        row({ weightValue: "9999", completedWeightValue: "9999" }),
        row({ completedReps: "5000" }),
        row({ workoutDateTime: "1999-01-01T10:00:00.000Z", completedRepsTime: "1999-01-01T10:05:00.000Z" })
      ),
      buildSettings()
    );
    expect(result.errors).to.eql([]);
    expect(result.historyRecords).to.have.length(2);
    expect(result.warnings.map((w) => w.column)).to.include.members([
      "weightValue",
      "completedReps",
      "Workout DateTime",
    ]);
  });

  it("warns (not errors) on a malformed completed reps time and falls back to the workout date", () => {
    const result = ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(
      buildCsv(row({ completedRepsTime: "not-a-time" })),
      buildSettings()
    );
    expect(result.errors).to.eql([]);
    expect(result.historyRecords).to.have.length(1);
    expect(result.warnings.map((w) => w.column)).to.include("Completed Reps Time");
    expect(result.historyRecords[0].entries[0].sets[0].timestamp).to.equal(result.historyRecords[0].startTime);
  });

  it("creates custom exercises for unknown names", () => {
    const result = ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(
      buildCsv(row({ exercise: "Mystery Movement", targetMuscles: "Pectoralis Major Sternal Head" })),
      buildSettings()
    );
    expect(result.errors).to.eql([]);
    const custom = result.customExercises["mystery-movement"];
    expect(custom?.name).to.equal("Mystery Movement");
    expect(result.historyRecords[0].entries[0].exercise.id).to.equal("mystery-movement");
  });
});
