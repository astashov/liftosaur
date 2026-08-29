import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import { LRLanguage, LanguageSupport, syntaxTree } from "@codemirror/language";
import { styleTags } from "@lezer/highlight";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { PlannerEditor } from "./plannerEditor";
import { plannerExerciseStyles } from "./plannerExerciseStyles";
import { parseMixed } from "@lezer/common";
import { buildLiftoscriptLanguageSupport } from "../../liftoscriptCodemirror";
import { liftoscriptLanguage } from "../../liftoscriptLanguage";
import { PlannerCompletions_codemirrorPlanner, PlannerCompletionsIndex } from "./plannerCompletions";

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
  const index = new PlannerCompletionsIndex();
  const completion = language.data.of({
    autocomplete: (context: CompletionContext): CompletionResult | undefined => {
      const result = PlannerCompletions_codemirrorPlanner(context.state.doc.toString(), context.pos, {
        customExercises: plannerEditor.args.customExercises,
        exerciseFullNames: plannerEditor.args.exerciseFullNames,
        index,
        tree: syntaxTree(context.state),
      });
      if (result == null) {
        return undefined;
      }
      // `to` is deliberately not forwarded: CodeMirror's own default is to replace up to the
      // cursor, and the web editor has always behaved that way. The phone replaces the whole
      // token because a tap puts the caret mid-word far more often than a click does.
      return { from: result.from, options: result.options, validFor: /.*/ };
    },
  });

  return new LanguageSupport(language, [completion, buildLiftoscriptLanguageSupport({ state: {} }).support]);
}
