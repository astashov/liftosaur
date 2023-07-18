import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import { LRLanguage, LanguageSupport } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { CompletionContext } from "@codemirror/autocomplete";
import { Exercise } from "../../models/exercise";
import { PlannerEditor } from "./plannerEditor";

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

export function buildPlannerExerciseLanguageSupport(plannerEditor: PlannerEditor): LanguageSupport {
  const completion = language.data.of({
    autocomplete: (context: CompletionContext) => {
      const exerciseMatch = context.matchBefore(/^[^\/]+/);
      if (exerciseMatch) {
        const exerciseNames = Exercise.searchNames(exerciseMatch.text, plannerEditor.args.customExercises || {});
        const result = {
          from: exerciseMatch.from,
          options: exerciseNames.map((name) => ({ label: name, type: "keyword" })),
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
