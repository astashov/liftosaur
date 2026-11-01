import "mocha";
import { expect } from "chai";
import {
  LiftographGraphs_exerciseData,
  LiftographGraphs_exerciseDocument,
  LiftographGraphs_exerciseSource,
  LiftographGraphs_muscleGroupsData,
  LiftographGraphs_programChangeTimes,
  LiftographGraphs_statsData,
} from "../src/liftograph/liftographGraphs";
import { LiftographSeriesEval_compile, LiftographSeriesEval_create } from "../src/liftograph/liftographSeriesEval";
import { Exercise_all, Exercise_createCustomExercise } from "../src/models/exercise";
import { IAllCustomExercises, IExerciseType, IHistoryRecord, IStats } from "../src/types";
import { DateUtils_firstDayOfWeekTimestamp } from "../src/utils/date";
import { fxDay, fxEntry, fxRecord, fxSet, fxSettings, fxStats } from "./liftographFixtures";
import {
  Legacy_exerciseData,
  Legacy_muscleGroupsData,
  Legacy_statsGraphData,
  Legacy_weightData,
} from "../src/liftograph/liftographLegacyGraphs";

const settings = fxSettings();
const squat = { id: "squat", equipment: "barbell" };
const today = fxDay(2026, 3, 31).getTime();

function evaluation(
  history: IHistoryRecord[],
  stats: IStats = fxStats()
): ReturnType<typeof LiftographSeriesEval_create> {
  return LiftographSeriesEval_create({ history, stats, settings, today });
}

