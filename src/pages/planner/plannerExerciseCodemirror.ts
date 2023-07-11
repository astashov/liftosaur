import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import { LRLanguage, LanguageSupport } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { CompletionContext } from "@codemirror/autocomplete";
import { Exercise } from "../../models/exercise";

const parserWithMetadata = plannerExerciseParser.configure({
  props: [
    styleTags({
      Word: t.variableName,
      Rpe: t.number,
      Timer: t.keyword,
      SetPart: t.atom,
      LineComment: t.lineComment,
      SectionSeparator: t.lineComment,
    }),
  ],
});

const language = LRLanguage.define({
  name: "plannerExercise",
  parser: parserWithMetadata,
});

export function buildPlannerExerciseLanguageSupport(): LanguageSupport {
  const completion = language.data.of({
    autocomplete: (context: CompletionContext) => {
      const exerciseMatch = context.matchBefore(/^[^\/]+/);
      if (exerciseMatch) {
        const exercises = Exercise.search(exerciseMatch.text, {});
        const result = {
          from: exerciseMatch.from,
          options: exercises.map((ex) => ({ label: ex.name, type: "keyword" })),
          validFor: /.*/,
        };
        return result;
      } else {
        return undefined;
      }
    },
  });

  return new LanguageSupport(language, [completion]);
}
