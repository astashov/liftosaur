import "mocha";
import { expect } from "chai";
import {
  LiftographGraphs_exerciseDocument,
  LiftographGraphs_exerciseSource,
  LiftographGraphs_statsDocument,
  LiftographGraphs_widget,
} from "../src/liftograph/liftographGraphs";
import { LiftographSeriesEval_compile, LiftographSeriesEval_create } from "../src/liftograph/liftographSeriesEval";
import { Exercise_all, Exercise_createCustomExercise } from "../src/models/exercise";
import { IAllCustomExercises, IExerciseType, IHistoryRecord, IStats } from "../src/types";
import { fxDay, fxSettings, fxStats } from "./liftographFixtures";

const settings = fxSettings();
const today = fxDay(2026, 3, 31).getTime();

function evaluation(
  history: IHistoryRecord[],
  stats: IStats = fxStats()
): ReturnType<typeof LiftographSeriesEval_create> {
  return LiftographSeriesEval_create({ history, stats, settings, today });
}

describe("LiftographGraphs", () => {
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

  describe("widget", () => {
    it("compiles the stats document into a graph widget", () => {
      const widget = LiftographGraphs_widget(evaluation([]), LiftographGraphs_statsDocument("sleep", 3));
      expect(widget?.kind).to.equal("graph");
      expect(widget?.series.map((s) => (s.status === "ready" ? s.spec.name : s.message))).to.deep.equal([
        "Value",
        "Average",
      ]);
    });

    it("returns undefined when the text is not a graph", () => {
      expect(LiftographGraphs_widget(evaluation([]), "calendar / range: 3m")).to.equal(undefined);
    });
  });
});
