import "mocha";
import { expect } from "chai";
import {
  Settings_build,
  Settings_applyWebEditorSettings,
  Settings_webEditorSettingsUpdate,
  Settings_applyExportedProgram,
} from "../src/models/settings";
import { Program_create, Program_exportProgram } from "../src/models/program";
import { IProgramContentSettings, VProgramContentSettings } from "../src/types";
import { Storage_validate } from "../src/models/storage";

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
      const result = Settings_applyWebEditorSettings(settings, { exerciseData: { bench: { rm1: undefined } } }, [
        "squat",
      ]);
      expect(Object.keys(result.exerciseData)).to.deep.equal(["bench"]);
    });

    it("removes a deleted entry even when the payload omits exerciseData entirely", () => {
      const settings = Settings_build();
      settings.exerciseData = { squat: { rm1: undefined } };
      const result = Settings_applyWebEditorSettings(settings, { units: "kg" }, ["squat"]);
      expect(Object.keys(result.exerciseData)).to.deep.equal([]);
    });

    it("does not mutate the settings it was given", () => {
      const settings = Settings_build();
      settings.exerciseData = { squat: { rm1: undefined } };
      Settings_applyWebEditorSettings(settings, {}, ["squat"]);
      expect(Object.keys(settings.exerciseData)).to.deep.equal(["squat"]);
    });

    it("ignores keys outside the whitelist", () => {
      const settings = Settings_build();
      // Storage_validate returns its input rather than valibot's stripped output, so the handler
      // hands the merge a payload that still carries whatever extra keys the browser sent
      const body = { units: "kg", volume: 999, nickname: "hacker" };
      expect(Storage_validate(body, VProgramContentSettings, "settings").success).to.equal(true);
      const result = Settings_applyWebEditorSettings(settings, body as IProgramContentSettings);
      expect(result.units).to.equal("kg");
      expect(result.volume).to.equal(settings.volume);
      expect(result.nickname).to.equal(settings.nickname);
    });

    it("rejects a payload whose whitelisted field has the wrong shape", () => {
      const result = Storage_validate({ planner: { synergistMultiplier: "a lot" } }, VProgramContentSettings, "s");
      expect(result.success).to.equal(false);
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
