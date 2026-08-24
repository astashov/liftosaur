import { SyntaxNode } from "@lezer/common";
import { PlannerNodeName } from "../../pages/planner/plannerExerciseStyles";
import { ITextEdit } from "./liftoEditorBrain";
import { LiftoEditorStateVars_sanitizeName } from "./liftoEditorStateVars";
import type { ITextInputModalData } from "../../navigation/ModalStateContext";

// What the user can DO at each syntax node: the pill registry (label + category + static
// templates) and the per-node builders that decide which pills apply and where they splice.
// Pure syntax-tree analysis — no React, no settings, no editor handles. The brain's
// contextAt attaches these to breadcrumb levels; surfaces color chips by category.

export type ILiftoEditorPillCategory = "weight" | "timer" | "logic" | "sets" | "progress" | "neutral";

// A value a set group carries, named the way an action that reaches every set in the program
// spelling the same value would name it.
export type ILiftoEditorAcrossField = "reps" | "weight" | "rpe" | "timer";

// start === end is a plain insert; start < end replaces that range (token transformations
// like "Make rep range" or progression type switches). Pills with an `action` are not text
// edits — the hosting surface intercepts them (exercise picker, rename prompt) and uses
// start/end as the target range, text as the current content.
export interface ILiftoEditorPill {
  label: string;
  // Pills wear the syntax color of what they insert, so the chip previews the code (design).
  category: ILiftoEditorPillCategory;
  start: number;
  end: number;
  text: string;
  // Additional disjoint spans applied together with the primary edit, in original-text
  // coordinates ("Make current" inserts a marker here and removes one elsewhere).
  extraEdits?: ITextEdit[];
  // Which token a rename action edits — they sanitize the typed value differently.
  renameKind?: "label" | "stateVar";
  action?:
    | "changeExercise"
    | "rename"
    | "editReuse"
    | "reuseSets"
    | "reuseProgressScript"
    | "reuseUpdateScript"
    | "editStateVars"
    | "editAcrossProgram";
  // For editStateVars: everything the sheet needs that only the text knows.
  stateVars?: ILiftoEditorStateVarsTarget;
  // For editAcrossProgram: which of the set's values the action is about.
  acrossField?: ILiftoEditorAcrossField;
  // For reuse* actions: how the picked `...Target[w:d]` lands in this pill's range —
  // "{target}" gets substituted (" / {target}" appends a section, "{ {target} }" swaps a
  // script body, bare "{target}" swaps just the reuse target).
  reuseTemplate?: string;
}

export interface ILiftoEditorStateVarEntry {
  name: string;
  // The value as the text spells it ("5lb", "80%", "-2.5"); the sheet converts it.
  value: string;
  userPrompted: boolean;
}

// The state-var picture the text paints, which is the one the sheet has to believe: the
// evaluation behind it can be a few keystrokes old.
export interface ILiftoEditorStateVarsTarget {
  entries: ILiftoEditorStateVarEntry[];
  // The argument list holds something that isn't a `name: value` pair. Rewriting the list
  // would drop it, so the sheet reads it out but refuses to save.
  hasUnparsed: boolean;
  // A body spelled out in the text, or the exercise a reused body names. Both properties
  // matter: progress declares the state, and update's script can use it too.
  progressScript?: string;
  progressReuse?: string;
  updateScript?: string;
  updateReuse?: string;
}

// What the reuse picker hands back: the sets variant carries week/day when the target is
// ambiguous (absent from the current week, present on several days, or the same exercise).
export interface ILiftoEditorReuseSelection {
  fullName: string;
  week?: number;
  day?: number;
}

interface IPillDef {
  label: string;
  category: ILiftoEditorPillCategory;
  // Static insert text. Pills whose text depends on context omit it and pass text at
  // build time. Settings-dependent defaults (100lb vs kg) will land here as functions.
  template?: string;
}

