import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import { LRLanguage, LanguageSupport } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
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
      PropName: t.propertyName,
      FnName: t.attributeName,
      FnArg: t.attributeValue,
    }),
  ],
});

const language = LRLanguage.define({
  name: "plannerExercise",
  parser: parserWithMetadata,
});

export function buildPlannerExerciseLanguageSupport(plannerEditor: PlannerEditor): LanguageSupport {
  const completion = language.data.of({
    autocomplete: (context: CompletionContext): CompletionResult | undefined => {
      console.log("is explicit", context.explicit);
      const exerciseMatch = context.matchBefore(/^[^\/]+/);
      if (exerciseMatch) {
        const exerciseNames = Exercise.searchNames(exerciseMatch.text, plannerEditor.args.customExercises || {});
        const result = {
          from: exerciseMatch.from,
          options: exerciseNames.map((name) => ({ label: name, type: "keyword" })),
          validFor: /.*/,
        };
        return result;
      }
      const sectionMatch = context.matchBefore(/\/\s*\w+$/);
      if (sectionMatch) {
        let text = sectionMatch.text;
        const offsetMatch = sectionMatch.text.match(/\/\s*/);
        if (offsetMatch) {
          text = text.substring(offsetMatch[0].length);
        }
        const availableProps = ["progress: "];
        const selectedProps = availableProps.filter((prop) => prop.startsWith(text));
        return {
          from: sectionMatch.from + (offsetMatch?.[0]?.length ?? 0),
          options: selectedProps.map((prop) => ({ label: prop, type: "property" })),
          validFor: /.*/,
        };
      }
      const propertyMatch = context.matchBefore(/progress:\s*[^\(]*$/);
      if (propertyMatch) {
        let text = propertyMatch.text;
        const offsetMatch = propertyMatch.text.match(/progress:\s*/);
        if (offsetMatch) {
          text = text.substring(offsetMatch[0].length);
        }
        const availableFns = ["lp", "sum", "dp"];
        const selectedFns = availableFns.filter((prop) => prop.startsWith(text));
        return {
          from: propertyMatch.from + (offsetMatch?.[0]?.length ?? 0),
          options: selectedFns.map((prop) => ({ label: prop, type: "function" })),
          validFor: /.*/,
        };
      }
      return undefined;
    },
  });

  return new LanguageSupport(language, [completion]);
}
