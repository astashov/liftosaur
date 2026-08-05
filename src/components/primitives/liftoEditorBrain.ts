import { SyntaxNode } from "@lezer/common";
import { parser } from "../../pages/planner/plannerExerciseParser";
import { parser as liftoscriptParser } from "../../liftoscript";
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

// Mirrors liftoscriptLanguage.ts styleTags resolved through plannerEditor.ts's HighlightStyle
// (Number is a subtag of literal, Unit of keyword), except StateVariable is styled as a whole —
// web's nested Keyword rule splits "state.foo" into differently-colored pieces, which looks
// accidental rather than intentional.
function liftoscriptNodeStyles(): Partial<Record<string, INodeStyle>> {
  const syntax = Tailwind_semantic().syntax;
  return {
    StateVariable: { color: syntax.variable },
    Keyword: { color: syntax.keyword },
    Unit: { color: syntax.keyword },
    Number: { color: syntax.literal },
    LineComment: { color: syntax.comment },
  };
}

// The Liftoscript planner token includes the {~ ~} delimiters; the liftoscript grammar
// @skips them, so parsing the raw slice works and the delimiters stay unstyled.
function pushLiftoscriptRanges(text: string, from: number, to: number, ranges: ILiftoEditorStyledRange[]): void {
  const styles = liftoscriptNodeStyles();
  const tree = liftoscriptParser.parse(text.slice(from, to));
  tree.iterate({
    enter: (node) => {
      const style = styles[node.name];
      if (style != null && node.to > node.from) {
        ranges.push({ start: from + node.from, end: from + node.to, ...style });
        return false;
      }
      return true;
    },
  });
}