export const LiftoEditorActions_pillDefs = {
  addWeight: { label: "Add weight", category: "weight", template: " 100lb" },
  addRpe: { label: "Add RPE", category: "weight", template: " @8" },
  addSetTimer: { label: "Add set timer", category: "timer", template: " 30s|60s" },
  addRestTimer: { label: "Add rest timer", category: "timer", template: " 60s" },
  splitTimer: { label: "Split set/rest timer", category: "timer" },
  backToRestTimer: { label: "Back to rest timer", category: "timer" },
  addAuto: { label: "Add auto", category: "logic", template: " auto" },
  addStateVar: { label: "Add state var", category: "logic" },
  require2Successes: { label: "Require 2 successes", category: "logic", template: ", 2, 0" },
  addDeload: { label: "Add deload on failure", category: "logic" },
  makeWeight: { label: "Make weight", category: "weight" },
  makeNumber: { label: "Make number", category: "weight" },
  addSetGroup: { label: "Add another set group", category: "sets", template: ", 3x8" },
  addSetVariation: { label: "Add set variation", category: "sets", template: " / 3x8" },
  addSets: { label: "Add sets", category: "sets", template: " / 3x8" },
  makeRepRange: { label: "Make rep range", category: "sets" },
  makeFixedReps: { label: "Make fixed reps", category: "sets" },
  addWarmupSetGroup: { label: "Add another warmup set group", category: "sets", template: ", 1x5 50%" },
  addWarmupWeight: { label: "Add weight", category: "weight", template: " 50%" },
  addWarmups: { label: "Add warmups", category: "sets" },
  removeWarmups: { label: "Remove warmups", category: "sets" },
  overrideSets: { label: "Override sets", category: "sets", template: " / 3x8" },
  addProgress: { label: "Add progress", category: "progress", template: " / progress: lp(5lb)" },
  addUpdate: { label: "Add update", category: "progress", template: " / update: custom() {~ ~}" },
  addSetLabel: { label: "Add set label", category: "neutral", template: " (myo)" },
  addGlobals: { label: "Add globals", category: "neutral", template: " / 100lb" },
  addUsedNone: { label: "Add used: none", category: "neutral", template: " / used: none" },
  addLabel: { label: "Add label", category: "neutral", template: "label: " },
  addIdTags: { label: "Add id: tags", category: "neutral", template: " / id: tags(1)" },
  reuse: { label: "Reuse…", category: "neutral", template: " / ...Squat" },
  reuseScript: { label: "Reuse script from…", category: "neutral", template: " { ...Squat }" },
  fromWeekDay: { label: "From specific week/day…", category: "neutral", template: "[1:1]" },
  repeat: { label: "Repeat…", category: "neutral", template: "[1-4]" },
  forcedOrder: { label: "Add forced order…", category: "neutral", template: "[1]" },
  enableSuperset: { label: "Enable superset", category: "neutral", template: " / superset: A" },
} satisfies Record<string, IPillDef>;

const defs = LiftoEditorActions_pillDefs;

function insertPill(def: IPillDef, at: number, text?: string): ILiftoEditorPill {
  return { label: def.label, category: def.category, start: at, end: at, text: text ?? def.template ?? "" };
}

function replacePill(def: IPillDef, node: SyntaxNode, text: string): ILiftoEditorPill {
  return { label: def.label, category: def.category, start: node.from, end: node.to, text };
}

