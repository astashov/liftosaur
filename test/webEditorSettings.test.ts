import "mocha";
import { expect } from "chai";
import {
  Settings_build,
  Settings_applyWebEditorSettings,
  Settings_webEditorInitial,
  Settings_webEditorSettingsRequest,
  Settings_applyExportedProgram,
  Settings_toggleStarred,
  Settings_webEditorHasChanges,
} from "../src/models/settings";
import { Program_create, Program_exportProgram } from "../src/models/program";
import { Muscle_updateMuscleGroup } from "../src/models/muscle";
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
      const initial = Settings_build();
      const settings = { ...initial, units: "kg" as const, planner: { ...initial.planner, synergistMultiplier: 0.9 } };
      const request = Settings_webEditorSettingsRequest(initial, settings);
      const result = Settings_applyWebEditorSettings(Settings_build(), request.settings);
      expect(result.units).to.equal("kg");
      expect(result.planner.synergistMultiplier).to.equal(0.9);
    });

    it("keeps a range and a group override the phone stored after a stale tab loaded", () => {
      const tabInitial = Settings_build();
      const tabCurrent = { ...tabInitial, timers: { ...tabInitial.timers, workout: 120 } };
      const stored = Settings_build();
      stored.planner = {
        ...stored.planner,
        weeklyRangeSets: { ...stored.planner.weeklyRangeSets, frontDelts: [6, 9] },
      };
      stored.muscleGroups = {
        ...stored.muscleGroups,
        data: { frontDelts: { muscles: ["Deltoid Anterior", "Deltoid Lateral"] } },
      };

      const request = Settings_webEditorSettingsRequest(tabInitial, tabCurrent);
      const result = Settings_applyWebEditorSettings(stored, request.settings, {
        muscleGroupKeys: request.deletedMuscleGroupKeys,
      });
      expect(result.timers.workout).to.equal(120);
      expect(result.planner.weeklyRangeSets.frontDelts).to.deep.equal([6, 9]);
      expect(result.muscleGroups.data.frontDelts?.muscles).to.deep.equal(["Deltoid Anterior", "Deltoid Lateral"]);
    });

    it("sends one changed range and one deleted custom group", () => {
      const initial = Settings_build();
      initial.muscleGroups = { ...initial.muscleGroups, data: { grip: { name: "Grip", muscles: ["Wrist Flexors"] } } };
      const sideDelts: [number, number] = [12, 20];
      const current = {
        ...initial,
        planner: { ...initial.planner, weeklyRangeSets: { ...initial.planner.weeklyRangeSets, sideDelts } },
        muscleGroups: { ...initial.muscleGroups, data: {} },
      };
      const request = Settings_webEditorSettingsRequest(initial, current);
      expect(request.settings.plannerUpdate).to.deep.equal({ weeklyRangeSets: { sideDelts: [12, 20] } });
      expect(request.deletedMuscleGroupKeys).to.deep.equal(["grip"]);
      expect(Storage_validate(request.settings, VWebEditorSettings, "settings").success).to.equal(true);

      const stored = { ...initial, muscleGroups: { ...initial.muscleGroups } };
      const result = Settings_applyWebEditorSettings(stored, request.settings, {
        muscleGroupKeys: request.deletedMuscleGroupKeys,
      });
      expect(result.planner.weeklyRangeSets.sideDelts).to.deep.equal([12, 20]);
      expect(result.planner.weeklyRangeSets.chest).to.deep.equal([10, 18]);
      expect(result.muscleGroups.data.grip).to.equal(undefined);
    });

    it("sends a reset to the saved value when diffed against the last acknowledged save", () => {
      const loaded = Settings_build();
      const saved = {
        ...loaded,
        planner: { ...loaded.planner, weeklyFrequency: { ...loaded.planner.weeklyFrequency, chest: 3 } },
      };
      const current = {
        ...saved,
        planner: { ...saved.planner, weeklyFrequency: { ...saved.planner.weeklyFrequency, chest: 2 } },
      };
      expect(Settings_webEditorHasChanges(saved, saved)).to.equal(false);
      expect(Settings_webEditorHasChanges(saved, current)).to.equal(true);
      expect(Settings_webEditorSettingsRequest(saved, current).settings.plannerUpdate).to.deep.equal({
        weeklyFrequency: { chest: 2 },
      });
    });

    it("sends only the edited group when a group writer clones every entry", () => {
      const loaded = Settings_build();
      loaded.muscleGroups = {
        ...loaded.muscleGroups,
        data: { edited: { name: "Edited", muscles: ["Wrist Flexors"] }, deletedOnPhone: { name: "Gone", muscles: [] } },
      };
      const current = {
        ...loaded,
        muscleGroups: Muscle_updateMuscleGroup(loaded.muscleGroups, "edited", ["Wrist Extensors"]),
      };
      const request = Settings_webEditorSettingsRequest(loaded, current);
      expect(Object.keys(request.settings.muscleGroupsUpdate || {})).to.deep.equal(["edited"]);

      const stored = {
        ...loaded,
        muscleGroups: { ...loaded.muscleGroups, data: { edited: loaded.muscleGroups.data.edited } },
      };
      const result = Settings_applyWebEditorSettings(stored, request.settings, {
        muscleGroupKeys: request.deletedMuscleGroupKeys,
      });
      expect(result.muscleGroups.data.deletedOnPhone).to.equal(undefined);
      expect(result.muscleGroups.data.edited?.muscles).to.deep.equal(["Wrist Extensors"]);
    });

    it("merges an older client's whole planner into the stored ranges", () => {
      const stored = Settings_build();
      const oldPlanner = { ...stored.planner, weeklyRangeSets: { shoulders: [8, 14] as [number, number] } };
      const result = Settings_applyWebEditorSettings(stored, { planner: oldPlanner });
      expect(result.planner.weeklyRangeSets.shoulders).to.deep.equal([8, 14]);
      expect(result.planner.weeklyRangeSets.sideDelts).to.deep.equal([10, 18]);
    });
  });

  describe("Settings_applyWebEditorSettings units", () => {
    it("converts equipment that follows the app unit", () => {
      const result = Settings_applyWebEditorSettings(Settings_build("lb"), { units: "kg" });
      expect(result.gyms[0].equipment.barbell?.setup?.unit).to.equal("kg");
    });

    it("keeps the gyms when the unit does not change", () => {
      const settings = Settings_build("lb");
      expect(Settings_applyWebEditorSettings(settings, { units: "lb" }).gyms).to.equal(settings.gyms);
    });
  });

  describe("Settings_webEditorInitial", () => {
    it("keeps the stored workout settings over the defaults", () => {
      const stored = Settings_build();
      stored.workoutSettings = { targetType: "e1rm", pickerSort: "similar_muscles" };
      const result = Settings_webEditorInitial(stored, undefined);
      expect(result.workoutSettings.targetType).to.equal("e1rm");
      expect(result.workoutSettings.pickerSort).to.equal("similar_muscles");
    });

    it("loads the stored starred exercises", () => {
      const stored = { ...Settings_build(), starredExercises: { squat: true } };
      expect(Settings_webEditorInitial(stored, undefined).starredExercises).to.deep.equal({ squat: true });
    });

    it("lets a shared program's custom exercises fill in next to the stored ones", () => {
      const stored = Settings_build();
      stored.exercises = { a: customExercise("a", "A") };
      const result = Settings_webEditorInitial(stored, { b: customExercise("b", "B") });
      expect(Object.keys(result.exercises).sort()).to.deep.equal(["a", "b"]);
    });

    it("builds the default equipment in the stored unit", () => {
      const result = Settings_webEditorInitial(Settings_build("kg"), undefined);
      expect(result.units).to.equal("kg");
      expect(result.gyms[0].equipment.barbell?.setup?.unit).to.equal("kg");
    });

    it("builds defaults for a visitor with no storage", () => {
      const result = Settings_webEditorInitial(undefined, undefined);
      expect(result.workoutSettings).to.deep.equal(Settings_build().workoutSettings);
      expect(result.starredExercises).to.equal(undefined);
    });
  });

  describe("Settings_webEditorSettingsRequest", () => {
    it("sends nothing optional when only the program-level settings changed", () => {
      const initial = Settings_build();
      const request = Settings_webEditorSettingsRequest(initial, { ...initial, units: "kg" });
      expect(request.settings.exercises).to.equal(undefined);
      expect(request.settings.starredExercises).to.equal(undefined);
      expect(request.settings.workoutSettings).to.equal(undefined);
      expect(request.deletedStarredExerciseKeys).to.deep.equal([]);
    });

    it("sends a star and names an unstar", () => {
      const initial = { ...Settings_build(), starredExercises: { squat: true } };
      let starred = Settings_toggleStarred(initial.starredExercises, "squat");
      starred = Settings_toggleStarred(starred, "bench");
      const request = Settings_webEditorSettingsRequest(initial, { ...initial, starredExercises: starred });
      expect(request.settings.starredExercises).to.deep.equal({ bench: true });
      expect(request.deletedStarredExerciseKeys).to.deep.equal(["squat"]);
    });

    it("sends only the picker settings that changed, never targetType", () => {
      const initial = Settings_build();
      initial.workoutSettings = { targetType: "e1rm", shouldShowInvisibleEquipment: false };
      const current = {
        ...initial,
        workoutSettings: { ...initial.workoutSettings, pickerSort: "similar_muscles" as const },
      };
      const request = Settings_webEditorSettingsRequest(initial, current);
      expect(request.settings.workoutSettings).to.deep.equal({ pickerSort: "similar_muscles" });
    });

    it("sends only the custom exercises edited on the page", () => {
      const initial = Settings_build();
      initial.exercises = { mine: customExercise("mine", "Mine"), shared: customExercise("shared", "Shared") };
      const current = {
        ...initial,
        exercises: {
          ...initial.exercises,
          mine: { ...customExercise("mine", "Mine"), isDeleted: true },
          created: customExercise("created", "Created"),
        },
      };
      const request = Settings_webEditorSettingsRequest(initial, current);
      expect(Object.keys(request.settings.exercises || {}).sort()).to.deep.equal(["created", "mine"]);
      expect(request.settings.exercises?.mine?.isDeleted).to.equal(true);
    });

    it("names an exerciseData override cleared since page load", () => {
      const initial = Settings_build();
      initial.exerciseData = { squat: { rm1: undefined } };
      const request = Settings_webEditorSettingsRequest(initial, { ...initial, exerciseData: {} });
      expect(request.deletedExerciseDataKeys).to.deep.equal(["squat"]);
    });

    it("produces a payload the server accepts", () => {
      const initial = Settings_build();
      const current = {
        ...initial,
        starredExercises: { squat: true },
        exercises: { created: customExercise("created", "Created") },
      };
      const request = Settings_webEditorSettingsRequest(initial, current);
      expect(Storage_validate(request.settings, VWebEditorSettings, "settings").success).to.equal(true);
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
