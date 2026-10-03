import "mocha";
import { expect } from "chai";
import {
  Settings_build,
  Settings_applyWebEditorSettings,
  Settings_webEditorSettingsUpdate,
  Settings_applyExportedProgram,
} from "../src/models/settings";
import { Program_create, Program_exportProgram } from "../src/models/program";
import { ICustomExercise, IWebEditorSettings, VWebEditorSettings } from "../src/types";
import { Storage_validate } from "../src/models/storage";

function customExercise(id: string, name: string): ICustomExercise {
  return {
    vtype: "custom_exercise",
    id,
    name,
    isDeleted: false,
    types: [],
    meta: { bodyParts: [], targetMuscles: [], synergistMuscles: [], sortedEquipment: [] },
  };
}

describe("web editor settings", () => {
  describe("Settings_applyWebEditorSettings", () => {
    it("writes the planner settings the muscle settings modal edits", () => {
      const settings = Settings_build();
      const result = Settings_applyWebEditorSettings(settings, {
        planner: { ...settings.planner, synergistMultiplier: 0.75, weeklyRangeSets: { shoulders: [8, 14] } },
      });
      expect(result.planner.synergistMultiplier).to.equal(0.75);
      expect(result.planner.weeklyRangeSets.shoulders).to.deep.equal([8, 14]);
    });

    it("keeps fields the update omits", () => {
      const settings = { ...Settings_build(), units: "kg" as const };
      const result = Settings_applyWebEditorSettings(settings, { planner: settings.planner });
      expect(result.units).to.equal("kg");
      expect(result.timers).to.deep.equal(settings.timers);
      expect(result.muscleGroups).to.deep.equal(settings.muscleGroups);
    });

    it("applies a null rest timer, which means the user turned it off", () => {
      const settings = Settings_build();
      expect(settings.timers.workout).to.not.equal(null);
      const result = Settings_applyWebEditorSettings(settings, { timers: { workout: null } });
      expect(result.timers.workout).to.equal(null);
      expect(result.timers.warmup).to.equal(settings.timers.warmup);
    });

    it("merges exerciseData instead of replacing it", () => {
      const settings = Settings_build();
      settings.exerciseData = { squat: { rm1: undefined } };
      const result = Settings_applyWebEditorSettings(settings, { exerciseData: { bench: { rm1: undefined } } });
      expect(Object.keys(result.exerciseData).sort()).to.deep.equal(["bench", "squat"]);
    });

    it("removes an exerciseData entry the payload names as deleted", () => {
      const settings = Settings_build();
      settings.exerciseData = { squat: { rm1: undefined }, bench: { rm1: undefined } };
      const result = Settings_applyWebEditorSettings(
        settings,
        { exerciseData: { bench: { rm1: undefined } } },
        { exerciseDataKeys: ["squat"] }
      );
      expect(Object.keys(result.exerciseData)).to.deep.equal(["bench"]);
    });

    it("removes a deleted entry even when the payload omits exerciseData entirely", () => {
      const settings = Settings_build();
      settings.exerciseData = { squat: { rm1: undefined } };
      const result = Settings_applyWebEditorSettings(settings, { units: "kg" }, { exerciseDataKeys: ["squat"] });
      expect(Object.keys(result.exerciseData)).to.deep.equal([]);
    });

    it("does not mutate the settings it was given", () => {
      const settings = Settings_build();
      settings.exerciseData = { squat: { rm1: undefined } };
      Settings_applyWebEditorSettings(settings, {}, { exerciseDataKeys: ["squat"] });
      expect(Object.keys(settings.exerciseData)).to.deep.equal(["squat"]);
    });

    it("ignores keys outside the whitelist", () => {
      const settings = Settings_build();
      // Storage_validate returns its input rather than valibot's stripped output, so the handler
      // hands the merge a payload that still carries whatever extra keys the browser sent
      const body = { units: "kg", volume: 999, nickname: "hacker" };
      expect(Storage_validate(body, VWebEditorSettings, "settings").success).to.equal(true);
      const result = Settings_applyWebEditorSettings(settings, body as IWebEditorSettings);
      expect(result.units).to.equal("kg");
      expect(result.volume).to.equal(settings.volume);
      expect(result.nickname).to.equal(settings.nickname);
    });

    it("rejects a payload whose whitelisted field has the wrong shape", () => {
      const result = Storage_validate({ planner: { synergistMultiplier: "a lot" } }, VWebEditorSettings, "s");
      expect(result.success).to.equal(false);
    });

    it("merges custom exercises, keeping the ones the update omits", () => {
      const settings = Settings_build();
      settings.exercises = { a: customExercise("a", "Old A"), b: customExercise("b", "B") };
      const result = Settings_applyWebEditorSettings(settings, {
        exercises: { a: customExercise("a", "New A"), c: customExercise("c", "C") },
      });
      expect(result.exercises.a?.name).to.equal("New A");
      expect(result.exercises.b?.name).to.equal("B");
      expect(result.exercises.c?.name).to.equal("C");
    });

    it("applies a custom exercise deletion, which is an isDeleted flag", () => {
      const settings = Settings_build();
      settings.exercises = { a: customExercise("a", "A") };
      const result = Settings_applyWebEditorSettings(settings, {
        exercises: { a: { ...customExercise("a", "A"), isDeleted: true } },
      });
      expect(result.exercises.a?.isDeleted).to.equal(true);
    });

    it("rejects a custom exercise with the wrong shape", () => {
      const result = Storage_validate({ exercises: { a: { id: "a", name: 5 } } }, VWebEditorSettings, "s");
      expect(result.success).to.equal(false);
    });

    it("merges starred exercises and removes the keys named as unstarred", () => {
      const settings = { ...Settings_build(), starredExercises: { squat: true, bench: true } };
      const result = Settings_applyWebEditorSettings(
        settings,
        { starredExercises: { deadlift: true } },
        { starredExerciseKeys: ["bench"] }
      );
      expect(Object.keys(result.starredExercises || {}).sort()).to.deep.equal(["deadlift", "squat"]);
    });

    it("unstars even when the user had no starred exercises stored", () => {
      const settings = Settings_build();
      const result = Settings_applyWebEditorSettings(settings, {}, { starredExerciseKeys: ["squat"] });
      expect(result.starredExercises).to.deep.equal({});
    });

    it("accepts picker-only workout settings and keeps the stored targetType", () => {
      const body = { workoutSettings: { pickerSort: "similar_muscles" } };
      expect(Storage_validate(body, VWebEditorSettings, "settings").success).to.equal(true);
      const settings = Settings_build();
      settings.workoutSettings = { targetType: "e1rm" };
      const result = Settings_applyWebEditorSettings(settings, body as IWebEditorSettings);
      expect(result.workoutSettings).to.deep.equal({ targetType: "e1rm", pickerSort: "similar_muscles" });
    });

    it("leaves starred exercises untouched for a payload from an older client", () => {
      const settings = { ...Settings_build(), starredExercises: { squat: true } };
      const result = Settings_applyWebEditorSettings(settings, { units: "kg" }, { exerciseDataKeys: [] });
      expect(result.starredExercises).to.equal(settings.starredExercises);
      expect(result.exercises).to.equal(settings.exercises);
    });

    it("round-trips what the web editor sends", () => {
      const settings = { ...Settings_build(), units: "kg" as const };
      settings.planner.synergistMultiplier = 0.9;
      const result = Settings_applyWebEditorSettings(Settings_build(), Settings_webEditorSettingsUpdate(settings));
      expect(result.units).to.equal("kg");
      expect(result.planner.synergistMultiplier).to.equal(0.9);
    });
  });

  describe("Settings_applyExportedProgram", () => {
    it("no longer lets an imported program touch planner settings, units or muscle groups", () => {
      const settings = Settings_build();
      settings.planner.synergistMultiplier = 0.9;
      settings.units = "kg";
      const other = { ...Settings_build(), units: "lb" as const };
      other.planner.synergistMultiplier = 0.1;
      const exported = Program_exportProgram(Program_create("Imported", "imported"), other);

      const result = Settings_applyExportedProgram(settings, exported);
      expect(result.planner.synergistMultiplier).to.equal(0.9);
      expect(result.units).to.equal("kg");
      expect(result.muscleGroups).to.deep.equal(settings.muscleGroups);
    });

    it("still fills in a rest timer the user does not have", () => {
      const settings = Settings_build();
      settings.timers.workout = undefined;
      const other = Settings_build();
      other.timers.workout = 240;
      const exported = Program_exportProgram(Program_create("Imported", "imported"), other);

      const result = Settings_applyExportedProgram(settings, exported);
      expect(result.timers.workout).to.equal(240);
    });
  });
});
