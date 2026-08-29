import { LanguageSupport, syntaxTree } from "@codemirror/language";
import { CompletionContext } from "@codemirror/autocomplete";
import type { IProgramState } from "./types";
import { liftoscriptLanguage } from "./liftoscriptLanguage";
import { PlannerCompletions_codemirrorLiftoscript } from "./pages/planner/plannerCompletions";

export function buildLiftoscriptLanguageSupport(codeEditor: { state: IProgramState }): LanguageSupport {
  const liftosaurCompletion = liftoscriptLanguage.data.of({
    autocomplete: (context: CompletionContext) => {
      const result = PlannerCompletions_codemirrorLiftoscript(context.state.doc.toString(), context.pos, {
        tree: syntaxTree(context.state),
        state: codeEditor.state,
      });
      if (result == null) {
        return null;
      }
      return {
        from: result.from,
        options: result.options,
        // The bare word list is what completeFromList used to return, and it re-queries once
        // the text stops being a word; everything else stays valid and is filtered by
        // CodeMirror as you type.
        validFor: result.kind === "liftoscript" ? /\w*$/ : /.*/,
      };
    },
  });

  return new LanguageSupport(liftoscriptLanguage, [liftosaurCompletion]);
}
