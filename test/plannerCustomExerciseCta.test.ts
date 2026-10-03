import "mocha";
import { expect } from "chai";
import { PlannerCustomExerciseCta_open } from "../src/pages/planner/models/plannerCustomExerciseCta";
import { IPlannerUi } from "../src/pages/planner/models/types";

const ui: IPlannerUi = {
  weekIndex: 0,
  exerciseUi: { edit: new Set(), collapsed: new Set() },
  dayUi: { collapsed: new Set() },
};

describe("PlannerCustomExerciseCta_open", () => {
  it("opens the picker straight on the custom exercise screen", () => {
    const picker = PlannerCustomExerciseCta_open(ui, "Meadows Row").exercisePicker;
    expect(picker?.state.screenStack).to.deep.equal(["customExercise"]);
  });

  it("prefills the unknown exercise name", () => {
    const picker = PlannerCustomExerciseCta_open(ui, "Meadows Row").exercisePicker;
    expect(picker?.state.editCustomExercise?.name).to.equal("Meadows Row");
    expect(picker?.state.editCustomExercise?.isDeleted).to.equal(false);
  });
});
