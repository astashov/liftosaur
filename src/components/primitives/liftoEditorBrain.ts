import { SyntaxNode } from "@lezer/common";
import { parser } from "../../pages/planner/plannerExerciseParser";
import { PlannerNodeName } from "../../pages/planner/plannerExerciseStyles";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

export interface ILiftoEditorStyledRange {
  start: number;
  end: number;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
}

interface INodeStyle {
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

// Mirrors plannerExerciseStyles.ts tag assignments and plannerEditor.ts tag->semantic-color
// mapping, collapsed into node->color since there's no CodeMirror HighlightStyle here.
function nodeStyles(): Partial<Record<PlannerNodeName, INodeStyle>> {
  const syntax = Tailwind_semantic().syntax;
  return {
    [PlannerNodeName.SetPart]: { color: syntax.atom },
    [PlannerNodeName.WarmupSetPart]: { color: syntax.atom },
    [PlannerNodeName.Rpe]: { color: syntax.literal },
    [PlannerNodeName.Timer]: { color: syntax.keyword },
    [PlannerNodeName.SetTimer]: { color: syntax.keyword },
    [PlannerNodeName.Auto]: { color: syntax.keyword },
    [PlannerNodeName.Weight]: { color: syntax.literal },
    [PlannerNodeName.Percentage]: { color: syntax.literal },
    [PlannerNodeName.AskWeight]: { color: syntax.literal },
    [PlannerNodeName.LineComment]: { color: syntax.comment },
    [PlannerNodeName.TripleLineComment]: { color: syntax.blockComment },
    [PlannerNodeName.SupersetKeyword]: { color: syntax.keyword },
    [PlannerNodeName.SectionSeparator]: { color: syntax.comment },
    [PlannerNodeName.ExercisePropertyName]: { color: syntax.keyword },
    [PlannerNodeName.FunctionName]: { color: syntax.attributeName },
    [PlannerNodeName.FunctionArgument]: { color: syntax.attributeValue },
    [PlannerNodeName.None]: { color: syntax.atom },
    [PlannerNodeName.Week]: { color: syntax.annotation, bold: true },
    [PlannerNodeName.Day]: { color: syntax.docComment, bold: true },
    [PlannerNodeName.WeekDay]: { color: syntax.atom },
    [PlannerNodeName.Repeat]: { color: syntax.atom },
  };
}

export function LiftoEditorBrain_computeStyledRanges(text: string): ILiftoEditorStyledRange[] {
  const styles = nodeStyles();
  const ranges: ILiftoEditorStyledRange[] = [];
  const tree = parser.parse(text);
  tree.iterate({
    enter: (node) => {
      const style = styles[node.name as PlannerNodeName];
      if (style != null && node.to > node.from) {
        ranges.push({ start: node.from, end: node.to, ...style });
        return false;
      }
      return true;
    },
  });
  return ranges;
}

export interface INumericToken {
  start: number;
  end: number;
  text: string;
  kind: "weight" | "percentage" | "timer" | "number";
}

const wholeNumericTokenKinds: Partial<Record<PlannerNodeName, INumericToken["kind"]>> = {
  [PlannerNodeName.Weight]: "weight",
  [PlannerNodeName.Percentage]: "percentage",
  [PlannerNodeName.Timer]: "timer",
};

export function LiftoEditorBrain_numericTokens(text: string): INumericToken[] {
  const tokens: INumericToken[] = [];
  const tree = parser.parse(text);
  tree.iterate({
    enter: (node) => {
      const whole = wholeNumericTokenKinds[node.name as PlannerNodeName];
      if (whole != null) {
        tokens.push({ start: node.from, end: node.to, text: text.slice(node.from, node.to), kind: whole });
        return false;
      }
      if (node.name === PlannerNodeName.Int || node.name === PlannerNodeName.Float) {
        tokens.push({ start: node.from, end: node.to, text: text.slice(node.from, node.to), kind: "number" });
        return false;
      }
      return true;
    },
  });
  return tokens;
}

const stepByKind: Record<INumericToken["kind"], (suffix: string) => number> = {
  weight: (suffix) => (suffix === "kg" ? 2.5 : 5),
  percentage: () => 2.5,
  timer: () => 15,
  number: () => 1,
};

export function LiftoEditorBrain_stepToken(token: INumericToken, direction: 1 | -1): string | undefined {
  const match = token.text.match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
  if (match == null) {
    return undefined;
  }
  const [, sign, num, suffix] = match;
  const value = parseFloat(`${sign}${num}`);
  const step = stepByKind[token.kind](suffix);
  const next = Math.round((value + step * direction) * 100) / 100;
  return `${next}${suffix}`;
}

export interface ILiftoEditorHandle {
  setSelection: (start: number, end: number) => void;
  replaceRange: (start: number, end: number, text: string) => void;
  getText: () => string;
}

const breadcrumbLabels: Partial<Record<PlannerNodeName, string>> = {
  [PlannerNodeName.ExerciseSets]: "Sets",
  [PlannerNodeName.SetPart]: "Sets×Reps",
  [PlannerNodeName.Weight]: "Weight",
  [PlannerNodeName.WeightWithPlus]: "Weight",
  [PlannerNodeName.Percentage]: "Percentage",
  [PlannerNodeName.PercentageWithPlus]: "Percentage",
  [PlannerNodeName.Rpe]: "RPE",
  [PlannerNodeName.Timer]: "Rest timer",
  [PlannerNodeName.SetTimer]: "Set timer",
  [PlannerNodeName.WarmupExerciseSets]: "Warmup sets",
  [PlannerNodeName.WarmupSetPart]: "Sets×Reps",
  [PlannerNodeName.Repeat]: "Repeat",
  [PlannerNodeName.WeekDay]: "Week/Day",
  [PlannerNodeName.Superset]: "Superset",
  [PlannerNodeName.ReuseSection]: "Reuse",
  [PlannerNodeName.Week]: "Week",
  [PlannerNodeName.Day]: "Day",
};

export interface ILiftoEditorPill {
  label: string;
  insertAt: number;
  insertText: string;
}

export interface ILiftoEditorLevel {
  label: string;
  nodeName: string;
  start: number;
  end: number;
}

export interface ILiftoEditorContext {
  // Outer -> inner; breadcrumb is levels' labels. Each level carries its node's extent for
  // level highlighting and its node name for sibling walking.
  breadcrumb: string[];
  levels: ILiftoEditorLevel[];
  pills: ILiftoEditorPill[];
}

function nodeText(text: string, node: SyntaxNode): string {
  return text.slice(node.from, node.to);
}

function exercisePropertyNames(text: string, exercise: SyntaxNode): string[] {
  const names: string[] = [];
  for (const section of exercise.getChildren(PlannerNodeName.ExerciseSection)) {
    const property = section.getChild(PlannerNodeName.ExerciseProperty);
    const name = property?.getChild(PlannerNodeName.ExercisePropertyName);
    if (name != null) {
      names.push(nodeText(text, name));
    }
  }
  return names;
}

function endOfExerciseLine(text: string, exercise: SyntaxNode): number {
  let end = exercise.to;
  while (end > exercise.from && (text[end - 1] === "\n" || text[end - 1] === "\r")) {
    end -= 1;
  }
  return end;
}

// Flattens possibly-overlapping styled ranges into sorted non-overlapping segments with
// merged properties (later ranges win per property). The native sides assume exactly this.
export function LiftoEditorBrain_flattenRanges(ranges: ILiftoEditorStyledRange[]): ILiftoEditorStyledRange[] {
  const boundaries = Array.from(new Set(ranges.flatMap((r) => [r.start, r.end]))).sort((a, b) => a - b);
  const result: ILiftoEditorStyledRange[] = [];
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const covering = ranges.filter((r) => r.start <= start && r.end >= end);
    if (covering.length === 0) {
      continue;
    }
    const merged = covering.reduce<ILiftoEditorStyledRange>((acc, r) => ({ ...acc, ...r, start, end }), {
      start,
      end,
    });
    result.push(merged);
  }
  return result;
}

