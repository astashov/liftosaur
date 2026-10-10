import "mocha";
import { expect } from "chai";
import { WorkoutTimeEstimate_dayMs } from "../src/models/workoutTimeEstimate";
import { PlannerStatsUtils_dayApproxTimeMs } from "../src/pages/planner/models/plannerStatsUtils";
import { PlannerProgram_evaluate, PlannerProgram_evaluateText } from "../src/pages/planner/models/plannerProgram";
import { Settings_build } from "../src/models/settings";
import { Program_create, Program_dayApproxTimeMs, Program_evaluate } from "../src/models/program";

const sec = 1000;

describe("WorkoutTimeEstimate_dayMs", () => {
  it("counts prepare, reps and rest for straight sets", () => {
    const ms = WorkoutTimeEstimate_dayMs([{ sets: [{ reps: 5 }, { reps: 5, timer: 60 }] }], { rest: 180 });
    expect(ms).to.equal((20 + 35 + 180) * sec + (20 + 35 + 60) * sec);
  });

  it("uses the set timer as the work time", () => {
    const ms = WorkoutTimeEstimate_dayMs([{ sets: [{ reps: 1, setTimer: 60, timer: 30 }] }], { rest: 180 });
    expect(ms).to.equal((20 + 60 + 30) * sec);
  });

  it("drops the prepare time on auto sets", () => {
    const tabata = Array(8).fill({ reps: 1, setTimer: 20, timer: 10, auto: true });
    expect(WorkoutTimeEstimate_dayMs([{ sets: tabata }], { rest: 180 })).to.equal(4 * 60 * sec);
  });

  it("rests only after each superset round when there is no superset timer", () => {
    const ms = WorkoutTimeEstimate_dayMs(
      [
        { superset: "A", sets: [{ reps: 5 }, { reps: 5 }] },
        { superset: "A", sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] },
      ],
      { rest: 120 }
    );
    const round = (20 + 35) * sec + (20 + 70 + 120) * sec;
    const tail = (20 + 70 + 120) * sec;
    expect(ms).to.equal(2 * round + tail);
  });

  it("uses the superset timer between and after superset sets", () => {
    const ms = WorkoutTimeEstimate_dayMs(
      [
        { superset: "A", sets: [{ reps: 5 }] },
        { superset: "A", sets: [{ reps: 5 }] },
      ],
      { rest: 180, superset: 30 }
    );
    expect(ms).to.equal(2 * (20 + 35 + 30) * sec);
  });

  it("counts the work of a unilateral set once per side", () => {
    const exercises = [
      { isUnilateral: true, sets: [{ reps: 10 }] },
      { isUnilateral: true, sets: [{ reps: 1, setTimer: 30 }] },
    ];
    expect(WorkoutTimeEstimate_dayMs(exercises, { rest: 60 })).to.equal(
      (20 + 2 * 70 + 60) * sec + (20 + 2 * 30 + 60) * sec
    );
  });

  it("groups superset members that are not next to each other", () => {
    const together = WorkoutTimeEstimate_dayMs(
      [{ superset: "A", sets: [{ reps: 5 }] }, { superset: "A", sets: [{ reps: 5 }] }, { sets: [{ reps: 5 }] }],
      { rest: 180 }
    );
    const apart = WorkoutTimeEstimate_dayMs(
      [{ superset: "A", sets: [{ reps: 5 }] }, { sets: [{ reps: 5 }] }, { superset: "A", sets: [{ reps: 5 }] }],
      { rest: 180 }
    );
    expect(apart).to.equal(together);
  });
});

describe("day approx time callers", () => {
  const settings = Settings_build();
  const text =
    "# Week 1\n## Day 1\nSquat / 3x5 / superset: A\nBench Press / 3x5 / superset: A\nPlank / 3x1 60s|30s\nLunge / 2x10 / 60s";
  const expected =
    3 * ((20 + 35) * sec + (20 + 35 + 180) * sec) + 3 * (20 + 60 + 30) * sec + 2 * (20 + 2 * 70 + 60) * sec;

  it("planner day time handles supersets, set timers and unilateral exercises", () => {
    const planner = { vtype: "planner" as const, name: "P", weeks: PlannerProgram_evaluateText(text) };
    const day = PlannerProgram_evaluate(planner, settings).evaluatedWeeks[0][0];
    expect(day.success).to.equal(true);
    const exercises = day.success ? day.data : [];
    expect(PlannerStatsUtils_dayApproxTimeMs(exercises, 180, settings)).to.equal(expected);
  });

  it("program day time handles supersets, set timers and unilateral exercises", () => {
    const planner = { vtype: "planner" as const, name: "P", weeks: PlannerProgram_evaluateText(text) };
    const evaluated = Program_evaluate({ ...Program_create("P", "p"), planner }, settings);
    expect(Program_dayApproxTimeMs(evaluated.weeks[0].days[0], settings)).to.equal(expected);
  });
});