function renamePill(
  current: string,
  start: number,
  end: number,
  kind: "label" | "stateVar" = "label"
): ILiftoEditorPill {
  return { label: "Rename…", category: "neutral", start, end, text: current, action: "rename", renameKind: kind };
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

export function LiftoEditorActions_endOfExerciseLine(text: string, exercise: SyntaxNode): number {
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

export function LiftoEditorActions_enclosingExercise(node: SyntaxNode): SyntaxNode | null {
  let cur: SyntaxNode | null = node;
  while (cur != null && cur.name !== PlannerNodeName.ExerciseExpression) {
    cur = cur.parent;
  }
  return cur;
}

// The exercise's set variations: sets sections with at least one real set group. Globals
// sections parse as ExerciseSets too but can't be a variation.
export function LiftoEditorActions_setVariationSections(exercise: SyntaxNode): SyntaxNode[] {
  return exercise
    .getChildren(PlannerNodeName.ExerciseSection)
    .map((section) => section.getChild(PlannerNodeName.ExerciseSets))
    .filter(
      (sets): sets is SyntaxNode =>
        sets != null &&
        sets.getChildren(PlannerNodeName.ExerciseSet).some((set) => set.getChild(PlannerNodeName.SetPart) != null)
    );
}

// Both variation kinds (set variations, exercise variations) share the `!` convention:
// the marked sibling is current, the first one when nothing is marked. Making the first
// current just unmarks the marked one; anything else gets marked (plus the old marker
// removed), so the text never carries a redundant `!` on the first sibling.
function makeCurrentPill(
  text: string,
  target: SyntaxNode,
  siblings: SyntaxNode[],
  category: ILiftoEditorPillCategory
): ILiftoEditorPill | undefined {
  const index = siblings.findIndex((s) => s.from === target.from);
  if (siblings.length < 2 || index === -1) {
    return undefined;
  }
  const markedIndex = siblings.findIndex((s) => s.getChild(PlannerNodeName.CurrentVariation) != null);
  if (index === (markedIndex === -1 ? 0 : markedIndex)) {
    return undefined;
  }
  const marker = markedIndex === -1 ? null : siblings[markedIndex].getChild(PlannerNodeName.CurrentVariation);
  let markerRemoval: ITextEdit | undefined;
  if (marker != null) {
    let end = marker.to;
    while (end < text.length && text[end] === " ") {
      end += 1;
    }
    markerRemoval = { start: marker.from, end, text: "" };
  }
  if (index === 0 && markerRemoval != null) {
    return { label: "Make current", category, ...markerRemoval };
  }
  return {
    label: "Make current",
    category,
    start: target.from,
    end: target.from,
    text: "! ",
    extraEdits: markerRemoval != null ? [markerRemoval] : undefined,
  };
}

function setGroupPills(text: string, set: SyntaxNode): ILiftoEditorPill[] {
  const insertAt = trimmedEnd(text, set);
  const pills: ILiftoEditorPill[] = [];
  const hasWeight =
    set.getChild(PlannerNodeName.WeightWithPlus) != null ||
    set.getChild(PlannerNodeName.PercentageWithPlus) != null ||
    set.getChild(PlannerNodeName.AskWeight) != null;
  if (!hasWeight) {
    pills.push(insertPill(defs.addWeight, insertAt));
  }
  if (set.getChild(PlannerNodeName.Rpe) == null) {
    pills.push(insertPill(defs.addRpe, insertAt));
  }
  // A set timer subsumes the rest timer (`30s|60s`), so offer either only while the set
  // has no timer of any kind — mixing `60s` with `30s|60s` is ambiguous.
  const hasAnyTimer = set.getChild(PlannerNodeName.SetTimer) != null || set.getChild(PlannerNodeName.Timer) != null;
  if (!hasAnyTimer) {
    pills.push(insertPill(defs.addSetTimer, insertAt));
    pills.push(insertPill(defs.addRestTimer, insertAt));
  }
  const isSetGroup = set.getChild(PlannerNodeName.SetPart) != null;
  if (isSetGroup) {
    pills.push(insertPill(defs.addSetGroup, insertAt));
  }
  if (set.getChild(PlannerNodeName.Auto) == null) {
    pills.push(insertPill(defs.addAuto, insertAt));
  }
  if (isSetGroup && set.getChild(PlannerNodeName.SetLabel) == null) {
    pills.push(insertPill(defs.addSetLabel, insertAt));
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
  const pills = [insertPill(defs.addSetGroup, at), insertPill(defs.addSetVariation, at)];
  const exercise = LiftoEditorActions_enclosingExercise(sets);
  if (exercise != null) {
    const current = makeCurrentPill(text, sets, LiftoEditorActions_setVariationSections(exercise), "sets");
    if (current != null) {
      pills.unshift(current);
    }
  }
  return pills;
}

function exerciseVariationPills(text: string, variation: SyntaxNode): ILiftoEditorPill[] {
  const pills: ILiftoEditorPill[] = [];
  const siblings = variation.parent?.getChildren(PlannerNodeName.ExerciseVariation) ?? [];
  const current = makeCurrentPill(text, variation, siblings, "neutral");
  if (current != null) {
    pills.push(current);
  }
  const nameNode = variation.getChild(PlannerNodeName.ExerciseName);
  if (nameNode != null) {
    pills.push({
      label: "Change exercise…",
      category: "neutral",
      start: nameNode.from,
      end: nameNode.to,
      text: nodeText(text, nameNode),
      action: "changeExercise",
    });
  }
  return pills;
}

function setPartPills(text: string, setPart: SyntaxNode): ILiftoEditorPill[] {
  const repRange = setPart.getChild(PlannerNodeName.RepRange);
  if (repRange != null) {
    const maxRep = repRange.getChildren(PlannerNodeName.Rep)[1];
    return maxRep != null ? [replacePill(defs.makeFixedReps, repRange, nodeText(text, maxRep))] : [];
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
  return [replacePill(defs.makeRepRange, repNode, `${rep}-${rep + 4}`)];
}

function setLabelPills(text: string, label: SyntaxNode): ILiftoEditorPill[] {
  // Target range is the content between the parens.
  return [renamePill(text.slice(label.from + 1, label.to - 1), label.from + 1, label.to - 1)];
}

// One Repeat node serves both bracket meanings: RepRange entries repeat the exercise
// across weeks, bare Rep entries force the exercise order. Offer whichever is missing,
// spliced inside the existing brackets ("[1-4]" → "[1-4,1]", "[2]" → "[1-4,2]").
function repeatPills(text: string, repeat: SyntaxNode): ILiftoEditorPill[] {
  const hasRepeat = repeat.getChildren(PlannerNodeName.RepRange).length > 0;
  const hasOrder = repeat.getChildren(PlannerNodeName.Rep).length > 0;
  const pills: ILiftoEditorPill[] = [];
  if (!hasOrder) {
    pills.push(insertPill(defs.forcedOrder, repeat.to - 1, ",1"));
  }
  if (!hasRepeat) {
    pills.push(insertPill(defs.repeat, repeat.from + 1, "1-4,"));
  }
  return pills;
}

function supersetPills(text: string, superset: SyntaxNode): ILiftoEditorPill[] {
  const name = superset.getChild(PlannerNodeName.ExerciseName);
  if (name == null) {
    return [];
  }
  const end = trimmedEnd(text, name);
  return [renamePill(text.slice(name.from, end), name.from, end)];
}

function restTimerPills(text: string, timer: SyntaxNode): ILiftoEditorPill[] {
  return [replacePill(defs.splitTimer, timer, `30s|${nodeText(text, timer)}`)];
}

function setTimerPills(text: string, timer: SyntaxNode): ILiftoEditorPill[] {
  const rest = nodeText(text, timer).split("|")[1];
  return [replacePill(defs.backToRestTimer, timer, rest != null && rest !== "?" ? rest : "60s")];
}

function warmupSetsPills(text: string, warmupSets: SyntaxNode): ILiftoEditorPill[] {
  return [
    insertPill(defs.addWarmupSetGroup, trimmedEnd(text, warmupSets)),
    {
      label: defs.removeWarmups.label,
      category: defs.removeWarmups.category,
      start: warmupSets.from,
      end: trimmedEnd(text, warmupSets),
      text: "none",
    },
  ];
}

// A warmup group without a weight evaluates to a warmup set with no load at all, so this is
// the one thing a half-written group always needs. It lands as a percentage — the usual way
// to write a warmup — and the keypad's unit switch turns it into an absolute load.
function warmupSetGroupPills(text: string, warmupSet: SyntaxNode): ILiftoEditorPill[] {
  const hasWeight =
    warmupSet.getChild(PlannerNodeName.Weight) != null || warmupSet.getChild(PlannerNodeName.Percentage) != null;
  if (hasWeight) {
    return [];
  }
  return [insertPill(defs.addWarmupWeight, trimmedEnd(text, warmupSet))];
}

// Warmup groups deliberately aren't breadcrumb levels, so their actions ride on the "Warmup
// sets" rail — which makes it the one rail whose contents depend on where the caret is.
export function LiftoEditorActions_warmupSetsPillsAt(
  text: string,
  warmupSets: SyntaxNode,
  index: number
): ILiftoEditorPill[] {
  const group = warmupSets
    .getChildren(PlannerNodeName.WarmupExerciseSet)
    .find((set) => index >= set.from && index <= set.to);
  return [...(group != null ? warmupSetGroupPills(text, group) : []), ...warmupSetsPills(text, warmupSets)];
}

const progressionDefaults: Record<string, string> = {
  lp: "lp(5lb)",
  dp: "dp(5lb, 8, 12)",
  sum: "sum(25, 5lb)",
  custom: "custom() {~ ~}",
  none: "none",
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
    pills.push(insertPill(defs.require2Successes, last.to));
  }
  if (args.length < 4) {
    const padding = [", 1", ", 0"].slice(args.length - 1).join("");
    pills.push(insertPill(defs.addDeload, last.to, `${padding}, 5lb, 3, 0`));
  }
  return pills;
}

function enclosingPropertyName(text: string, node: SyntaxNode): string | undefined {
  for (let cur: SyntaxNode | null = node.parent; cur != null; cur = cur.parent) {
    if (cur.name === PlannerNodeName.ExerciseProperty) {
      const nameNode = cur.getChild(PlannerNodeName.ExercisePropertyName);
      return nameNode != null ? nodeText(text, nameNode) : undefined;
    }
  }
  return undefined;
}

// The grammar skips spaces and tabs, so `custom (x: 1)` is the same call as `custom(x: 1)`.
function skipSpace(text: string, index: number): number {
  let i = index;
  while (i < text.length && (text[i] === " " || text[i] === "\t")) {
    i += 1;
  }
  return i;
}

// The argument list's span, parens included — an empty list still has to come back as
// `custom()`, so they're part of the range rather than something the sheet re-emits. The
// parens aren't nodes of their own, so they're found between the surrounding ones: after
// the name, and after the last argument but before the body.
function argListRange(text: string, fn: SyntaxNode, nameNode: SyntaxNode): { start: number; end: number } | undefined {
  const open = skipSpace(text, nameNode.to);
  if (text[open] !== "(") {
    return { start: nameNode.to, end: nameNode.to };
  }
  const args = fn.getChildren(PlannerNodeName.FunctionArgument);
  const body = fn.getChild(PlannerNodeName.Liftoscript) ?? fn.getChild(PlannerNodeName.ReuseLiftoscript);
  const limit = body != null ? body.from : fn.to;
  const close = text.indexOf(")", args.length > 0 ? args[args.length - 1].to : open + 1);
  // An unclosed list — the match, if any, belongs to something else entirely.
  return close === -1 || close >= limit ? undefined : { start: open, end: close + 1 };
}

function stateVarEntries(
  text: string,
  fn: SyntaxNode,
  range: { start: number; end: number }
): { entries: ILiftoEditorStateVarEntry[]; hasUnparsed: boolean } {
  const entries: ILiftoEditorStateVarEntry[] = [];
  const args = fn.getChildren(PlannerNodeName.FunctionArgument);
  let hasUnparsed = false;
  for (const arg of args) {
    const keyValue = arg.getChild(PlannerNodeName.KeyValue);
    const keyword = keyValue?.getChild(PlannerNodeName.Keyword);
    const value =
      keyValue?.getChild(PlannerNodeName.Number) ??
      keyValue?.getChild(PlannerNodeName.Weight) ??
      keyValue?.getChild(PlannerNodeName.Percentage);
    // `broken` and `bad: nope` both parse as a KeyValue with no value node.
    if (keyValue == null || keyword == null || value == null) {
      hasUnparsed = true;
      continue;
    }
    entries.push({
      name: nodeText(text, keyword),
      value: nodeText(text, value),
      userPrompted: keyValue.getChild(PlannerNodeName.Plus) != null,
    });
  }
  // Anything between the parens that no argument covers would be dropped by a rewrite —
  // `custom(x: 1: 2)` parses one argument and leaves `: 2` stranded.
  if (range.end > range.start) {
    let stray = "";
    let at = range.start + 1;
    for (const arg of args) {
      stray += text.slice(at, arg.from);
      at = arg.to;
    }
    stray += text.slice(at, range.end - 1);
    hasUnparsed = hasUnparsed || stray.replace(/,/g, "").trim() !== "";
  }
  return { entries, hasUnparsed };
}

// A property's body as the text spells it: the script itself, or the exercise a reused body
// names.
function propertyScript(
  text: string,
  exercise: SyntaxNode | null,
  property: string
): { script?: string; reuse?: string } {
  const fn = exercise != null ? propertyFunction(text, exercise, property) : undefined;
  const own = fn?.getChild(PlannerNodeName.Liftoscript);
  if (own != null) {
    return { script: nodeText(text, own) };
  }
  const reuse = fn
    ?.getChild(PlannerNodeName.ReuseLiftoscript)
    ?.getChild(PlannerNodeName.ReuseSection)
    ?.getChild(PlannerNodeName.ExerciseName);
  return { reuse: reuse != null ? nodeText(text, reuse).trim() : undefined };
}

function propertyFunction(text: string, exercise: SyntaxNode, property: string): SyntaxNode | undefined {
  for (const section of exercise.getChildren(PlannerNodeName.ExerciseSection)) {
    const node = section.getChild(PlannerNodeName.ExerciseProperty);
    const nameNode = node?.getChild(PlannerNodeName.ExercisePropertyName);
    if (node != null && nameNode != null && nodeText(text, nameNode) === property) {
      return node.getChild(PlannerNodeName.FunctionExpression) ?? undefined;
    }
  }
  return undefined;
}

export function LiftoEditorActions_stateVarsPill(text: string, fn: SyntaxNode): ILiftoEditorPill | undefined {
  const nameNode = fn.getChild(PlannerNodeName.FunctionName);
  if (nameNode == null || nodeText(text, nameNode) !== "custom" || enclosingPropertyName(text, fn) === "update") {
    return undefined;
  }
  const range = argListRange(text, fn, nameNode);
  if (range == null) {
    return undefined;
  }
  const exercise = LiftoEditorActions_enclosingExercise(fn);
  const progress = propertyScript(text, exercise, "progress");
  const update = propertyScript(text, exercise, "update");
  return {
    label: "State vars…",
    category: "logic",
    action: "editStateVars",
    start: range.start,
    end: range.end,
    text: range.end > range.start ? text.slice(range.start + 1, range.end - 1) : "",
    stateVars: {
      ...stateVarEntries(text, fn, range),
      progressScript: progress.script,
      progressReuse: progress.reuse,
      updateScript: update.script,
      updateReuse: update.reuse,
    },
  };
}

// State vars live in custom()'s argument list; lp()/sum()/dp() have fixed signatures.
// Only progress custom() declares them — update custom() reads the same exercise's state,
// so offering "Add state var" there would splice an invalid declaration.
function customFnPills(text: string, fn: SyntaxNode): ILiftoEditorPill[] {
  const nameNode = fn.getChild(PlannerNodeName.FunctionName);
  if (nameNode == null) {
    return [];
  }
  const pills: ILiftoEditorPill[] = [];
  const args = fn.getChildren(PlannerNodeName.FunctionArgument);
  const stateVars = LiftoEditorActions_stateVarsPill(text, fn);
  if (stateVars != null) {
    pills.push(stateVars);
  }
  if (enclosingPropertyName(text, fn) !== "update") {
    if (args.length > 0) {
      pills.push(insertPill(defs.addStateVar, args[args.length - 1].to, ", myvar: 0"));
    } else if (text[nameNode.to] === "(") {
      pills.push(insertPill(defs.addStateVar, nameNode.to + 1, "myvar: 0"));
    } else {
      pills.push(insertPill(defs.addStateVar, nameNode.to, "(myvar: 0)"));
    }
  }
  const body = fn.getChild(PlannerNodeName.Liftoscript) ?? fn.getChild(PlannerNodeName.ReuseLiftoscript);
  const action = enclosingPropertyName(text, fn) === "update" ? "reuseUpdateScript" : "reuseProgressScript";
  if (body == null) {
    pills.push({ ...insertPill(defs.reuseScript, trimmedEnd(text, fn)), action, reuseTemplate: " { {target} }" });
  } else {
    // With a body the pill swaps it for the reuse form (`{~ ... ~}` → `{ ...Name }`).
    const bodyEnd = trimmedEnd(text, body);
    pills.push({
      label: defs.reuseScript.label,
      category: defs.reuseScript.category,
      start: body.from,
      end: bodyEnd,
      text: text.slice(body.from, bodyEnd),
      action,
      reuseTemplate: "{ {target} }",
    });
  }
  return pills;
}

// Both surfaces prompt for a rename the same way — and a state variable is neither a label
// nor capped at a label's 8 characters.
export function LiftoEditorActions_renamePrompt(current: string, kind: "label" | "stateVar"): ITextInputModalData {
  const isStateVar = kind === "stateVar";
  return {
    title: isStateVar ? "Rename state variable" : "Rename label",
    inputLabel: isStateVar ? "Name" : "Label",
    placeholder: current,
    submitLabel: "Rename",
    dataCyPrefix: isStateVar ? "rename-state-var" : "rename-label",
    maxLength: isStateVar ? undefined : 8,
  };
}

export function LiftoEditorActions_reuseTargetText(selection: ILiftoEditorReuseSelection): string {
  const weekDay =
    selection.week != null
      ? `[${selection.week}:${selection.day ?? 1}]`
      : selection.day != null
        ? `[${selection.day}]`
        : "";
  return `...${selection.fullName}${weekDay}`;
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

function progressSwitchPills(value: SyntaxNode, current: string): ILiftoEditorPill[] {
  return Object.keys(progressionDefaults)
    .filter((name) => name !== current)
    .map((name) => ({
      label: `Switch to ${name}`,
      category: "progress" as const,
      start: value.from,
      end: value.to,
      text: progressionDefaults[name],
    }));
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
    return none != null ? [replacePill(defs.addWarmups, none, "2x5 45%, 1x3 60%")] : [];
  }
  if (name === "progress") {
    const fn = property.getChild(PlannerNodeName.FunctionExpression);
    if (fn != null) {
      const fnNameNode = fn.getChild(PlannerNodeName.FunctionName);
      const fnName = fnNameNode != null ? nodeText(text, fnNameNode) : "";
      return [...fnPills(text, fn), ...progressSwitchPills(fn, fnName)];
    }
    const none = property.getChild(PlannerNodeName.None);
    return none != null ? progressSwitchPills(none, "none") : [];
  }
  if (name === "update") {
    const fn = property.getChild(PlannerNodeName.FunctionExpression);
    return fn != null ? fnPills(text, fn) : [];
  }
  return [];
}

function reuseSectionPills(text: string, reuse: SyntaxNode): ILiftoEditorPill[] {
  const pills: ILiftoEditorPill[] = [];
  // The same ReuseSection node also lives inside `custom() { ...X }` — there the picker
  // must offer that property's scripts, and week/day makes no sense (the grammar allows
  // WeekDay only on the sets-reuse form).
  const isScriptReuse = reuse.parent?.name === PlannerNodeName.ReuseLiftoscript;
  const weekDay = reuse.parent?.getChild(PlannerNodeName.WeekDay);
  const changeEnd = weekDay != null ? weekDay.to : trimmedEnd(text, reuse);
  pills.push({
    label: "Change…",
    category: "neutral",
    start: reuse.from,
    end: changeEnd,
    // Fallback when no picker host is wired: replacing with itself is a no-op.
    text: text.slice(reuse.from, changeEnd),
    action: isScriptReuse
      ? enclosingPropertyName(text, reuse) === "update"
        ? "reuseUpdateScript"
        : "reuseProgressScript"
      : "reuseSets",
    reuseTemplate: "{target}",
  });
  const targetName = reuse.getChild(PlannerNodeName.ExerciseName);
  if (targetName != null) {
    pills.push({
      label: "Edit reused exercise…",
      category: "neutral",
      start: targetName.from,
      end: targetName.to,
      text: nodeText(text, targetName).trim(),
      action: "editReuse",
    });
  }
  if (!isScriptReuse && weekDay == null) {
    pills.push(insertPill(defs.fromWeekDay, trimmedEnd(text, reuse)));
  }
  const exercise = LiftoEditorActions_enclosingExercise(reuse);
  if (!isScriptReuse && exercise != null) {
    const hasOwnSets = exercise
      .getChildren(PlannerNodeName.ExerciseSection)
      .some((section) => section.getChild(PlannerNodeName.ExerciseSets) != null);
    if (!hasOwnSets) {
      pills.push(insertPill(defs.overrideSets, LiftoEditorActions_endOfExerciseLine(text, exercise)));
    }
  }
  return pills;
}

function exercisePills(text: string, exercise: SyntaxNode): ILiftoEditorPill[] {
  const pills: ILiftoEditorPill[] = [];
  const properties = exercisePropertyNames(text, exercise);
  const lineEnd = LiftoEditorActions_endOfExerciseLine(text, exercise);
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
      category: "neutral",
      start: nameNode.from,
      end: nameNode.to,
      text: nodeText(text, nameNode),
      action: "changeExercise",
    });
  }
  if (!properties.includes("warmup")) {
    pills.push(insertPill(defs.addWarmups, lineEnd, " / warmup: 2x5 45%, 1x3 60%"));
  }
  if (!hasSetGroups) {
    pills.push(insertPill(defs.addSets, lineEnd));
  }
  if (hasSetGroups && !hasGlobals) {
    pills.push(insertPill(defs.addGlobals, lineEnd));
  }
  const setGroupSections = LiftoEditorActions_setVariationSections(exercise);
  const lastSetGroupSection = setGroupSections[setGroupSections.length - 1];
  if (lastSetGroupSection != null) {
    pills.push(insertPill(defs.addSetVariation, trimmedEnd(text, lastSetGroupSection)));
  }
  if (!properties.includes("used")) {
    pills.push(insertPill(defs.addUsedNone, lineEnd));
  }
  if (!properties.includes("progress")) {
    pills.push(insertPill(defs.addProgress, lineEnd));
  }
  if (!properties.includes("update")) {
    pills.push(insertPill(defs.addUpdate, lineEnd));
  }
  if (!hasSuperset) {
    pills.push(insertPill(defs.enableSuperset, lineEnd));
  }
  if (!hasReuse) {
    pills.push({ ...insertPill(defs.reuse, lineEnd), action: "reuseSets", reuseTemplate: " / {target}" });
  }
  // A label is just a `word:` prefix inside the exercise name token.
  if (nameNode != null && !nodeText(text, nameNode).includes(":")) {
    pills.push(insertPill(defs.addLabel, nameNode.from));
  }
  if (exercise.getChild(PlannerNodeName.Repeat) == null && variations != null) {
    pills.push(insertPill(defs.repeat, variations.to));
    pills.push(insertPill(defs.forcedOrder, variations.to));
  }
  if (!properties.includes("id")) {
    pills.push(insertPill(defs.addIdTags, lineEnd));
  }
  return pills;
}