describe("LiftographGraphs", () => {
  describe("exerciseData", () => {
    const history = [
      fxRecord(fxDay(2026, 3, 2), [
        fxEntry("squat", [fxSet(200, 5), fxSet(225, 1)]),
        fxEntry("benchPress", [fxSet(135, 5)]),
      ]),
      fxRecord(fxDay(2026, 3, 4), [fxEntry("squat", [fxSet(210, 5), fxSet(210, 3)])], { programName: "GZCLP" }),
      fxRecord(fxDay(2026, 3, 9), [fxEntry("squat", [fxSet(215, 5)], { equipment: "dumbbell" })]),
      fxRecord(fxDay(2026, 3, 11), [fxEntry("benchPress", [fxSet(140, 5)])]),
    ];
    const stats = fxStats([
      [fxDay(2026, 3, 1), 180],
      [fxDay(2026, 3, 4), 181],
    ]);

    function bothTypes(
      records: IHistoryRecord[],
      type: IExerciseType,
      isWithOneRm: boolean,
      isWithBodyweight: boolean,
      statsArg: IStats = fxStats()
    ): ReturnType<typeof LiftographGraphs_exerciseData> {
      const weight = LiftographGraphs_exerciseData(
        evaluation(records, statsArg),
        type,
        "weight",
        isWithOneRm,
        isWithBodyweight
      );
      const volume = LiftographGraphs_exerciseData(
        evaluation(records, statsArg),
        type,
        "volume",
        isWithOneRm,
        isWithBodyweight
      );
      const [x, w, reps, e1rm, , bodyweight] = weight.data;
      return { ...weight, data: [x, w, reps, e1rm, volume.data[4], bodyweight] };
    }

    it("matches today's graph on plain workouts, with bodyweight and program lines", () => {
      const bodyweight = Legacy_weightData(stats.weight.weight ?? [], settings);
      expect(bothTypes(history, squat, true, true, stats)).to.deep.equal(
        Legacy_exerciseData(history, squat, settings, true, bodyweight)
      );
    });

    it("computes only the series of the selected type", () => {
      const weight = LiftographGraphs_exerciseData(evaluation(history), squat, "weight", true, false);
      const volume = LiftographGraphs_exerciseData(evaluation(history), squat, "volume", true, false);
      expect([weight.data[1], weight.data[4]]).to.deep.equal([
        [225, 210],
        [null, null],
      ]);
      expect(weight.data[3].every((v) => v != null)).to.equal(true);
      expect([volume.data[1], volume.data[2], volume.data[3]]).to.deep.equal([
        [null, null],
        [null, null],
        [null, null],
      ]);
      expect(volume.data[4]).to.deep.equal([1225, 1680]);
    });

    it("reads a graph key without equipment as the default equipment", () => {
      const result = LiftographGraphs_exerciseData(evaluation(history), { id: "squat" }, "weight", false, false);
      expect(result.data[1]).to.deep.equal([225, 210]);
    });

    it("counts every entry of the exercise in a workout", () => {
      const record = fxRecord(fxDay(2026, 3, 2), [
        fxEntry("squat", [fxSet(200, 5)]),
        fxEntry("squat", [fxSet(150, 10)]),
      ]);
      const result = bothTypes([record], squat, false, false);
      expect([result.data[1], result.data[2], result.data[4]]).to.deep.equal([[200], [5], [2500]]);
      expect(Legacy_exerciseData([record], squat, settings).data[4]).to.deep.equal([1000]);
    });

    it("dates a point by its start time after a date edit", () => {
      const record = { ...history[0], date: "2026-03-02T00:00:00.000Z" };
      const result = LiftographGraphs_exerciseData(evaluation([record]), squat, "weight", false, false);
      expect(result.data[0]).to.deep.equal([record.startTime / 1000]);
      expect(LiftographGraphs_programChangeTimes(evaluation([record]))).to.deep.equal([
        [record.startTime / 1000, "Program"],
      ]);
    });

    it("keeps the volume of an entry without completed sets", () => {
      const record = fxRecord(fxDay(2026, 3, 2), [fxEntry("squat", [fxSet(200, 0)])]);
      const result = bothTypes([record], squat, true, false);
      expect(result.data.slice(1, 5)).to.deep.equal([[null], [null], [null], [0]]);
      expect(Legacy_exerciseData([record], squat, settings, true).data[0]).to.deep.equal([]);
    });

    it("leaves out an unfinished workout", () => {
      const open = fxRecord(fxDay(2026, 3, 12), [fxEntry("squat", [fxSet(300, 1)])], { open: true });
      const result = LiftographGraphs_exerciseData(evaluation([...history, open]), squat, "weight", false, false);
      expect(result.data[1]).to.deep.equal([225, 210]);
    });
  });

  describe("exerciseSource", () => {
    function compiledSource(
      type: IExerciseType,
      custom: IAllCustomExercises = {}
    ): { exerciseId?: string; equipment?: string } | undefined {
      const withCustom = LiftographSeriesEval_create({
        history: [],
        stats: fxStats(),
        settings: { ...settings, exercises: custom },
        today,
      });
      const text = LiftographGraphs_exerciseDocument(
        LiftographGraphs_exerciseSource(type, withCustom.input.settings),
        "weight",
        false
      );
      const widget = LiftographSeriesEval_compile(withCustom, text).layout[0]?.items[0];
      const series = widget?.kind === "graph" ? widget.series[0] : undefined;
      if (series?.status !== "ready" || series.spec.source.type !== "exercise") {
        return undefined;
      }
      return { exerciseId: series.spec.source.exerciseId, equipment: series.spec.source.equipment };
    }

    it("resolves every built-in exercise back to its id and equipment", () => {
      const mismatches: string[] = [];
      for (const exercise of Exercise_all({})) {
        for (const equipment of [undefined, exercise.defaultEquipment, "dumbbell" as const]) {
          const source = compiledSource({ id: exercise.id, equipment });
          const expected = { exerciseId: exercise.id, equipment: equipment ?? exercise.defaultEquipment };
          if (JSON.stringify(source) !== JSON.stringify(expected)) {
            mismatches.push(`${exercise.id}_${equipment}: ${JSON.stringify(source)}`);
          }
        }
      }
      expect(mismatches).to.deep.equal([]);
    });

    it("resolves a custom exercise whose name has a comma and parentheses", () => {
      const custom = Exercise_createCustomExercise("Press (Paused), Close Grip", [], [], []);
      expect(compiledSource({ id: custom.id }, { [custom.id]: custom })).to.deep.equal({
        exerciseId: custom.id,
        equipment: undefined,
      });
    });
  });

  describe("muscleGroupsData", () => {
    it("gives today's weekly sums, dated at the week start, with empty weeks as 0", () => {
      const history = [
        fxRecord(fxDay(2026, 3, 3), [fxEntry("benchPress", [fxSet(135, 5), fxSet(135, 5)])]),
        fxRecord(fxDay(2026, 3, 5), [fxEntry("benchPress", [fxSet(140, 5)])]),
        fxRecord(fxDay(2026, 3, 18), [fxEntry("benchPress", [fxSet(145, 5)])]),
      ];
      const legacy = Legacy_muscleGroupsData(history, settings).chest;
      const result = LiftographGraphs_muscleGroupsData(evaluation(history), ["chest"]).chest;
      if (legacy == null || result == null) {
        throw new Error("expected chest data");
      }
      const weekStart = (d: Date): number => DateUtils_firstDayOfWeekTimestamp(d.getTime(), false) / 1000;
      expect(result[0]).to.deep.equal(
        [fxDay(2026, 3, 3), fxDay(2026, 3, 10), fxDay(2026, 3, 17), fxDay(2026, 3, 24), fxDay(2026, 3, 31)].map(
          weekStart
        )
      );
      expect(result[1]).to.deep.equal([legacy[1][0], 0, legacy[1][1], 0, 0]);
      expect(result[2]).to.deep.equal([legacy[2][0], 0, legacy[2][1], 0, 0]);
    });
  });

  describe("statsData", () => {
    const stats = fxStats([
      [fxDay(2026, 3, 1), 180],
      [fxDay(2026, 3, 2), 181],
      [fxDay(2026, 3, 3), 183],
      [fxDay(2026, 3, 4), 182],
    ]);

    it("matches today's raw series", () => {
      const legacy = Legacy_statsGraphData(Legacy_weightData(stats.weight.weight ?? [], settings));
      expect(LiftographGraphs_statsData(evaluation([], stats), "weight")).to.deep.equal(legacy);
    });

    it("averages the points so far before the window fills, without rounding", () => {
      const [, raw, avg] = LiftographGraphs_statsData(evaluation([], stats), "weight", 3);
      expect(raw).to.deep.equal([180, 181, 183, 182]);
      expect(avg).to.deep.equal([180, 180.5, 544 / 3, 182]);
      expect(Legacy_statsGraphData(Legacy_weightData(stats.weight.weight ?? [], settings), 3)[2]).to.deep.equal([
        180, 181, 181.3, 182,
      ]);
    });
  });
});