export function LiftoEditorBrain_computeStyledRanges(text: string): ILiftoEditorStyledRange[] {
  const styles = nodeStyles();
  const ranges: ILiftoEditorStyledRange[] = [];
  const tree = parser.parse(text);
  tree.iterate({
    enter: (node) => {
      if (node.name === PlannerNodeName.Liftoscript) {
        pushLiftoscriptRanges(text, node.from, node.to, ranges);
        return false;
      }
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
  // Weights in function args (lp/dp/sum increments) step by a plain unit; weights in set
  // sections (incl. globals and warmups) are real lifted weights, so the controller steps
  // them through Weight_increment/decrement to respect equipment settings.
  inFunctionArgs: boolean;
}

// "Whole" = the node's entire text (digits + suffix, e.g. "100kg", "45%", "60s") is one
// steppable token — as opposed to bare Int/Float leaves, which become "number" tokens.
const wholeNumericTokenKinds: Partial<Record<PlannerNodeName, INumericToken["kind"]>> = {
  [PlannerNodeName.Weight]: "weight",
  [PlannerNodeName.Percentage]: "percentage",
  [PlannerNodeName.Timer]: "timer",
};

// Numeric spans inside a {~ ~} script body, found by nest-parsing like the highlighting
// does. They all count as "function args" for stepping: script weights are increments
// (weights += 5lb), not lifted loads, so they step by a plain unit.
function liftoscriptNumericSpans(
  text: string,
  from: number,
  to: number
): { start: number; end: number; kind: INumericToken["kind"] }[] {
  const spans: { start: number; end: number; kind: INumericToken["kind"] }[] = [];
  const tree = liftoscriptParser.parse(text.slice(from, to));
  tree.iterate({
    enter: (node) => {
      const kind =
        node.name === "WeightExpression"
          ? ("weight" as const)
          : node.name === "Percentage"
            ? ("percentage" as const)
            : node.name === "NumberExpression"
              ? ("number" as const)
              : undefined;
      if (kind != null && node.to > node.from) {
        spans.push({ start: from + node.from, end: from + node.to, kind });
        return false;
      }
      return true;
    },
  });
  return spans;
}

function isInFunctionArgs(node: SyntaxNode): boolean {
  for (let cur: SyntaxNode | null = node.parent; cur != null; cur = cur.parent) {
    if (cur.name === PlannerNodeName.FunctionExpression) {
      return true;
    }
  }
  return false;
}

export function LiftoEditorBrain_numericTokens(text: string): INumericToken[] {
  const tokens: INumericToken[] = [];
  const tree = parser.parse(text);
  tree.iterate({
    enter: (node) => {
      if (node.name === PlannerNodeName.Liftoscript) {
        for (const span of liftoscriptNumericSpans(text, node.from, node.to)) {
          tokens.push({ ...span, text: text.slice(span.start, span.end), inFunctionArgs: true });
        }
        return false;
      }
      const whole = wholeNumericTokenKinds[node.name as PlannerNodeName];
      if (whole != null) {
        tokens.push({
          start: node.from,
          end: node.to,
          text: text.slice(node.from, node.to),
          kind: whole,
          inFunctionArgs: isInFunctionArgs(node.node),
        });
        return false;
      }
      if (node.name === PlannerNodeName.Int || node.name === PlannerNodeName.Float) {
        tokens.push({
          start: node.from,
          end: node.to,
          text: text.slice(node.from, node.to),
          kind: "number",
          inFunctionArgs: isInFunctionArgs(node.node),
        });
        return false;
      }
      return true;
    },
  });
  return tokens;
}

// Set-section weights never reach this table — the controller steps them through
// Weight_increment/decrement so equipment settings (plates, fixed weights) apply.
// The weight entry here only serves function-argument weights like lp() increments.
const stepByKind: Record<INumericToken["kind"], (suffix: string) => number> = {
  weight: () => 1,
  percentage: () => 1,
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
  [PlannerNodeName.SetLabel]: "Set label",
  [PlannerNodeName.Week]: "Week",
  [PlannerNodeName.Day]: "Day",
};

// start === end is a plain insert; start < end replaces that range (token transformations
// like "Make rep range" or progression type switches). Pills with an `action` are not text
// edits — the hosting surface intercepts them (exercise picker, rename prompt) and uses
// start/end as the target range, text as the current content.
export interface ILiftoEditorPill {
  label: string;
  start: number;
  end: number;
  text: string;
  action?: "changeExercise" | "rename" | "editReuse";
}

function insertPill(label: string, at: number, text: string): ILiftoEditorPill {
  return { label, start: at, end: at, text };
}

function replacePill(label: string, node: SyntaxNode, text: string): ILiftoEditorPill {
  return { label, start: node.from, end: node.to, text };
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
    pills.push(insertPill("Add weight", insertAt, " 100lb"));
  }
  if (set.getChild(PlannerNodeName.Rpe) == null) {
    pills.push(insertPill("Add RPE", insertAt, " @8"));
  }
  // A set timer subsumes the rest timer (`30s|60s`), so offer either only while the set
  // has no timer of any kind — mixing `60s` with `30s|60s` is ambiguous.
  const hasAnyTimer = set.getChild(PlannerNodeName.SetTimer) != null || set.getChild(PlannerNodeName.Timer) != null;
  if (!hasAnyTimer) {
    pills.push(insertPill("Add set timer", insertAt, " 30s|60s"));
    pills.push(insertPill("Add rest timer", insertAt, " 60s"));
  }
  const isSetGroup = set.getChild(PlannerNodeName.SetPart) != null;
  if (isSetGroup) {
    pills.push(insertPill("Add another set group", insertAt, ", 3x8"));
  }
  if (set.getChild(PlannerNodeName.Auto) == null) {
    pills.push(insertPill("Add auto", insertAt, " auto"));
  }
  if (isSetGroup && set.getChild(PlannerNodeName.SetLabel) == null) {
    pills.push(insertPill("Add set label", insertAt, " (myo)"));
  }
  return pills;
}

function setsPills(text: string, sets: SyntaxNode): ILiftoEditorPill[] {
  const hasSetGroup = sets
    .getChildren(PlannerNodeName.ExerciseSet)
    .some((set) => set.getChild(PlannerNodeName.SetPart) != null);
  if (!hasSetGroup) {
    return [];
  }
  const at = trimmedEnd(text, sets);
  return [insertPill("Add another set group", at, ", 3x8"), insertPill("Add set variation", at, " / 3x8")];
}

function setPartPills(text: string, setPart: SyntaxNode): ILiftoEditorPill[] {
  const repRange = setPart.getChild(PlannerNodeName.RepRange);
  if (repRange != null) {
    const maxRep = repRange.getChildren(PlannerNodeName.Rep)[1];
    return maxRep != null ? [replacePill("Make fixed reps", repRange, nodeText(text, maxRep))] : [];
  }
  const reps = setPart.getChildren(PlannerNodeName.Rep);
  const repNode = reps[reps.length - 1];
  if (reps.length < 2 || repNode == null) {
    return [];
  }
  const rep = parseInt(nodeText(text, repNode), 10);
  if (isNaN(rep)) {
    return [];
  }
  return [replacePill("Make rep range", repNode, `${rep}-${rep + 4}`)];
}

function setLabelPills(text: string, label: SyntaxNode): ILiftoEditorPill[] {
  // Target range is the content between the parens.
  return [
    {
      label: "Rename…",
      start: label.from + 1,
      end: label.to - 1,
      text: text.slice(label.from + 1, label.to - 1),
      action: "rename",
    },
  ];
}

function restTimerPills(text: string, timer: SyntaxNode): ILiftoEditorPill[] {
  return [replacePill("Split set/rest timer", timer, `30s|${nodeText(text, timer)}`)];
}

function setTimerPills(text: string, timer: SyntaxNode): ILiftoEditorPill[] {
  const rest = nodeText(text, timer).split("|")[1];
  return [replacePill("Back to rest timer", timer, rest != null && rest !== "?" ? rest : "60s")];
}

function warmupSetsPills(text: string, warmupSets: SyntaxNode): ILiftoEditorPill[] {
  return [insertPill("Add another warmup set group", trimmedEnd(text, warmupSets), ", 1x5 50%")];
}

const progressionDefaults: Record<string, string> = {
  lp: "lp(5lb)",
  dp: "dp(5lb, 8, 12)",
  sum: "sum(25, 5lb)",
  custom: "custom() {~ ~}",
};

// lp(increment, successes, successCounter, decrement, failures, failureCounter).
function lpPills(text: string, fn: SyntaxNode): ILiftoEditorPill[] {
  const args = fn.getChildren(PlannerNodeName.FunctionArgument);
  const last = args[args.length - 1];
  if (last == null) {
    return [];
  }
  const pills: ILiftoEditorPill[] = [];
  if (args.length === 1) {
    pills.push(insertPill("Require 2 successes", last.to, ", 2, 0"));
  }
  if (args.length < 4) {
    const padding = [", 1", ", 0"].slice(args.length - 1).join("");
    pills.push(insertPill("Add deload on failure", last.to, `${padding}, 5lb, 3, 0`));
  }
  return pills;
}

// State vars live in custom()'s argument list; lp()/sum()/dp() have fixed signatures.
function customFnPills(text: string, fn: SyntaxNode): ILiftoEditorPill[] {
  const nameNode = fn.getChild(PlannerNodeName.FunctionName);
  if (nameNode == null) {
    return [];
  }
  const pills: ILiftoEditorPill[] = [];
  const args = fn.getChildren(PlannerNodeName.FunctionArgument);
  if (args.length > 0) {
    pills.push(insertPill("Add state var", args[args.length - 1].to, ", myvar: 0"));
  } else if (text[nameNode.to] === "(") {
    pills.push(insertPill("Add state var", nameNode.to + 1, "myvar: 0"));
  } else {
    pills.push(insertPill("Add state var", nameNode.to, "(myvar: 0)"));
  }
  const hasBody =
    fn.getChild(PlannerNodeName.Liftoscript) != null || fn.getChild(PlannerNodeName.ReuseLiftoscript) != null;
  if (!hasBody) {
    pills.push(insertPill("Reuse script from…", trimmedEnd(text, fn), " { ...Squat }"));
  }
  return pills;
}

function fnPills(text: string, fn: SyntaxNode): ILiftoEditorPill[] {
  const nameNode = fn.getChild(PlannerNodeName.FunctionName);
  const name = nameNode != null ? nodeText(text, nameNode) : "";
  if (name === "custom") {
    return customFnPills(text, fn);
  }
  if (name === "lp") {
    return lpPills(text, fn);
  }
  return [];
}

function progressSwitchPills(text: string, fn: SyntaxNode): ILiftoEditorPill[] {
  const nameNode = fn.getChild(PlannerNodeName.FunctionName);
  const current = nameNode != null ? nodeText(text, nameNode) : "";
  return Object.keys(progressionDefaults)
    .filter((name) => name !== current)
    .map((name) => replacePill(`Switch to ${name}`, fn, progressionDefaults[name]));
}

function propertyPills(text: string, property: SyntaxNode): ILiftoEditorPill[] {
  const nameNode = property.getChild(PlannerNodeName.ExercisePropertyName);
  const name = nameNode != null ? nodeText(text, nameNode) : "";
  if (name === "warmup") {
    const warmupSets = property.getChild(PlannerNodeName.WarmupExerciseSets);
    if (warmupSets != null) {
      return warmupSetsPills(text, warmupSets);
    }
    const none = property.getChild(PlannerNodeName.None);
    return none != null ? [replacePill("Add warmups", none, "2x5 45%, 1x3 60%")] : [];
  }
  if (name === "progress") {
    const fn = property.getChild(PlannerNodeName.FunctionExpression);
    return fn != null ? [...fnPills(text, fn), ...progressSwitchPills(text, fn)] : [];
  }
  if (name === "update") {
    const fn = property.getChild(PlannerNodeName.FunctionExpression);
    return fn != null ? fnPills(text, fn) : [];
  }
  return [];
}

function reuseSectionPills(text: string, reuse: SyntaxNode): ILiftoEditorPill[] {
  const pills: ILiftoEditorPill[] = [];
  const targetName = reuse.getChild(PlannerNodeName.ExerciseName);
  if (targetName != null) {
    pills.push({
      label: "Edit reused exercise…",
      start: targetName.from,
      end: targetName.to,
      text: nodeText(text, targetName).trim(),
      action: "editReuse",
    });
  }
  if (reuse.parent?.getChild(PlannerNodeName.WeekDay) == null) {
    pills.push(insertPill("From specific week/day…", trimmedEnd(text, reuse), "[2:1]"));
  }
  let exercise: SyntaxNode | null = reuse.parent;
  while (exercise != null && exercise.name !== PlannerNodeName.ExerciseExpression) {
    exercise = exercise.parent;
  }
  if (exercise != null) {
    const hasOwnSets = exercise
      .getChildren(PlannerNodeName.ExerciseSection)
      .some((section) => section.getChild(PlannerNodeName.ExerciseSets) != null);
    if (!hasOwnSets) {
      pills.push(insertPill("Override sets", endOfExerciseLine(text, exercise), " / 3x8"));
    }
  }
  return pills;
}

function exercisePills(text: string, exercise: SyntaxNode): ILiftoEditorPill[] {
  const pills: ILiftoEditorPill[] = [];
  const properties = exercisePropertyNames(text, exercise);
  const lineEnd = endOfExerciseLine(text, exercise);
  const sections = exercise.getChildren(PlannerNodeName.ExerciseSection);
  const setsSections = sections
    .map((section) => section.getChild(PlannerNodeName.ExerciseSets))
    .filter((sets): sets is SyntaxNode => sets != null);
  const setNodes = setsSections.flatMap((sets) => sets.getChildren(PlannerNodeName.ExerciseSet));
  const hasSetGroups = setNodes.some((set) => set.getChild(PlannerNodeName.SetPart) != null);
  const hasGlobals = setNodes.some((set) => set.getChild(PlannerNodeName.SetPart) == null);
  const hasReuse = sections.some((section) => section.getChild(PlannerNodeName.ReuseSectionWithWeekDay) != null);
  const hasSuperset = sections.some((section) => section.getChild(PlannerNodeName.Superset) != null);
  const variations = exercise.getChild(PlannerNodeName.ExerciseVariations);
  const nameNode = variations?.getChild(PlannerNodeName.ExerciseVariation)?.getChild(PlannerNodeName.ExerciseName);
  if (nameNode != null) {
    pills.push({
      label: "Change exercise…",
      start: nameNode.from,
      end: nameNode.to,
      text: nodeText(text, nameNode),
      action: "changeExercise",
    });
  }
  if (!properties.includes("warmup")) {
    pills.push(insertPill("Add warmups", lineEnd, " / warmup: 2x5 45%, 1x3 60%"));
  }
  if (!properties.includes("used")) {
    pills.push(insertPill("Add used: none", lineEnd, " / used: none"));
  }
  // A label is just a `word:` prefix inside the exercise name token.
  if (nameNode != null && !nodeText(text, nameNode).includes(":")) {
    pills.push(insertPill("Add label", nameNode.from, "label: "));
  }
  if (!hasSetGroups) {
    pills.push(insertPill("Add sets", lineEnd, " / 3x8"));
  }
  const setGroupSections = setsSections.filter((sets) =>
    sets.getChildren(PlannerNodeName.ExerciseSet).some((set) => set.getChild(PlannerNodeName.SetPart) != null)
  );
  const lastSetGroupSection = setGroupSections[setGroupSections.length - 1];
  if (lastSetGroupSection != null) {
    pills.push(insertPill("Add set variation", trimmedEnd(text, lastSetGroupSection), " / 3x8"));
  }
  if (hasSetGroups && !hasGlobals) {
    pills.push(insertPill("Add globals", lineEnd, " / 100lb"));
  }
  if (!properties.includes("id")) {
    pills.push(insertPill("Add id: tags", lineEnd, " / id: tags(1)"));
  }
  if (!hasReuse) {
    pills.push(insertPill("Reuse…", lineEnd, " / ...Squat"));
  }
  if (exercise.getChild(PlannerNodeName.Repeat) == null && variations != null) {
    pills.push(insertPill("Repeat…", variations.to, "[1-4]"));
    pills.push(insertPill("Add forced order…", variations.to, "[1]"));
  }
  if (!hasSuperset) {
    pills.push(insertPill("Enable superset", lineEnd, " / superset: Bench Press"));
  }
  if (!properties.includes("progress")) {
    pills.push(insertPill("Add progress", lineEnd, " / progress: lp(5lb)"));
  }
  if (!properties.includes("update")) {
    pills.push(insertPill("Add update", lineEnd, " / update: custom() {~ ~}"));
  }
  return pills;
}

function leafPills(text: string, node: SyntaxNode, name: PlannerNodeName): ILiftoEditorPill[] {
  switch (name) {
    case PlannerNodeName.ExerciseSets:
      return setsPills(text, node);
    case PlannerNodeName.SetPart:
      return setPartPills(text, node);
    case PlannerNodeName.Timer:
      return restTimerPills(text, node);
    case PlannerNodeName.SetTimer:
      return setTimerPills(text, node);
    case PlannerNodeName.WarmupExerciseSets:
      return warmupSetsPills(text, node);
    case PlannerNodeName.ReuseSection:
      return reuseSectionPills(text, node);
    case PlannerNodeName.SetLabel:
      return setLabelPills(text, node);
    default:
      return [];
  }
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
    } else if (name === PlannerNodeName.KeyValue) {
      const keyword = node.getChild(PlannerNodeName.Keyword);
      if (keyword != null) {
        levels.unshift({
          label: nodeText(text, keyword),
          nodeName: name,
          start: node.from,
          end: node.to,
          pills: [
            {
              label: "Rename…",
              start: keyword.from,
              end: keyword.to,
              text: nodeText(text, keyword),
              action: "rename",
            },
          ],
        });
      }
    } else if (name === PlannerNodeName.ExerciseName && node.parent?.name === PlannerNodeName.ExerciseVariation) {
      // The grammar lumps `label: Name` into one ExerciseName token (":" is a name char),
      // so the Label level is synthesized: it exists only when the tap lands inside the
      // label part. Level extent includes ": " so ✕-removal eats the whole prefix; the
      // rename pill targets just the label word.
      const nameText = nodeText(text, node);
      const colonIdx = nameText.indexOf(":");
      if (colonIdx !== -1 && index <= node.from + colonIdx) {
        const labelEnd = node.from + colonIdx;
        let afterColon = labelEnd + 1;
        while (text[afterColon] === " ") {
          afterColon += 1;
        }
        levels.unshift({
          label: "Label",
          nodeName: name,
          start: node.from,
          end: afterColon,
          pills: [
            {
              label: "Rename…",
              start: node.from,
              end: labelEnd,
              text: nameText.slice(0, colonIdx),
              action: "rename",
            },
          ],
        });
      }
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
          pills: fnPills(text, node),
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
          pills: leafPills(text, node, name),
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
  PlannerNodeName.SetLabel,
]);

export function LiftoEditorBrain_focusTokens(text: string): IFocusToken[] {
  const tree = parser.parse(text);
  const tokens: IFocusToken[] = [];
  tree.iterate({
    enter: (node) => {
      if (node.to <= node.from) {
        return true;
      }
      if (node.name === PlannerNodeName.Liftoscript) {
        for (const span of liftoscriptNumericSpans(text, node.from, node.to)) {
          tokens.push({ start: span.start, end: span.end, isNumeric: true });
        }
        return false;
      }
      if (numericFocusNames.has(node.name)) {
        tokens.push({ start: node.from, end: node.to, isNumeric: true });
        return false;
      }
      // State var names in custom(): the raw Keyword token inside KeyValue, so tapping
      // `myvar` in `custom(myvar: 0)` focuses it (the value stays a numeric keypad stop).
      if (node.name === PlannerNodeName.Keyword && node.node.parent?.name === PlannerNodeName.KeyValue) {
        tokens.push({ start: node.from, end: node.to, isNumeric: false });
        return false;
      }
      if (plainFocusNames.has(node.name)) {
        // `label: Name` is one ExerciseName token; split it so the label and the name are
        // separate focus stops (matching the synthesized Label breadcrumb level).
        if (
          node.name === PlannerNodeName.ExerciseName &&
          node.node.parent?.name === PlannerNodeName.ExerciseVariation
        ) {
          const colonIdx = text.slice(node.from, node.to).indexOf(":");
          if (colonIdx !== -1) {
            tokens.push({ start: node.from, end: node.from + colonIdx, isNumeric: false });
            let rest = node.from + colonIdx + 1;
            while (text[rest] === " ") {
              rest += 1;
            }
            if (rest < node.to) {
              tokens.push({ start: rest, end: node.to, isNumeric: false });
            }
            return false;
          }
        }
        tokens.push({ start: node.from, end: node.to, isNumeric: false });
        return false;
      }
      return true;
    },
  });
  return tokens;
}
