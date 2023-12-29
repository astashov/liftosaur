import { highlightTree, classHighlighter, styleTags } from "@lezer/highlight";
import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import { plannerExerciseStyles } from "./plannerExerciseStyles";

const parserWithMetadata = plannerExerciseParser.configure({
  props: [styleTags(plannerExerciseStyles)],
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
