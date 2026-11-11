import "mocha";
import { expect } from "chai";
import { LiftographWidgetModel_read } from "../src/liftograph/liftographWidgetModel";
import {
  DashboardWidgetFields_aggHint,
  DashboardWidgetFields_dayFromText,
  DashboardWidgetFields_durations,
  DashboardWidgetFields_exerciseType,
  DashboardWidgetFields_isCustom,
  DashboardWidgetFields_isNumeric,
  DashboardWidgetFields_muscleGroupLabel,
  DashboardWidgetFields_muscleGroups,
  DashboardWidgetFields_pickerExercise,
  DashboardWidgetFields_seriesSummary,
  DashboardWidgetFields_splitOptions,
  DashboardWidgetFields_textValue,
  DashboardWidgetFields_toggleGroup,
  DashboardWidgetFields_valueHint,
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

  it("a value outside the preset pills counts as custom", () => {
    const windows = DashboardWidgetFields_windows("group");
    expect(DashboardWidgetFields_isCustom(windows, "1w")).to.equal(false);
    expect(DashboardWidgetFields_isCustom(windows, "6w")).to.equal(true);
    expect(DashboardWidgetFields_isCustom(windows, undefined)).to.equal(false);
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

  it("pickerExercise uses the series exercise, and has none for a series without one", () => {
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
    expect(DashboardWidgetFields_pickerExercise(model, 1, exercises)).to.equal(undefined);
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

  it("toggleGroup adds in list order, removes, and clears to all", () => {
    const all = ["chest", "back", "legs"];
    expect(DashboardWidgetFields_toggleGroup(undefined, "back", all)).to.eql(["back"]);
    expect(DashboardWidgetFields_toggleGroup(["legs"], "chest", all)).to.eql(["chest", "legs"]);
    expect(DashboardWidgetFields_toggleGroup(["legs", "custom1"], "legs", all)).to.eql(["custom1"]);
    expect(DashboardWidgetFields_toggleGroup(["legs"], "legs", all)).to.equal(undefined);
  });

  it("durations list the pills and hints explain compare and trend", () => {
    expect(DashboardWidgetFields_durations("trend")).to.eql(["4w", "3m", "6m", "1y"]);
    expect(DashboardWidgetFields_valueHint("compare", "4w")).to.equal(
      'Shows the change since 4 weeks ago, like "▲ 7.5 vs 4w".'
    );
    expect(DashboardWidgetFields_valueHint("trend", "1y")).to.equal(
      "Draws a small chart of the last 1 year under the number."
    );
    expect(DashboardWidgetFields_valueHint("compare", undefined)).to.equal("Shows only the current value.");
  });

  it("muscleGroups can lead with total", () => {
    const groups = DashboardWidgetFields_muscleGroups(fxSettings(), true);
    expect(groups[0]).to.equal("total");
    expect(groups).to.include("chest");
    expect(DashboardWidgetFields_muscleGroupLabel("total", fxSettings())).to.equal("All muscles");
  });

  it("textValue keeps typed spaces and treats blank as unset", () => {
    expect(DashboardWidgetFields_textValue("My ")).to.equal("My ");
    expect(DashboardWidgetFields_textValue("  ")).to.equal(undefined);
  });
});
