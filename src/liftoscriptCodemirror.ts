import { LanguageSupport, syntaxTree } from "@codemirror/language";
import { completeFromList, CompletionContext } from "@codemirror/autocomplete";
import type { IProgramState } from "./types";
import { PlannerNodeName } from "./pages/planner/plannerExerciseStyles";
import { SyntaxNode } from "@lezer/common";
import { liftoscriptLanguage } from "./liftoscriptLanguage";
import { PlannerExerciseEvaluator } from "./pages/planner/plannerExerciseEvaluator";

function findStateInScope(context: CompletionContext, script: string): IProgramState | undefined {
  const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
  let node: SyntaxNode | null = nodeBefore;
  while (node != null && node.type.name !== PlannerNodeName.FunctionExpression) {
    node = node.parent;
  }
  if (node != null && node.type.name === PlannerNodeName.FunctionExpression) {
    const fnArgs = node.getChildren(PlannerNodeName.FunctionArgument).map((argNode) => {
      return script.slice(argNode.from, argNode.to);
    });
    const state = PlannerExerciseEvaluator.fnArgsToStateVars(fnArgs).state;
    return state;
  } else {
    return undefined;
  }
}

export function buildLiftoscriptLanguageSupport(codeEditor: { state: IProgramState }): LanguageSupport {
  const liftosaurCompletion = liftoscriptLanguage.data.of({
    autocomplete: (context: CompletionContext) => {
      const stateVar = context.matchBefore(/state\.[a-zA-Z0-9_]*/);
      if (stateVar != null) {
        const stateKeys = Object.keys(findStateInScope(context, context.state.doc.toString()) || codeEditor.state);
        const stateVarPrefix = stateVar.text.replace(/^state\./, "");
        const stateVarOptions = stateKeys.filter((key) => key.startsWith(stateVarPrefix));
        const result = {
          from: stateVar.from + "state.".length,
          options: stateVarOptions.map((opt) => ({ label: opt, type: "keyword liftoscript" })),
          validFor: /.*/,
        };
        return result;
      } else {
        return completeFromList([
          { label: "state", type: "keyword liftoscript" },
          { label: "var", type: "keyword liftoscript" },
          { label: "weights", type: "keyword liftoscript" },
          { label: "reps", type: "keyword liftoscript" },
          { label: "minReps", type: "keyword liftoscript" },
          { label: "RPE", type: "keyword liftoscript" },
          { label: "completedReps", type: "keyword liftoscript" },
          { label: "completedRPE", type: "keyword liftoscript" },
          { label: "completedWeights", type: "keyword liftoscript" },
          { label: "setVariationIndex", type: "keyword liftoscript" },
          { label: "descriptionIndex", type: "keyword liftoscript" },
          { label: "rm1", type: "keyword liftoscript" },
          { label: "day", type: "keyword liftoscript" },
          { label: "week", type: "keyword liftoscript" },
          { label: "dayInWeek", type: "keyword liftoscript" },
          { label: "setIndex", type: "keyword liftoscript" },
          { label: "programNumberOfSets", type: "keyword liftoscript" },
          { label: "numberOfSets", type: "keyword liftoscript" },
          { label: "completedNumberOfSets", type: "keyword liftoscript" },
          { label: "roundWeight", type: "function liftoscript" },
          { label: "calculateTrainingMax", type: "function liftoscript" },
          { label: "calculate1RM", type: "function liftoscript" },
          { label: "zeroOrGte", type: "function liftoscript" },
          { label: "print", type: "function liftoscript" },
          { label: "sets", type: "function liftoscript" },
          { label: "rpeMultiplier", type: "function liftoscript" },
          { label: "floor", type: "function liftoscript" },
          { label: "round", type: "function liftoscript" },
          { label: "ceil", type: "function liftoscript" },
          { label: "sum", type: "function liftoscript" },
          { label: "min", type: "function liftoscript" },
          { label: "max", type: "function liftoscript" },
        ])(context);
      }
    },
  });

  return new LanguageSupport(liftoscriptLanguage, [liftosaurCompletion]);
}