export function LiftoEditorBrain_contextAt(text: string, index: number): ILiftoEditorContext {
  const tree = parser.parse(text);
  const inner = tree.resolveInner(index, -1);
  const levels: ILiftoEditorLevel[] = [];
  const pills: ILiftoEditorPill[] = [];
  let setNode: SyntaxNode | undefined;
  let exerciseNode: SyntaxNode | undefined;
  for (let node: SyntaxNode | null = inner; node != null; node = node.parent) {
    const name = node.name as PlannerNodeName;
    if (name === PlannerNodeName.ExerciseSet) {
      setNode = node;
      const parent = node.parent;
      const siblings = parent?.getChildren(PlannerNodeName.ExerciseSet) ?? [];
      const setIndex = siblings.findIndex((s) => s.from === node!.from);
      levels.unshift({
        label: `Set group${siblings.length > 1 ? ` ${setIndex + 1}` : ""}`,
        nodeName: name,
        start: node.from,
        end: node.to,
      });
    } else if (name === PlannerNodeName.ExerciseExpression) {
      exerciseNode = node;
      const exerciseName = node
        .getChild(PlannerNodeName.ExerciseVariations)
        ?.getChild(PlannerNodeName.ExerciseVariation)
        ?.getChild(PlannerNodeName.ExerciseName);
      levels.unshift({
        label: exerciseName != null ? nodeText(text, exerciseName).trim() : "Exercise",
        nodeName: name,
        start: node.from,
        end: endOfExerciseLine(text, node),
      });
    } else if (name === PlannerNodeName.ExerciseProperty) {
      const propertyName = node.getChild(PlannerNodeName.ExercisePropertyName);
      if (propertyName != null) {
        const label = nodeText(text, propertyName);
        levels.unshift({
          label: label.charAt(0).toUpperCase() + label.slice(1),
          nodeName: name,
          start: node.from,
          end: node.to,
        });
      }
    } else if (name === PlannerNodeName.FunctionExpression) {
      const functionName = node.getChild(PlannerNodeName.FunctionName);
      if (functionName != null) {
        levels.unshift({
          label: `${nodeText(text, functionName)}()`,
          nodeName: name,
          start: node.from,
          end: node.to,
        });
      }
    } else {
      const label = breadcrumbLabels[name];
      if (label != null && levels[0]?.label !== label) {
        // Week/Day tokens include their trailing linebreak; keep the highlight on the line.
        const end =
          name === PlannerNodeName.Week || name === PlannerNodeName.Day ? endOfExerciseLine(text, node) : node.to;
        levels.unshift({ label, nodeName: name, start: node.from, end });
      }
    }
  }
  if (setNode != null) {
    const setText = nodeText(text, setNode);
    let insertAt = setNode.to;
    while (insertAt > setNode.from && text[insertAt - 1] === " ") {
      insertAt -= 1;
    }
    if (!/@/.test(setText)) {
      pills.push({ label: "+ RPE", insertAt, insertText: " @8" });
    }
    if (!/\d+s/.test(setText)) {
      pills.push({ label: "+ Rest timer", insertAt, insertText: " 60s" });
    }
  }
  if (exerciseNode != null) {
    const properties = exercisePropertyNames(text, exerciseNode);
    const lineEnd = endOfExerciseLine(text, exerciseNode);
    if (!properties.includes("warmup")) {
      pills.push({ label: "+ Warmup", insertAt: lineEnd, insertText: " / warmup: 2x5 45%" });
    }
    if (!properties.includes("progress")) {
      pills.push({ label: "+ Progress", insertAt: lineEnd, insertText: " / progress: lp(5lb)" });
    }
  }
  return { breadcrumb: levels.map((level) => level.label), levels, pills };
}

