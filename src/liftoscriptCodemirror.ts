import { parser as liftoscriptParser } from "./liftoscript";
import { LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp, foldInside } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { completeFromList } from "@codemirror/autocomplete";

const liftoscriptParserWithMetadata = liftoscriptParser.configure({
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

export const liftosaurCompletion = liftoscriptLanguage.data.of({
  autocomplete: completeFromList([
    { label: "state", type: "keyword" },
    { label: "weights", type: "keyword" },
    { label: "reps", type: "keyword" },
    { label: "completedReps", type: "keyword" },
    { label: "day", type: "keyword" },
    { label: "setIndex", type: "keyword" },
    { label: "numberOfSets", type: "keyword" },
    { label: "roundWeight", type: "function" },
    { label: "calculateTrainingMax", type: "function" },
    { label: "floor", type: "function" },
    { label: "round", type: "function" },
    { label: "ceil", type: "function" },
    { label: "sum", type: "function" },
    { label: "min", type: "function" },
    { label: "max", type: "function" },
  ]),
});

export const liftoscriptCodemirror = new LanguageSupport(liftoscriptLanguage, [liftosaurCompletion]);