function keyValuePills(text: string, node: SyntaxNode): ILiftoEditorPill[] {
  const pills: ILiftoEditorPill[] = [];
  // Focusing one state var is the likeliest moment to want the whole list — the sheet is
  // where the reused ones and their defaults are visible at all.
  let fn: SyntaxNode | null = node.parent;
  while (fn != null && fn.name !== PlannerNodeName.FunctionExpression) {
    fn = fn.parent;
  }
  const stateVars = fn != null ? LiftoEditorActions_stateVarsPill(text, fn) : undefined;
  if (stateVars != null) {
    pills.push(stateVars);
  }
  const keyword = node.getChild(PlannerNodeName.Keyword);
  if (keyword != null) {
    pills.push(renamePill(nodeText(text, keyword), keyword.from, keyword.to, "stateVar"));
  }
  const numberNode = node.getChild(PlannerNodeName.Number);
  if (numberNode != null) {
    pills.push(replacePill(defs.makeWeight, numberNode, `${nodeText(text, numberNode)}lb`));
  }
  const weightNode = node.getChild(PlannerNodeName.Weight);
  if (weightNode != null) {
    const numericPart = nodeText(text, weightNode).match(/^[+-]?\d+(?:\.\d+)?/);
    if (numericPart != null) {
      pills.push(replacePill(defs.makeNumber, weightNode, numericPart[0]));
    }
  }
  return pills;
}

