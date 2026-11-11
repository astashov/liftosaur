import "mocha";
import { expect } from "chai";
import { ExercisePickerBack_canPop, ExercisePickerBack_pop } from "../src/components/exercisePicker/exercisePickerBack";
import { ICustomExercise, IExercisePickerScreen, IExercisePickerState } from "../src/types";

function pickerState(screenStack: IExercisePickerScreen[], editCustomExercise?: ICustomExercise): IExercisePickerState {
  return {
    screenStack,
    sort: "name_asc",
    filters: {},
    selectedExercises: [],
    mode: "program",
    editCustomExercise,
  };
}

const customExercise = { id: "abc", name: "Meadows Row" } as ICustomExercise;

describe("ExercisePickerBack", () => {
  it("leaves the root screen to the modal", () => {
    const state = pickerState(["exercisePicker"]);
    expect(ExercisePickerBack_canPop(state)).to.equal(false);
    expect(ExercisePickerBack_pop(state)).to.equal(state);
  });

  it("returns from the filter screen to the list", () => {
    const next = ExercisePickerBack_pop(pickerState(["exercisePicker", "filter"]));
    expect(next.screenStack).to.deep.equal(["exercisePicker"]);
  });

  it("drops the custom exercise draft when leaving its screen", () => {
    const next = ExercisePickerBack_pop(pickerState(["exercisePicker", "customExercise"], customExercise));
    expect(next.screenStack).to.deep.equal(["exercisePicker"]);
    expect(next.editCustomExercise).to.equal(undefined);
  });

  it("keeps the custom exercise draft when leaving a screen above it", () => {
    const next = ExercisePickerBack_pop(pickerState(["exercisePicker", "customExercise", "settings"], customExercise));
    expect(next.screenStack).to.deep.equal(["exercisePicker", "customExercise"]);
    expect(next.editCustomExercise).to.equal(customExercise);
  });
});
