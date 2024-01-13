import { parser as liftoscriptParser } from "./liftoscript";
import { LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp, foldInside } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { completeFromList, CompletionContext } from "@codemirror/autocomplete";
import { CodeEditor } from "./editor";

export const liftoscriptParserWithMetadata = liftoscriptParser.configure({
  props: [
    styleTags({
      StateVariable: t.variableName,
      Number: t.number,
      LineComment: t.lineComment,
      Unit: t.unit,
      Keyword: t.keyword,
    }),
    indentNodeProp.add({
      IfExpression: (context) => context.column(context.node.from) + context.unit,
    }),
    foldNodeProp.add({
      IfExpression: foldInside,
    }),
  ],
});

const liftoscriptLanguage = LRLanguage.define({
  name: "liftoscript",
  parser: liftoscriptParserWithMetadata,
});

export function buildLiftoscriptLanguageSupport(codeEditor: CodeEditor): LanguageSupport {
  const liftosaurCompletion = liftoscriptLanguage.data.of({
    autocomplete: (context: CompletionContext) => {
      const stateVar = context.matchBefore(/state\.[a-zA-Z0-9_]*/);
      if (stateVar != null) {
        const stateVarPrefix = stateVar.text.replace(/^state\./, "");
        const stateVarOptions = Object.keys(codeEditor.state).filter((key) => key.startsWith(stateVarPrefix));
        const result = {
          from: stateVar.from + "state.".length,
          options: stateVarOptions.map((opt) => ({ label: opt, type: "keyword" })),
          validFor: /.*/,
        };
        return result;
      } else {
        return completeFromList([
          { label: "state", type: "keyword" },
          { label: "weights", type: "keyword" },
          { label: "reps", type: "keyword" },
          { label: "minReps", type: "keyword" },
          { label: "RPE", type: "keyword" },
          { label: "completedReps", type: "keyword" },
          { label: "completedRPE", type: "keyword" },
          { label: "rm1", type: "keyword" },
          { label: "day", type: "keyword" },
          { label: "week", type: "keyword" },
          { label: "dayInWeek", type: "keyword" },
          { label: "setIndex", type: "keyword" },
          { label: "numberOfSets", type: "keyword" },
          { label: "roundWeight", type: "function" },
          { label: "calculateTrainingMax", type: "function" },
          { label: "calculate1RM", type: "function" },
          { label: "zeroOrGte", type: "function" },
          { label: "rpeMultiplier", type: "function" },
          { label: "floor", type: "function" },
          { label: "round", type: "function" },
          { label: "ceil", type: "function" },
          { label: "sum", type: "function" },
          { label: "min", type: "function" },
          { label: "max", type: "function" },
        ])(context);
      }
    },
  });

  return new LanguageSupport(liftoscriptLanguage, [liftosaurCompletion]);
}