// The `label:` prefix of `label: Name` (one ExerciseName token in the grammar); undefined
// when the name carries no label.
export function LiftoEditorActions_labelRenamePill(text: string, nameNode: SyntaxNode): ILiftoEditorPill | undefined {
  const nameText = nodeText(text, nameNode);
  const colonIdx = nameText.indexOf(":");
  if (colonIdx === -1) {
    return undefined;
  }
  return renamePill(nameText.slice(0, colonIdx), nameNode.from, nameNode.from + colonIdx);
}

// Fulfillment transforms for action pills: the controller collects the modal result from
// the host and turns it into a text edit here.

// A `label:` prefix survives the swap unless the picked exercise carries its own label.
export function LiftoEditorActions_swapExerciseEdit(target: ITextEdit, pickedName: string): ITextEdit {
  const existingLabel = target.text.includes(":") ? target.text.split(":")[0].trim() : undefined;
  const text = existingLabel != null && !pickedName.includes(":") ? `${existingLabel}: ${pickedName}` : pickedName;
  return { start: target.start, end: target.end, text };
}

// Strip characters that would break out of the token: for a label, the ones that end it
// (parens close a set label, ":" ends an exercise label, "/" starts a new section); for a
// state variable, everything the two grammars' keyword rules don't allow. Undefined when
// nothing usable is left.
export function LiftoEditorActions_renameEdit(
  target: ITextEdit,
  newLabel: string,
  kind: "label" | "stateVar" = "label"
): ITextEdit | undefined {
  const sanitized =
    kind === "stateVar" ? LiftoEditorStateVars_sanitizeName(newLabel.trim()) : newLabel.trim().replace(/[():/]/g, "");
  if (sanitized === "") {
    return undefined;
  }
  return { start: target.start, end: target.end, text: sanitized };
}

