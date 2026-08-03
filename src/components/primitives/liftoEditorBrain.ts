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
  pills: ILiftoEditorPill[];
}

export interface ILiftoEditorContext {
  // Outer -> inner; breadcrumb is levels' labels. Each level carries its node's extent for
  // level highlighting, its node name for sibling walking, and the add-actions valid there.
  breadcrumb: string[];
  levels: ILiftoEditorLevel[];
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

function trimmedEnd(text: string, node: SyntaxNode): number {
  let end = node.to;
  while (end > node.from && text[end - 1] === " ") {
    end -= 1;
  }
  return end;
}

function setGroupPills(text: string, set: SyntaxNode): ILiftoEditorPill[] {
  const insertAt = trimmedEnd(text, set);
  const pills: ILiftoEditorPill[] = [];
  const hasWeight =
    set.getChild(PlannerNodeName.WeightWithPlus) != null ||
    set.getChild(PlannerNodeName.PercentageWithPlus) != null ||
    set.getChild(PlannerNodeName.AskWeight) != null;
  if (!hasWeight) {
    pills.push({ label: "Add weight", insertAt, insertText: " 100lb" });
  }
  if (set.getChild(PlannerNodeName.Rpe) == null) {
    pills.push({ label: "Add RPE", insertAt, insertText: " @8" });
  }
  // A set timer subsumes the rest timer (`30s|60s`), so offer either only while the set
  // has no timer of any kind — mixing `60s` with `30s|60s` is ambiguous.
  const hasAnyTimer =
    set.getChild(PlannerNodeName.SetTimer) != null || set.getChild(PlannerNodeName.Timer) != null;
  if (!hasAnyTimer) {
    pills.push({ label: "Add set timer", insertAt, insertText: " 30s|60s" });
    pills.push({ label: "Add rest timer", insertAt, insertText: " 60s" });
  }
  if (set.getChild(PlannerNodeName.SetPart) != null) {
    pills.push({ label: "Add another set group", insertAt, insertText: ", 3x8" });
  }
  if (set.getChild(PlannerNodeName.Auto) == null) {
    pills.push({ label: "Add auto", insertAt, insertText: " auto" });
  }
  return pills;
}

function warmupSetsPills(text: string, warmupSets: SyntaxNode): ILiftoEditorPill[] {
  return [{ label: "Add another warmup set group", insertAt: trimmedEnd(text, warmupSets), insertText: ", 1x5 50%" }];
}

// State vars live in custom()'s argument list; lp()/sum()/etc have fixed signatures.
function customStateVarPills(text: string, fn: SyntaxNode): ILiftoEditorPill[] {
  const nameNode = fn.getChild(PlannerNodeName.FunctionName);
  if (nameNode == null || nodeText(text, nameNode) !== "custom") {
    return [];
  }
  const args = fn.getChildren(PlannerNodeName.FunctionArgument);
  if (args.length > 0) {
    return [{ label: "Add state var", insertAt: args[args.length - 1].to, insertText: ", myvar: 0" }];
  }
  if (text[nameNode.to] === "(") {
    return [{ label: "Add state var", insertAt: nameNode.to + 1, insertText: "myvar: 0" }];
  }
  return [{ label: "Add state var", insertAt: nameNode.to, insertText: "(myvar: 0)" }];
}

function propertyPills(text: string, property: SyntaxNode): ILiftoEditorPill[] {
  const nameNode = property.getChild(PlannerNodeName.ExercisePropertyName);
  const name = nameNode != null ? nodeText(text, nameNode) : "";
  if (name === "warmup") {
    const warmupSets = property.getChild(PlannerNodeName.WarmupExerciseSets);
    return warmupSets != null ? warmupSetsPills(text, warmupSets) : [];
  }
  if (name === "progress" || name === "update") {
    const fn = property.getChild(PlannerNodeName.FunctionExpression);
    return fn != null ? customStateVarPills(text, fn) : [];
  }
  return [];
}

function exercisePills(text: string, exercise: SyntaxNode): ILiftoEditorPill[] {
  const pills: ILiftoEditorPill[] = [];
  const properties = exercisePropertyNames(text, exercise);
  const lineEnd = endOfExerciseLine(text, exercise);
  const sections = exercise.getChildren(PlannerNodeName.ExerciseSection);
  const setNodes = sections.flatMap((section) => {
    const sets = section.getChild(PlannerNodeName.ExerciseSets);
    return sets != null ? sets.getChildren(PlannerNodeName.ExerciseSet) : [];
  });
  const hasSetGroups = setNodes.some((set) => set.getChild(PlannerNodeName.SetPart) != null);
  const hasGlobals = setNodes.some((set) => set.getChild(PlannerNodeName.SetPart) == null);
  const hasReuse = sections.some((section) => section.getChild(PlannerNodeName.ReuseSectionWithWeekDay) != null);
  const hasSuperset = sections.some((section) => section.getChild(PlannerNodeName.Superset) != null);
  const variations = exercise.getChild(PlannerNodeName.ExerciseVariations);
  const nameNode = variations
    ?.getChild(PlannerNodeName.ExerciseVariation)
    ?.getChild(PlannerNodeName.ExerciseName);
  if (!properties.includes("warmup")) {
    pills.push({ label: "Add warmups", insertAt: lineEnd, insertText: " / warmup: 2x5 45%, 1x3 60%" });
  }
  if (!properties.includes("used")) {
    pills.push({ label: "Add used: none", insertAt: lineEnd, insertText: " / used: none" });
  }
  // A label is just a `word:` prefix inside the exercise name token.
  if (nameNode != null && !nodeText(text, nameNode).includes(":")) {
    pills.push({ label: "Add label", insertAt: nameNode.from, insertText: "label: " });
  }
  if (!hasSetGroups) {
    pills.push({ label: "Add sets", insertAt: lineEnd, insertText: " / 3x8" });
  }
  if (hasSetGroups && !hasGlobals) {
    pills.push({ label: "Add globals", insertAt: lineEnd, insertText: " / 100lb" });
  }
  if (!properties.includes("id")) {
    pills.push({ label: "Add id: tags", insertAt: lineEnd, insertText: " / id: tags(1)" });
  }
  if (!hasReuse) {
    pills.push({ label: "Reuse…", insertAt: lineEnd, insertText: " / ...Squat" });
  }
  if (exercise.getChild(PlannerNodeName.Repeat) == null && variations != null) {
    pills.push({ label: "Repeat…", insertAt: variations.to, insertText: "[1-4]" });
    pills.push({ label: "Add forced order…", insertAt: variations.to, insertText: "[1]" });
  }
  if (!hasSuperset) {
    pills.push({ label: "Enable superset", insertAt: lineEnd, insertText: " / superset: Bench Press" });
  }
  if (!properties.includes("progress")) {
    pills.push({ label: "Add progress", insertAt: lineEnd, insertText: " / progress: lp(5lb)" });
  }
  if (!properties.includes("update")) {
    pills.push({ label: "Add update", insertAt: lineEnd, insertText: " / update: custom() {~ ~}" });
  }
  return pills;
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
  for (let node: SyntaxNode | null = inner; node != null; node = node.parent) {
    const name = node.name as PlannerNodeName;
    if (name === PlannerNodeName.ExerciseSet) {
      const isGlobals = node.getChild(PlannerNodeName.SetPart) == null;
      const siblings = node.parent?.getChildren(PlannerNodeName.ExerciseSet) ?? [];
      const setIndex = siblings.findIndex((s) => s.from === node!.from);
      levels.unshift({
        label: isGlobals ? "Globals" : `Set group${siblings.length > 1 ? ` ${setIndex + 1}` : ""}`,
        nodeName: name,
        start: node.from,
        end: node.to,
        pills: setGroupPills(text, node),
      });
    } else if (name === PlannerNodeName.ExerciseExpression) {
      const exerciseName = node
        .getChild(PlannerNodeName.ExerciseVariations)
        ?.getChild(PlannerNodeName.ExerciseVariation)
        ?.getChild(PlannerNodeName.ExerciseName);
      levels.unshift({
        label: exerciseName != null ? nodeText(text, exerciseName).trim() : "Exercise",
        nodeName: name,
        start: node.from,
        end: endOfExerciseLine(text, node),
        pills: exercisePills(text, node),
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
          pills: propertyPills(text, node),
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
          pills: customStateVarPills(text, node),
        });
      }
    } else {
      const label = breadcrumbLabels[name];
      if (label != null && levels[0]?.label !== label) {
        // Week/Day tokens include their trailing linebreak; keep the highlight on the line.
        const end =
          name === PlannerNodeName.Week || name === PlannerNodeName.Day ? endOfExerciseLine(text, node) : node.to;
        levels.unshift({
          label,
          nodeName: name,
          start: node.from,
          end,
          pills: name === PlannerNodeName.WarmupExerciseSets ? warmupSetsPills(text, node) : [],
        });
      }
    }
  }
  return { breadcrumb: levels.map((level) => level.label), levels };
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
