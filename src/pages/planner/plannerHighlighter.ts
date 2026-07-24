import { highlightTree, classHighlighter, styleTags } from "@lezer/highlight";
import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import { plannerExerciseStyles } from "./plannerExerciseStyles";
import { parseMixed } from "@lezer/common";
import { liftoscriptLanguage } from "../../liftoscriptLanguage";

const parserWithMetadata = plannerExerciseParser.configure({
  props: [styleTags(plannerExerciseStyles)],
  wrap: parseMixed((node) => {
    return node.name === "Liftoscript" ? { parser: liftoscriptLanguage.parser } : null;
  }),
});

type IRange = { from: number; to: number; clazz: string };

export interface IHighlightSegment {
  text: string;
  clazz: string | null;
}

function buildRanges(script: string): IRange[] {
  const tree = parserWithMetadata.parse(script);
  const ranges: IRange[] = [];
  highlightTree(tree, classHighlighter, (from, to, classes) => {
    ranges.push({ from, to, clazz: classes });
  });
  return ranges;
}

export function PlannerHighlighter_highlight(script: string): string {
  const ranges = buildRanges(script);
  const highlightedSource = ranges.reduceRight((acc, range) => {
    const clazz = range.clazz;
    const highlighted = `<span class="${clazz}">${acc.slice(range.from, range.to)}</span>`;
    return acc.slice(0, range.from) + highlighted + acc.slice(range.to);
  }, script);
  return highlightedSource;
}

export function PlannerHighlighter_segments(script: string): IHighlightSegment[] {
  const ranges = buildRanges(script)
    .slice()
    .sort((a, b) => a.from - b.from);
  const segments: IHighlightSegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.from < cursor) {
      continue;
    }
    if (range.from > cursor) {
      segments.push({ text: script.slice(cursor, range.from), clazz: null });
    }
    segments.push({ text: script.slice(range.from, range.to), clazz: range.clazz });
    cursor = range.to;
  }
  if (cursor < script.length) {
    segments.push({ text: script.slice(cursor), clazz: null });
  }
  return segments;
}