const pillBuilders: Partial<Record<PlannerNodeName, (text: string, node: SyntaxNode) => ILiftoEditorPill[]>> = {
  [PlannerNodeName.ExerciseSet]: setGroupPills,
  [PlannerNodeName.ExerciseVariation]: exerciseVariationPills,
  [PlannerNodeName.ExerciseExpression]: exercisePills,
  [PlannerNodeName.ExerciseProperty]: propertyPills,
  [PlannerNodeName.FunctionExpression]: fnPills,
  [PlannerNodeName.KeyValue]: keyValuePills,
  [PlannerNodeName.ExerciseSets]: setsPills,
  [PlannerNodeName.SetPart]: setPartPills,
  [PlannerNodeName.Timer]: restTimerPills,
  [PlannerNodeName.SetTimer]: setTimerPills,
  [PlannerNodeName.WarmupExerciseSets]: warmupSetsPills,
  [PlannerNodeName.ReuseSection]: reuseSectionPills,
  [PlannerNodeName.SetLabel]: setLabelPills,
  [PlannerNodeName.Superset]: supersetPills,
  [PlannerNodeName.Repeat]: repeatPills,
  // The only ExerciseName level is the synthesized Label one (brain builds its rename pill
  // directly); registering it here makes Label a pill boundary, so focusing a label shows
  // just Rename instead of falling through to the whole exercise's rail.
  [PlannerNodeName.ExerciseName]: (text, node) => {
    const pill = LiftoEditorActions_labelRenamePill(text, node);
    return pill != null ? [pill] : [];
  },
};

