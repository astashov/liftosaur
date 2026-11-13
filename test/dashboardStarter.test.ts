import "mocha";
import { expect } from "chai";
import {
  DashboardStarter_isOffered,
  DashboardStarter_lifts,
  DashboardStarter_text,
} from "../src/models/dashboardStarter";
import { DashboardApi_compileErrors } from "../src/models/dashboardApi";
import { Program_evaluate } from "../src/models/program";
import { Exercise_createCustomExercise } from "../src/models/exercise";
import { IDashboard, IExerciseType } from "../src/types";
import { PlannerTestUtils_get } from "./utils/plannerTestUtils";
import { fxDay, fxEntry, fxRecord, fxSet, fxSettings } from "./liftographFixtures";

const settings = fxSettings();
const now = fxDay(2026, 11, 12).getTime();
const noProgram = (): undefined => undefined;

function dashboard(id: string, text: string): IDashboard {
  return { vtype: "dashboard", id, name: id, text };
}

function lifted(exerciseId: string, weight: number = 100, equipment?: string): ReturnType<typeof fxEntry> {
  return fxEntry(exerciseId, [fxSet(weight, 5)], { equipment });
}

function ids(lifts: IExerciseType[]): string[] {
  return lifts.map((l) => l.id);
}

describe("DashboardStarter", () => {
  it("is offered only for a single dashboard with no rows", () => {
    expect(DashboardStarter_isOffered(undefined, 0)).to.equal(true);
    expect(DashboardStarter_isOffered([dashboard("graphs", "")], 0)).to.equal(true);
    expect(DashboardStarter_isOffered([dashboard("graphs", "calendar")], 1)).to.equal(false);
    expect(DashboardStarter_isOffered([dashboard("graphs", ""), dashboard("b", "")], 0)).to.equal(false);
  });

  it("picks the most-trained weighted lifts from recent history", () => {
    const history = [
      fxRecord(fxDay(2026, 11, 10), [lifted("squat"), lifted("benchPress"), lifted("pullup", 0)]),
      fxRecord(fxDay(2026, 11, 8), [lifted("squat"), lifted("deadlift"), lifted("chinUp", 50, "bodyweight")]),
      fxRecord(fxDay(2026, 11, 6), [lifted("squat"), lifted("deadlift"), lifted("overheadPress")]),
      fxRecord(fxDay(2026, 11, 4), [fxEntry("benchPress", [fxSet(100, undefined)])]),
      fxRecord(fxDay(2026, 1, 1), [lifted("overheadPress"), lifted("overheadPress")]),
      fxRecord(fxDay(2026, 11, 2), [lifted("nopeLift")]),
    ];
    let called = false;
    const lifts = DashboardStarter_lifts(
      history,
      () => {
        called = true;
        return undefined;
      },
      settings,
      now
    );
    expect(ids(lifts)).to.deep.equal(["squat", "deadlift", "benchPress"]);
    expect(called).to.equal(false);
  });

  it("counts an exercise once per workout and caps at three", () => {
    const history = [
      fxRecord(fxDay(2026, 11, 10), [lifted("squat"), lifted("squat"), lifted("benchPress")]),
      fxRecord(fxDay(2026, 11, 9), [lifted("benchPress"), lifted("deadlift"), lifted("overheadPress")]),
    ];
    expect(ids(DashboardStarter_lifts(history, noProgram, settings, now))).to.deep.equal([
      "benchPress",
      "squat",
      "deadlift",
    ]);
  });

  it("puts barbell lifts before more frequent dumbbell lifts, and breaks ties by e1RM", () => {
    const history = [
      fxRecord(fxDay(2026, 11, 10), [lifted("lateralRaise", 15, "dumbbell"), lifted("frontSquat", 150)]),
      fxRecord(fxDay(2026, 11, 8), [lifted("lateralRaise", 15, "dumbbell"), lifted("squat", 200)]),
      fxRecord(fxDay(2026, 11, 6), [lifted("lateralRaise", 15, "dumbbell"), lifted("deadlift", 250, "trapbar")]),
    ];
    expect(ids(DashboardStarter_lifts(history, noProgram, settings, now))).to.deep.equal([
      "deadlift",
      "squat",
      "frontSquat",
    ]);
  });

  it("fills with other lifts when there are fewer than three barbell lifts", () => {
    const history = [
      fxRecord(fxDay(2026, 11, 10), [lifted("lateralRaise", 15, "dumbbell"), lifted("squat", 200)]),
      fxRecord(fxDay(2026, 11, 8), [
        lifted("lateralRaise", 15, "dumbbell"),
        lifted("legPress", 400, "leverageMachine"),
      ]),
    ];
    expect(ids(DashboardStarter_lifts(history, noProgram, settings, now))).to.deep.equal([
      "squat",
      "lateralRaise",
      "legPress",
    ]);
  });

  it("skips a lift whose name a custom exercise takes over, and refills the slot", () => {
    const custom = Exercise_createCustomExercise("Squat", [], [], []);
    const withCustom = { ...settings, exercises: { ...settings.exercises, [custom.id]: custom } };
    const history = [
      fxRecord(fxDay(2026, 11, 10), [lifted("squat"), lifted("benchPress"), lifted("deadlift")]),
      fxRecord(fxDay(2026, 11, 8), [lifted("squat"), lifted("overheadPress")]),
    ];
    expect(ids(DashboardStarter_lifts(history, noProgram, withCustom, now))).to.deep.equal([
      "benchPress",
      "deadlift",
      "overheadPress",
    ]);
  });

  it("labels a lift by its alias, and adds the equipment only when it isn't the default", () => {
    const text = DashboardStarter_text(
      [
        { id: "benchPress", equipment: "barbell" },
        { id: "benchPress", equipment: "dumbbell" },
      ],
      settings
    );
    expect(text).to.include("  value / name: Bench Press / source: exercise(Bench Press, Barbell)");
    expect(text).to.include('  value / name: "Bench Press, Dumbbell" / source: exercise(Bench Press, Dumbbell)');
    expect(DashboardApi_compileErrors(text, settings)).to.deep.equal([]);
  });

  it("falls back to the program's most frequent lifts", () => {
    const { program } = PlannerTestUtils_get(
      "# Week 1\n## Day 1\nSquat / 3x5 / 100lb\nBench Press / 3x5 / 100lb\nPull Up / 3x5\n## Day 2\nSquat / 3x5 / 100lb\nDeadlift / 1x5 / 100lb\n"
    );
    const evaluated = Program_evaluate(program, settings);
    const lifts = DashboardStarter_lifts([], () => evaluated, settings, now);
    expect(ids(lifts)).to.deep.equal(["squat", "benchPress", "deadlift"]);
  });

  it("writes the sample text for three lifts", () => {
    const lifts: IExerciseType[] = [
      { id: "squat", equipment: "barbell" },
      { id: "benchPress", equipment: "barbell" },
      { id: "deadlift", equipment: "barbell" },
    ];
    expect(DashboardStarter_text(lifts, settings)).to.equal(
      [
        "// ## Strength",
        "row {",
        "  value / name: Squat / source: exercise(Squat, Barbell) / y: e1rm / compare: 4w / trend: 3m",
        "  value / name: Bench Press / source: exercise(Bench Press, Barbell) / y: e1rm / compare: 4w / trend: 3m",
        "  value / name: Deadlift / source: exercise(Deadlift, Barbell) / y: e1rm / compare: 4w / trend: 3m",
        "}",
        "",
        "graph / range: 1y {",
        "  name: Squat / source: exercise(Squat, Barbell) / y: e1rm / group: max(1w)",
        "  name: Bench Press / source: exercise(Bench Press, Barbell) / y: e1rm / group: max(1w)",
        "  name: Deadlift / source: exercise(Deadlift, Barbell) / y: e1rm / group: max(1w)",
        "}",
        "",
        "row {",
        "  muscles / range: 7d / show: map",
        "  calendar / range: 6m",
        "}",
        "",
        "row {",
        "  value / name: Bodyweight / source: stats(weight) / smooth: avg(7d) / compare: 4w / trend: 3m",
        "  value / name: Workouts in 7 days / source: workout / smooth: count(7d) / compare: 1w",
        "}",
      ].join("\n")
    );
  });

  it("compiles without errors for 0 to 3 lifts", () => {
    const all: IExerciseType[] = [
      { id: "squat", equipment: "barbell" },
      { id: "benchPress", equipment: "dumbbell" },
      { id: "deadlift" },
    ];
    for (let count = 0; count <= all.length; count += 1) {
      const text = DashboardStarter_text(all.slice(0, count), settings);
      expect(DashboardApi_compileErrors(text, settings), text).to.deep.equal([]);
    }
    expect(DashboardStarter_text([], settings)).not.to.include("Strength");
  });
});
