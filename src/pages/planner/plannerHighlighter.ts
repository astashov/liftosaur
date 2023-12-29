import { highlightTree, classHighlighter, styleTags, tags as t } from "@lezer/highlight";
import { PlannerNodeName } from "./plannerExerciseEvaluator";
import { parser as plannerExerciseParser } from "./plannerExerciseParser";

const parserWithMetadata = plannerExerciseParser.configure({
  props: [
    styleTags({
      [`${[PlannerNodeName.SetPart]}/...`]: t.atom,
      [`${[PlannerNodeName.WarmupSetPart]}/...`]: t.atom,
      [`${[PlannerNodeName.Rpe]}/...`]: t.number,
      [`${[PlannerNodeName.Timer]}/...`]: t.keyword,
      [`${[PlannerNodeName.Weight]}/...`]: t.number,
      [`${[PlannerNodeName.Percentage]}/...`]: t.number,
      [PlannerNodeName.LineComment]: t.lineComment,
      [PlannerNodeName.TripleLineComment]: t.blockComment,
      [PlannerNodeName.SectionSeparator]: t.lineComment,
      [`${[PlannerNodeName.ExercisePropertyName]}/...`]: t.keyword,
      [`${[PlannerNodeName.FunctionName]}/...`]: t.attributeName,
      [`${[PlannerNodeName.FunctionArgument]}/...`]: t.attributeValue,
      [PlannerNodeName.None]: t.atom,
    }),
  ],
});

type IRange = { from: number; to: number; clazz: string };

export class PlannerHighlighter {
  public static highlight(script: string): string {
    const tree = parserWithMetadata.parse(script);
    const ranges: IRange[] = [];
    highlightTree(tree, classHighlighter, (from, to, classes) => {
      ranges.push({ from, to, clazz: classes });
    });
    const highlightedSource = ranges.reduceRight((acc, range) => {
      const clazz = range.clazz;
      const highlighted = `<span class="${clazz}">${acc.slice(range.from, range.to)}</span>`;
      return acc.slice(0, range.from) + highlighted + acc.slice(range.to);
    }, script);
    return highlightedSource;
  }
}
