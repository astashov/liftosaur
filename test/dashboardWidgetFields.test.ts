import "mocha";
import { expect } from "chai";
import { LiftographWidgetModel_read } from "../src/liftograph/liftographWidgetModel";
import {
  DashboardWidgetFields_aggHint,
  DashboardWidgetFields_dayFromText,
  DashboardWidgetFields_exerciseType,
  DashboardWidgetFields_isNumeric,
  DashboardWidgetFields_pickerExercise,
  DashboardWidgetFields_seriesSummary,
  DashboardWidgetFields_splitOptions,
  DashboardWidgetFields_textValue,
  DashboardWidgetFields_windows,
} from "../src/models/dashboardWidgetFields";
import { fxSettings } from "./liftographFixtures";

describe("DashboardWidgetFields", () => {
  it("isNumeric finds point(x, y)", () => {
    expect(
      DashboardWidgetFields_isNumeric({ values: { type: "script", text: " point(reps, weight) " }, extra: [] })
    ).to.equal(true);
    expect(DashboardWidgetFields_isNumeric({ values: { type: "script", text: " point(reps) " }, extra: [] })).to.equal(
      false
    );
  });

  it("aggHint explains group and smooth in words", () => {
    expect(DashboardWidgetFields_aggHint("group", undefined)).to.equal("One point per workout.");
    expect(DashboardWidgetFields_aggHint("group", { type: "agg", agg: "max", window: "1w" })).to.equal(
      "One point per week: the max of that period."
    );
    expect(DashboardWidgetFields_aggHint("group", { type: "agg", agg: "sum", window: "2w" })).to.equal(
      "One point per 2 weeks: the sum of that period."
    );
    expect(DashboardWidgetFields_aggHint("smooth", { type: "agg", agg: "avg", window: "5" })).to.equal(
      "Each point becomes the average of the last 5 points."
    );
    expect(DashboardWidgetFields_aggHint("smooth", { type: "agg", agg: "avg", window: "30d" })).to.equal(
      "Each point becomes the average of the last 30 days."
    );
  });

  it("windows keep a custom window as an extra option", () => {
    expect(DashboardWidgetFields_windows("group", "1w")).to.eql(["1w", "2w", "1m", "3m"]);
    expect(DashboardWidgetFields_windows("group", "6w")).to.eql(["1w", "2w", "1m", "3m", "6w"]);
  });

  it("exerciseType resolves the written name and equipment", () => {
    const exercises = fxSettings().exercises;
    expect(
      DashboardWidgetFields_exerciseType({ type: "exercise", name: "Squat", equipment: "Barbell" }, exercises)
    ).to.eql({
      id: "squat",
      equipment: "barbell",
    });
    expect(DashboardWidgetFields_exerciseType({ type: "exercise", name: "Nope" }, exercises)).to.equal(undefined);
    expect(DashboardWidgetFields_exerciseType({ type: "workout" }, exercises)).to.equal(undefined);
  });

  it("pickerExercise uses the series exercise or falls back to squat", () => {
    const exercises = fxSettings().exercises;
    const model = LiftographWidgetModel_read(
      "graph {\n  name: A / source: exercise(Bench Press, Dumbbell)\n  name: B / source: workout\n}"
    );
    if (model == null) {
      throw new Error("unreadable");
    }
    expect(DashboardWidgetFields_pickerExercise(model, 0, exercises)).to.eql({
      id: "benchPress",
      equipment: "dumbbell",
    });
    expect(DashboardWidgetFields_pickerExercise(model, 1, exercises)).to.eql({ id: "squat", equipment: "barbell" });
  });

  it("seriesSummary joins source, what to plot and grouping", () => {
    expect(
      DashboardWidgetFields_seriesSummary({
        source: { type: "exercise", name: "Deadlift", equipment: "Barbell" },
        group: { type: "agg", agg: "max", window: "1w" },
        extra: [],
      })
    ).to.equal("Deadlift, Barbell · Max weight · max per week");
    expect(
      DashboardWidgetFields_seriesSummary({
        source: { type: "workout" },
        values: { type: "script", text: "x" },
        extra: [],
      })
    ).to.equal("All workouts · Custom script");
  });

  it("splitOptions shows the first ones and keeps the current value visible", () => {
    const options = ["a", "b", "c", "d"];
    expect(DashboardWidgetFields_splitOptions(options, undefined, 2)).to.eql({ visible: ["a", "b"], rest: ["c", "d"] });
    expect(DashboardWidgetFields_splitOptions(options, "d", 2)).to.eql({ visible: ["a", "b", "d"], rest: ["c"] });
    expect(DashboardWidgetFields_splitOptions(options, "zz", 2)).to.eql({
      visible: ["a", "b", "zz"],
      rest: ["c", "d"],
    });
  });

  it("reads a day as a number only when the whole input is one integer", () => {
    expect(DashboardWidgetFields_dayFromText("2")).to.eql({ type: "number", value: 2 });
    expect(DashboardWidgetFields_dayFromText("2 / Upper")).to.eql({ type: "name", value: "2 / Upper" });
    expect(DashboardWidgetFields_dayFromText("Upper")).to.eql({ type: "name", value: "Upper" });
  });

  it("textValue keeps typed spaces and treats blank as unset", () => {
    expect(DashboardWidgetFields_textValue("My ")).to.equal("My ");
    expect(DashboardWidgetFields_textValue("  ")).to.equal(undefined);
  });
});
