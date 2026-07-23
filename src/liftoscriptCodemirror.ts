import { LanguageSupport, syntaxTree } from "@codemirror/language";
import { completeFromList, CompletionContext } from "@codemirror/autocomplete";
import type { IProgramState } from "./types";
import { PlannerNodeName } from "./pages/planner/plannerExerciseStyles";
import { SyntaxNode } from "@lezer/common";
import { liftoscriptLanguage } from "./liftoscriptLanguage";
import { PlannerStateVars_fromArgs } from "./pages/planner/models/plannerStateVars";
import { liftoscriptFnSignatures, VScriptBindings, IScriptFnSignature, IScriptFnName } from "./liftoscriptFns";

// In autocomplete the short aliases (w = weights, cr = completedReps, ...) are noise —
// they'd pop up on almost every keystroke while saving no typing over the completion itself.
const bindingAliases = new Set(["w", "r", "cr", "cw", "mr", "ns"]);

function fnSignatureDetail(signature: IScriptFnSignature): string {
  if (signature.variadic != null) {
    return "(...values)";
  }
  return `(${(signature.args || []).map((a) => (a.optional ? `${a.name}?` : a.name)).join(", ")})`;
}

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
    const state = PlannerStateVars_fromArgs(fnArgs).state;
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
        const bindingOptions = Object.keys(VScriptBindings.entries)
          .filter((key) => !bindingAliases.has(key))
          .map((key) => ({ label: key, type: "keyword liftoscript" }));
        const fnOptions = (Object.keys(liftoscriptFnSignatures) as IScriptFnName[]).map((name) => ({
          label: name,
          type: "function liftoscript",
          detail: fnSignatureDetail(liftoscriptFnSignatures[name]),
        }));
        return completeFromList([
          { label: "state", type: "keyword liftoscript" },
          { label: "var", type: "keyword liftoscript" },
          ...bindingOptions,
          ...fnOptions,
        ])(context);
      }
    },
  });

  return new LanguageSupport(liftoscriptLanguage, [liftosaurCompletion]);
}