const acrossFields: Partial<Record<PlannerNodeName, ILiftoEditorAcrossField>> = {
  [PlannerNodeName.SetPart]: "reps",
  [PlannerNodeName.Weight]: "weight",
  [PlannerNodeName.Percentage]: "weight",
  [PlannerNodeName.Rpe]: "rpe",
  [PlannerNodeName.Timer]: "timer",
  [PlannerNodeName.SetTimer]: "timer",
};

// The set group a value token belongs to, or null if it isn't one of a set group's values.
// Only the grammar's own wrappers are stepped through (`WeightWithPlus { Weight Plus? }`), so
// this answers null for the same node names appearing anywhere else — a warmup group's weight,
// `lp(5kg)`'s argument, a `weight: 100kg` state var — without any of them being listed.
function enclosingSetGroup(node: SyntaxNode): SyntaxNode | null {
  const parent = node.parent;
  if (parent == null) {
    return null;
  }
  if (parent.name === PlannerNodeName.ExerciseSet) {
    return parent;
  }
  const isWrapper =
    parent.name === PlannerNodeName.WeightWithPlus || parent.name === PlannerNodeName.PercentageWithPlus;
  return isWrapper && parent.parent?.name === PlannerNodeName.ExerciseSet ? parent.parent : null;
}

// Which of a set's values this node is, for actions that reach every set in the program that
// shares it. Only within a set group: a warmup weight or a progression's argument is not
// something the whole program can be retuned by.
export function LiftoEditorActions_acrossField(node: SyntaxNode): ILiftoEditorAcrossField | undefined {
  const field = acrossFields[node.name as PlannerNodeName];
  return field != null && enclosingSetGroup(node) != null ? field : undefined;
}

