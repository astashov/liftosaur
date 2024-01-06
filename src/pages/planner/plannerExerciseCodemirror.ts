import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import { LRLanguage, LanguageSupport } from "@codemirror/language";
import { styleTags } from "@lezer/highlight";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { Exercise } from "../../models/exercise";
import { PlannerEditor } from "./plannerEditor";
import { plannerExerciseStyles } from "./plannerExerciseStyles";
import { parseMixed } from "@lezer/common";
import { liftoscriptParserWithMetadata } from "../../liftoscriptCodemirror";
import { Equipment } from "../../models/equipment";

const parserWithMetadata = plannerExerciseParser.configure({
  props: [styleTags(plannerExerciseStyles)],
  wrap: parseMixed((node) => {
    return node.name === "Liftoscript" ? { parser: liftoscriptParserWithMetadata } : null;
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
      if (exerciseMatch) {
        let text = exerciseMatch.text;
        if (text.match(/,\s*\w*$/)) {
          const offsetMatch = text.match(/(,\s*)(\w*)/);
          const offset = offsetMatch ? text.length - offsetMatch[2].length : text.length;
          text = text.substring(offset);
          const availableEquipment = Equipment.availableEquipmentNames(plannerEditor.args.equipment);
          const equipment = availableEquipment.filter((eq) => eq.startsWith(text));
          return {
            from: exerciseMatch.from + offset,
            options: equipment.map((eq) => ({ label: eq as string, type: "method" })),
            validFor: /.*/,
          };
        } else {
          const exerciseNames = Exercise.searchNames(text, plannerEditor.args.customExercises || {});
          const result = {
            from: exerciseMatch.from,
            options: exerciseNames.map((name) => ({ label: name, type: "keyword" })),
            validFor: /.*/,
          };
          return result;
        }
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
