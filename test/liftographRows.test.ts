import "mocha";
import { expect } from "chai";
import { LiftographRows_build } from "../src/liftograph/liftographRows";
import { fxDay, fxEntry, fxRecord, fxSet, fxSettings, fxStats } from "./liftographFixtures";

const settings = fxSettings();

describe("LiftographRows_build", () => {
  it("orders rows by start time, record id and entry index, and skips open workouts", () => {
    const late = fxRecord(fxDay(2026, 3, 2), [fxEntry("squat", [fxSet(100, 5)])]);
    const early = fxRecord(fxDay(2026, 3, 1), [fxEntry("squat", [fxSet(90, 5)]), fxEntry("squat", [fxSet(95, 5)])]);
    const open = fxRecord(fxDay(2026, 3, 3), [fxEntry("squat", [fxSet(110, 5)])], { open: true });
    const rows = LiftographRows_build(
      { type: "exercise", exerciseId: "squat" },
      [late, open, early],
      fxStats(),
      settings
    );
    expect(rows.map((r) => r.id)).to.deep.equal([
      `${early.id}:${early.entries[0].id}`,
      `${early.id}:${early.entries[1].id}`,
      `${late.id}:${late.entries[0].id}`,
    ]);
  });

  it("filters by equipment, label, program and day", () => {
    const record = fxRecord(
      fxDay(2026, 3, 1),
      [
        fxEntry("squat", [fxSet(100, 5)], { programExerciseId: "t1-squat_barbell" }),
        fxEntry("squat", [fxSet(80, 8)], { programExerciseId: "t2-squat_barbell" }),
        fxEntry("squat", [fxSet(40, 8)], { equipment: "dumbbell" }),
      ],
      { programName: "GZCLP", day: 2, dayName: "Heavy" }
    );
    const ids = (source: Parameters<typeof LiftographRows_build>[0]): string[] =>
      LiftographRows_build(source, [record], fxStats(), settings).map((r) => r.id.split(":")[1]);
    const [t1, t2, db] = record.entries.map((e) => e.id);
    expect(ids({ type: "exercise", exerciseId: "squat", equipment: "barbell" })).to.deep.equal([t1, t2]);
    expect(ids({ type: "exercise", label: "T1" })).to.deep.equal([t1]);
    expect(ids({ type: "exercise", program: "gzclp", day: 2 })).to.deep.equal([t1, t2, db]);
    expect(ids({ type: "exercise", day: "heavy" })).to.deep.equal([t1, t2, db]);
    expect(ids({ type: "exercise", program: "5/3/1" })).to.deep.equal([]);
  });

  it("reads a missing equipment as the exercise's default equipment", () => {
    const record = fxRecord(fxDay(2026, 3, 1), [
      fxEntry("squat", [fxSet(100, 5)]),
      fxEntry("squat", [fxSet(40, 8)], { equipment: "dumbbell" }),
    ]);
    const unset = { ...record.entries[0], exercise: { id: "squat" } };
    const withUnset = { ...record, entries: [...record.entries, unset] };
    const [barbell, db] = record.entries.map((e) => e.id);
    const ids = (source: Parameters<typeof LiftographRows_build>[0]): string[] =>
      LiftographRows_build(source, [withUnset], fxStats(), settings).map((r) => r.id.split(":")[1]);
    expect(ids({ type: "exercise", exerciseId: "squat" })).to.deep.equal([barbell, unset.id]);
    expect(ids({ type: "exercise", exerciseId: "squat", equipment: "barbell" })).to.deep.equal([barbell, unset.id]);
    expect(ids({ type: "exercise", exerciseId: "squat", equipment: "dumbbell" })).to.deep.equal([db]);
  });

  it("dates a row by its start time, which keeps the time of day after a date edit", () => {
    const record = {
      ...fxRecord(fxDay(2026, 3, 1, 10), [fxEntry("squat", [fxSet(100, 5)])]),
      date: "2026-03-01T00:00:00.000Z",
    };
    const [row] = LiftographRows_build({ type: "workout" }, [record], fxStats(), settings);
    expect(row.ts).to.equal(fxDay(2026, 3, 1, 10).getTime());
  });

  it("gives one row per workout and per stat value", () => {
    const record = fxRecord(fxDay(2026, 3, 1), [fxEntry("squat", [fxSet(100, 5)])]);
    expect(LiftographRows_build({ type: "workout" }, [record], fxStats(), settings).map((r) => r.type)).to.deep.equal([
      "workout",
    ]);
    const stats = fxStats([
      [fxDay(2026, 3, 2), 181],
      [fxDay(2026, 3, 1), 180],
    ]);
    const rows = LiftographRows_build({ type: "stats", key: "weight" }, [], stats, settings);
    expect(rows.map((r) => (r.type === "stats" ? r.value : undefined))).to.deep.equal([
      { value: 180, unit: "lb" },
      { value: 181, unit: "lb" },
    ]);
  });

  it("converts length stats to plain numbers in the user's length unit", () => {
    const stats = fxStats();
    stats.length.bicepLeft = [
      { vtype: "stat", value: { value: 2.54, unit: "cm" }, timestamp: fxDay(2026, 3, 1).getTime() },
    ];
    const rows = LiftographRows_build({ type: "stats", key: "bicepLeft" }, [], stats, settings);
    expect(rows.map((r) => (r.type === "stats" ? r.value : undefined))).to.deep.equal([1]);
  });

  it("reads sleep in hours and skips hidden health records", () => {
    const stats = fxStats();
    stats.health = {
      sleep: [
        { vtype: "stat", value: 450, timestamp: fxDay(2026, 3, 2).getTime() },
        { vtype: "stat", value: 300, timestamp: fxDay(2026, 3, 3).getTime(), hidden: true },
        { vtype: "stat", value: 480, timestamp: fxDay(2026, 3, 1).getTime() },
      ],
      protein: [{ vtype: "stat", value: 160, timestamp: fxDay(2026, 3, 1).getTime() }],
    };
    const sleep = LiftographRows_build({ type: "stats", key: "sleep" }, [], stats, settings);
    expect(sleep.map((r) => (r.type === "stats" ? r.value : undefined))).to.deep.equal([8, 7.5]);
    const protein = LiftographRows_build({ type: "stats", key: "protein" }, [], stats, settings);
    expect(protein.map((r) => (r.type === "stats" ? r.value : undefined))).to.deep.equal([160]);
  });
});
