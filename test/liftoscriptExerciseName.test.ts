import "mocha";
import { expect } from "chai";
import {
  LiftoscriptExerciseName_isExercise,
  LiftoscriptExerciseName_isProgramExercise,
} from "../src/liftoscriptExerciseName";
import { Exercise_createCustomExercise } from "../src/models/exercise";
import { PlannerKey_fromExerciseType, PlannerKey_fromExerciseVariations } from "../src/pages/planner/plannerKey";
import { IAllCustomExercises } from "../src/types";

const t1BarbellSquat = PlannerKey_fromExerciseType({ id: "squat", equipment: "barbell" }, "t1");

describe("LiftoscriptExerciseName", () => {
  describe("isProgramExercise", () => {
    it("matches the line by label, name and the default equipment", () => {
      expect(LiftoscriptExerciseName_isProgramExercise("t1: Squat", t1BarbellSquat, {})).to.eql(true);
      expect(LiftoscriptExerciseName_isProgramExercise("T1: squat", t1BarbellSquat, {})).to.eql(true);
      expect(LiftoscriptExerciseName_isProgramExercise("t1: Squat, Barbell", t1BarbellSquat, {})).to.eql(true);
    });

    it("requires the same label and equipment", () => {
      expect(LiftoscriptExerciseName_isProgramExercise("Squat", t1BarbellSquat, {})).to.eql(false);
      expect(LiftoscriptExerciseName_isProgramExercise("t2: Squat", t1BarbellSquat, {})).to.eql(false);
      expect(LiftoscriptExerciseName_isProgramExercise("t1: Squat, Dumbbell", t1BarbellSquat, {})).to.eql(false);
      expect(LiftoscriptExerciseName_isProgramExercise("t1: Front Squat", t1BarbellSquat, {})).to.eql(false);
    });

    it("matches a variation ladder line by all its variations", () => {
      const key = PlannerKey_fromExerciseVariations(
        [
          { exerciseType: { id: "squat", equipment: "barbell" }, name: "Squat", isCurrent: true },
          { exerciseType: { id: "frontSquat", equipment: "barbell" }, name: "Front Squat", isCurrent: false },
        ],
        "t1"
      );
      expect(LiftoscriptExerciseName_isProgramExercise("t1: Squat | Front Squat", key, {})).to.eql(true);
      expect(LiftoscriptExerciseName_isProgramExercise("t1: Squat", key, {})).to.eql(false);
    });
  });

  describe("isExercise", () => {
    const barbellSquat = { id: "squat", equipment: "barbell" };

    it("ignores the label and the case", () => {
      expect(LiftoscriptExerciseName_isExercise("Squat", barbellSquat, {})).to.eql(true);
      expect(LiftoscriptExerciseName_isExercise("t2: squat", barbellSquat, {})).to.eql(true);
    });

    it("checks equipment only when the pattern names it", () => {
      expect(LiftoscriptExerciseName_isExercise("Squat, Barbell", barbellSquat, {})).to.eql(true);
      expect(LiftoscriptExerciseName_isExercise("Squat, Dumbbell", barbellSquat, {})).to.eql(false);
      expect(LiftoscriptExerciseName_isExercise("Squat", { id: "squat", equipment: "dumbbell" }, {})).to.eql(true);
    });

    it("does not match another exercise or an unknown name", () => {
      expect(LiftoscriptExerciseName_isExercise("Front Squat", barbellSquat, {})).to.eql(false);
      expect(LiftoscriptExerciseName_isExercise("Not An Exercise", barbellSquat, {})).to.eql(false);
    });

    it("tells custom 'Foo' on dumbbells apart from a custom named 'Foo, Dumbbell'", () => {
      const foo = Exercise_createCustomExercise("Foo", [], [], []);
      const fooDumbbell = Exercise_createCustomExercise("Foo, Dumbbell", [], [], []);
      const custom: IAllCustomExercises = { [foo.id]: foo, [fooDumbbell.id]: fooDumbbell };

      expect(LiftoscriptExerciseName_isExercise("Foo, Dumbbell", { id: fooDumbbell.id }, custom)).to.eql(true);
      expect(LiftoscriptExerciseName_isExercise("Foo, Dumbbell", { id: foo.id, equipment: "dumbbell" }, custom)).to.eql(
        false
      );
      expect(LiftoscriptExerciseName_isExercise("Foo", { id: foo.id, equipment: "dumbbell" }, custom)).to.eql(true);
    });
  });
});
