import { parser as liftoscriptParser } from "./liftoscript";
import { LRLanguage, indentNodeProp, foldNodeProp, foldInside } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";

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

export const liftoscriptLanguage = LRLanguage.define({
  name: "liftoscript",
  parser: liftoscriptParserWithMetadata,
});
