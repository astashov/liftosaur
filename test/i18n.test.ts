import "mocha";
import { expect } from "chai";
import * as v from "valibot";
import { I18n_createTranslator, I18n_resolveLanguage, I18n_translate } from "../src/i18n";
import { I18n_exerciseName } from "../src/i18n/exercises";
import fr from "../src/i18n/fr.json";
import exerciseNames from "../src/i18n/exercises.fr.json";
import { Settings_build } from "../src/models/settings";
import { VSettings } from "../src/types";
import { allExercisesList } from "../src/models/exercise";

describe("French localization", () => {
  it("respects an explicit choice before device locales", () => {
    expect(I18n_resolveLanguage("en", ["fr-FR"])).to.equal("en");
    expect(I18n_resolveLanguage("fr", ["en-US"])).to.equal("fr");
  });

  it("uses the primary device language and falls back to English", () => {
    for (const locale of ["fr", "fr-FR", "fr-CA", "fr_MQ"]) {
      expect(I18n_resolveLanguage(undefined, [locale])).to.equal("fr");
    }
    expect(I18n_resolveLanguage("system", ["fr-FR"])).to.equal("fr");
    expect(I18n_resolveLanguage("system", ["de-DE", "fr-FR"])).to.equal("en");
    expect(I18n_resolveLanguage(undefined)).to.equal("en");
    expect(I18n_resolveLanguage("unknown", ["en-US"])).to.equal("en");
  });

  it("falls back safely for missing keys and prototype properties", () => {
    expect(I18n_translate("fr", "A new untranslated message")).to.equal("A new untranslated message");
    expect(I18n_translate("fr", "constructor")).to.equal("constructor");
    expect(I18n_translate("fr", "__proto__")).to.equal("__proto__");
    expect(I18n_translate("en", "Workout")).to.equal("Workout");
  });

  it("interpolates named values literally, keeping absent parameters", () => {
    expect(I18n_translate("fr", "{count} sets", { count: 3 })).to.equal("3 séries");
    expect(I18n_translate("en", "{name}: {count}", { name: "$& {count}", count: 2 })).to.equal("$& {count}: 2");
    expect(I18n_translate("fr", "{count} sets")).to.equal("{count} séries");
  });

  it("keeps independent translators isolated", () => {
    const english = I18n_createTranslator("en");
    const french = I18n_createTranslator("fr");
    expect(french("Workout")).to.equal("Séance");
    expect(english("Workout")).to.equal("Workout");
  });

  it("reads old settings and preserves the choice through JSON validation", () => {
    const oldSettings = Settings_build();
    expect(v.safeParse(VSettings, oldSettings).success).to.equal(true);
    for (const language of ["system", "en", "fr"] as const) {
      const restored = v.parse(VSettings, JSON.parse(JSON.stringify({ ...oldSettings, language })));
      expect(restored.language).to.equal(language);
    }
    expect(v.safeParse(VSettings, { ...oldSettings, language: "xx" }).success).to.equal(false);
  });

  it("provides nonempty translations with identical interpolation tokens", () => {
    const tokens = (s: string): string[] => (s.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g) || []).sort();
    for (const [english, french] of Object.entries(fr)) {
      expect(french.trim(), english).not.to.equal("");
      expect(tokens(french), english).to.deep.equal(tokens(english));
    }
  });

  it("translates every built-in exercise without changing canonical names or custom exercises", () => {
    for (const exercise of Object.values(allExercisesList)) {
      expect(exerciseNames).to.have.property(exercise.name);
    }
    const exercise = { id: "benchPress", name: "Bench Press" };
    expect(I18n_exerciseName(exercise, {}, "fr")).to.equal("Développé couché");
    expect(I18n_exerciseName(exercise, {}, "en")).to.equal("Bench Press");
    const custom = Settings_build().exercises;
    // A user can customize an exercise even when its name matches a library exercise.
    custom.benchPress = { name: "Bench Press" } as NonNullable<typeof custom.benchPress>;
    expect(I18n_exerciseName(exercise, custom, "fr")).to.equal("Bench Press");
    expect(exercise.name).to.equal("Bench Press");
  });
});
