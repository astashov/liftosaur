import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import { LRLanguage, LanguageSupport } from "@codemirror/language";
import { styleTags } from "@lezer/highlight";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { Exercise } from "../../models/exercise";
import { PlannerEditor } from "./plannerEditor";
import { plannerExerciseStyles } from "./plannerExerciseStyles";
import { parseMixed } from "@lezer/common";
import { buildLiftoscriptLanguageSupport } from "../../liftoscriptCodemirror";
import { liftoscriptLanguage } from "../../liftoscriptLanguage";
import { StringUtils } from "../../utils/string";

const parserWithMetadata = plannerExerciseParser.configure({
  props: [styleTags(plannerExerciseStyles)],
  wrap: parseMixed((node) => {
    return node.name === "Liftoscript" ? { parser: liftoscriptLanguage.parser } : null;
  }),
});

const language = LRLanguage.define({
  name: "plannerExercise",
  parser: parserWithMetadata,
});

export function buildPlannerExerciseLanguageSupport(plannerEditor: PlannerEditor): LanguageSupport {
  const completion = language.data.of({
    autocomplete: (context: CompletionContext): CompletionResult | undefined => {
      const exerciseMatch = context.matchBefore(/^[^\/]+/);
      console.log(exerciseMatch);
      if (exerciseMatch) {
        let text = exerciseMatch.text;
        const newText = text.replace(/^[^:]*:/, "");
        const offset = text.length - newText.length;
        text = newText;
        const exerciseNames = Exercise.searchNames(text.trim(), plannerEditor.args.customExercises || {});
        const result = {
          from: exerciseMatch.from + offset,
          options: exerciseNames.map((name) => ({ label: name, type: "keyword" })),
          validFor: /.*/,
        };
        return result;
      }
      const reuseMatch = context.matchBefore(/\.\.\.[^\/]*/);
      if (reuseMatch) {
        const text = reuseMatch.text.replace("...", "");
        const exerciseFullNames = (plannerEditor.args.exerciseFullNames || []).filter((name) => {
          return StringUtils.fuzzySearch(text.toLowerCase(), name.toLowerCase());
        });
        return {
          from: reuseMatch.from + 3,
          options: exerciseFullNames.map((prop) => ({ label: prop, type: "method" })),
          validFor: /.*/,
        };
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
        const availableFns = ["lp", "sum", "dp", "custom"];
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

  return new LanguageSupport(language, [completion, buildLiftoscriptLanguageSupport({ state: {} }).support]);
}