// Everything the rail needs to know about a node, from one place — what it offers, and whether
// the walk outward stops here. Answering the two separately is how they drift: `ownsRail` used
// to be "is this node name a pill builder", which can't tell a set group's weight from a warmup
// group's, because they are the same node name.
export interface ILiftoEditorRail {
  pills: ILiftoEditorPill[];
  // The rail's ancestor fall-through stops here even when the pill list is empty, so e.g.
  // `used: none` shows "No actions" instead of the whole exercise's pills.
  ownsRail: boolean;
  // Set-group values only: which of the set's values this node is, so a host can act on the
  // focused field without parsing the document a second time.
  acrossField?: ILiftoEditorAcrossField;
}

// The label doesn't name the field: the rail is a row of chips on a phone, and the user just
// tapped the value it is about. Only the chip's colour distinguishes them, matching the token.
const acrossPillDefs: Record<ILiftoEditorAcrossField, IPillDef> = {
  reps: { label: "Change everywhere", category: "sets" },
  weight: { label: "Change everywhere", category: "weight" },
  rpe: { label: "Change everywhere", category: "weight" },
  timer: { label: "Change everywhere", category: "timer" },
};

export function LiftoEditorActions_railForNode(text: string, node: SyntaxNode): ILiftoEditorRail {
  const own = pillBuilders[node.name as PlannerNodeName]?.(text, node) ?? [];
  // Set-group children with their own rails (sets×reps, timers, set label, and the values that
  // own one only to carry a field-specific action) would otherwise hide the group's additive
  // actions: the walk stops at the first owner, so focusing "3x8" showed only "Make rep range"
  // while focusing the weight fell through to the full group rail.
  const setGroup = node.name !== PlannerNodeName.ExerciseSet ? enclosingSetGroup(node) : null;
  const groupPills = setGroup != null ? setGroupPills(text, setGroup) : [];
  const acrossField = LiftoEditorActions_acrossField(node);
  if (acrossField == null) {
    return { pills: [...own, ...groupPills], ownsRail: node.name in pillBuilders };
  }
  // First on the rail, ahead of the token's own actions: retuning a value across the program is
  // the reason to focus one on a phone at all, and hunting for it behind "Make rep range" on
  // every set of a multiweek program is the thing this feature exists to stop. Not a text edit —
  // the host rewrites the program and hands the line back — so the range covers the focused
  // token only so that the pill has one.
  const def = acrossPillDefs[acrossField];
  const acrossPill: ILiftoEditorPill = {
    label: def.label,
    category: def.category,
    start: node.from,
    end: node.to,
    text: nodeText(text, node),
    action: "editAcrossProgram",
    acrossField,
  };
  return { pills: [acrossPill, ...own, ...groupPills], ownsRail: true, acrossField };
}
