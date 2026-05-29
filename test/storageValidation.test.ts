import "mocha";
import { expect } from "chai";
import { Storage_get, Storage_getDefault, Storage_validate } from "../src/models/storage";
import { VExerciseDataValue, VStorage } from "../src/types";

describe("Storage validation preserves data", () => {
  it("preserves unknown top-level storage fields (forward compatibility)", () => {
    const def = Storage_getDefault();
    const withExtra = { ...def, futureFlag: 42, anotherUnknown: "hello" };
    const result = Storage_get(withExtra as Record<string, unknown>);
    expect(result.success).to.equal(true);
    if (result.success) {
      const data = result.data as Record<string, unknown>;
      expect(data.futureFlag).to.equal(42);
      expect(data.anotherUnknown).to.equal("hello");
    }
  });

  it("preserves unknown nested fields on a custom exercise", () => {
    const def = Storage_getDefault();
    def.settings.exercises["custom-1"] = {
      vtype: "custom_exercise",
      id: "custom-1",
      name: "x",
      isDeleted: false,
      meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [] },
      ...({ futureFieldOnExercise: "preserved" } as object),
    };
    const result = Storage_validate(def, VStorage, "storage");
    expect(result.success).to.equal(true);
    if (result.success) {
      const exercises = (result.data as { settings: { exercises: Record<string, unknown> } }).settings.exercises;
      const ex = exercises["custom-1"] as Record<string, unknown>;
      expect(ex.futureFieldOnExercise).to.equal("preserved");
    }
  });

  it("tolerates unknown muscle keys in muscleMultipliers (forward-compatible)", () => {
    const data = {
      muscleMultipliers: {
        "Biceps Brachii": 1.0,
        "Renamed Or Future Muscle": 0.5,
      },
    };
    const result = Storage_validate(data, VExerciseDataValue, "exerciseDataValue");
    expect(result.success).to.equal(true);
    if (result.success) {
      const out = result.data as { muscleMultipliers?: Record<string, number> };
      expect(out.muscleMultipliers?.["Biceps Brachii"]).to.equal(1.0);
      expect(out.muscleMultipliers?.["Renamed Or Future Muscle"]).to.equal(0.5);
    }
  });
});