export interface IFocusToken {
  start: number;
  end: number;
  isNumeric: boolean;
}

// Word-level tokens that a ‹ › press hops between, opaque leaf tokens included so nothing
// gets silently skipped. Whole numeric terminals (Weight/Percentage/Timer) come first in the
// checks because they'd otherwise be missed — their digits are not separate Int nodes.
const numericFocusNames = new Set<string>([
  PlannerNodeName.Weight,
  PlannerNodeName.Percentage,
  PlannerNodeName.Timer,
  PlannerNodeName.Int,
  PlannerNodeName.Float,
]);

const plainFocusNames = new Set<string>([
  PlannerNodeName.ExerciseName,
  PlannerNodeName.ExercisePropertyName,
  PlannerNodeName.FunctionName,
  PlannerNodeName.SetTimer,
  PlannerNodeName.None,
  PlannerNodeName.Auto,
  PlannerNodeName.AskWeight,
  PlannerNodeName.Liftoscript,
  PlannerNodeName.ReuseSection,
]);

export function LiftoEditorBrain_focusTokens(text: string): IFocusToken[] {
  const tree = parser.parse(text);
  const tokens: IFocusToken[] = [];
  tree.iterate({
    enter: (node) => {
      if (node.to <= node.from) {
        return true;
      }
      if (numericFocusNames.has(node.name)) {
        tokens.push({ start: node.from, end: node.to, isNumeric: true });
        return false;
      }
      if (plainFocusNames.has(node.name)) {
        tokens.push({ start: node.from, end: node.to, isNumeric: false });
        return false;
      }
      return true;
    },
  });
  return tokens;
}
