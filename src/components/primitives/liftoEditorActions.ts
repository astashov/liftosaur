import { SyntaxNode } from "@lezer/common";
import { PlannerNodeName } from "../../pages/planner/plannerExerciseStyles";
import { ITextEdit } from "./liftoEditorBrain";

// What the user can DO at each syntax node: the pill registry (label + category + static
// templates) and the per-node builders that decide which pills apply and where they splice.
// Pure syntax-tree analysis — no React, no settings, no editor handles. The brain's
// contextAt attaches these to breadcrumb levels; surfaces color chips by category.

export type ILiftoEditorPillCategory = "weight" | "timer" | "logic" | "sets" | "progress" | "neutral";

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
  action?: "changeExercise" | "rename" | "editReuse";
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
  addWarmups: { label: "Add warmups", category: "sets" },
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
  fromWeekDay: { label: "From specific week/day…", category: "neutral", template: "[2:1]" },
  repeat: { label: "Repeat…", category: "neutral", template: "[1-4]" },
  forcedOrder: { label: "Add forced order…", category: "neutral", template: "[1]" },
  enableSuperset: { label: "Enable superset", category: "neutral", template: " / superset: Bench Press" },
} satisfies Record<string, IPillDef>;

const defs = LiftoEditorActions_pillDefs;

function insertPill(def: IPillDef, at: number, text?: string): ILiftoEditorPill {
  return { label: def.label, category: def.category, start: at, end: at, text: text ?? def.template ?? "" };
}

function replacePill(def: IPillDef, node: SyntaxNode, text: string): ILiftoEditorPill {
  return { label: def.label, category: def.category, start: node.from, end: node.to, text };
}

function renamePill(current: string, start: number, end: number): ILiftoEditorPill {
  return { label: "Rename…", category: "neutral", start, end, text: current, action: "rename" };
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
  return [insertPill(defs.addSetGroup, at), insertPill(defs.addSetVariation, at)];
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

function restTimerPills(text: string, timer: SyntaxNode): ILiftoEditorPill[] {
  return [replacePill(defs.splitTimer, timer, `30s|${nodeText(text, timer)}`)];
}

function setTimerPills(text: string, timer: SyntaxNode): ILiftoEditorPill[] {
  const rest = nodeText(text, timer).split("|")[1];
  return [replacePill(defs.backToRestTimer, timer, rest != null && rest !== "?" ? rest : "60s")];
}

function warmupSetsPills(text: string, warmupSets: SyntaxNode): ILiftoEditorPill[] {
  return [insertPill(defs.addWarmupSetGroup, trimmedEnd(text, warmupSets))];
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
    pills.push(insertPill(defs.require2Successes, last.to));
  }
  if (args.length < 4) {
    const padding = [", 1", ", 0"].slice(args.length - 1).join("");
    pills.push(insertPill(defs.addDeload, last.to, `${padding}, 5lb, 3, 0`));
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
    pills.push(insertPill(defs.addStateVar, args[args.length - 1].to, ", myvar: 0"));
  } else if (text[nameNode.to] === "(") {
    pills.push(insertPill(defs.addStateVar, nameNode.to + 1, "myvar: 0"));
  } else {
    pills.push(insertPill(defs.addStateVar, nameNode.to, "(myvar: 0)"));
  }
  const hasBody =
    fn.getChild(PlannerNodeName.Liftoscript) != null || fn.getChild(PlannerNodeName.ReuseLiftoscript) != null;
  if (!hasBody) {
    pills.push(insertPill(defs.reuseScript, trimmedEnd(text, fn)));
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
    .map((name) => ({
      label: `Switch to ${name}`,
      category: "progress" as const,
      start: fn.from,
      end: fn.to,
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
      category: "neutral",
      start: targetName.from,
      end: targetName.to,
      text: nodeText(text, targetName).trim(),
      action: "editReuse",
    });
  }
  if (reuse.parent?.getChild(PlannerNodeName.WeekDay) == null) {
    pills.push(insertPill(defs.fromWeekDay, trimmedEnd(text, reuse)));
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
  if (!properties.includes("used")) {
    pills.push(insertPill(defs.addUsedNone, lineEnd));
  }
  // A label is just a `word:` prefix inside the exercise name token.
  if (nameNode != null && !nodeText(text, nameNode).includes(":")) {
    pills.push(insertPill(defs.addLabel, nameNode.from));
  }
  if (!hasSetGroups) {
    pills.push(insertPill(defs.addSets, lineEnd));
  }
  const setGroupSections = setsSections.filter((sets) =>
    sets.getChildren(PlannerNodeName.ExerciseSet).some((set) => set.getChild(PlannerNodeName.SetPart) != null)
  );
  const lastSetGroupSection = setGroupSections[setGroupSections.length - 1];
  if (lastSetGroupSection != null) {
    pills.push(insertPill(defs.addSetVariation, trimmedEnd(text, lastSetGroupSection)));
  }
  if (hasSetGroups && !hasGlobals) {
    pills.push(insertPill(defs.addGlobals, lineEnd));
  }
  if (!properties.includes("id")) {
    pills.push(insertPill(defs.addIdTags, lineEnd));
  }
  if (!hasReuse) {
    pills.push(insertPill(defs.reuse, lineEnd));
  }
  if (exercise.getChild(PlannerNodeName.Repeat) == null && variations != null) {
    pills.push(insertPill(defs.repeat, variations.to));
    pills.push(insertPill(defs.forcedOrder, variations.to));
  }
  if (!hasSuperset) {
    pills.push(insertPill(defs.enableSuperset, lineEnd));
  }
  if (!properties.includes("progress")) {
    pills.push(insertPill(defs.addProgress, lineEnd));
  }
  if (!properties.includes("update")) {
    pills.push(insertPill(defs.addUpdate, lineEnd));
  }
  return pills;
}

function keyValuePills(text: string, node: SyntaxNode): ILiftoEditorPill[] {
  const pills: ILiftoEditorPill[] = [];
  const keyword = node.getChild(PlannerNodeName.Keyword);
  if (keyword != null) {
    pills.push(renamePill(nodeText(text, keyword), keyword.from, keyword.to));
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

// Strip characters that would break out of the label token (parens close a set label,
// ":" ends an exercise label, "/" starts a new section); undefined when nothing is left.
export function LiftoEditorActions_renameEdit(target: ITextEdit, newLabel: string): ITextEdit | undefined {
  const sanitized = newLabel.trim().replace(/[():/]/g, "");
  if (sanitized === "") {
    return undefined;
  }
  return { start: target.start, end: target.end, text: sanitized };
}

const pillBuilders: Partial<Record<PlannerNodeName, (text: string, node: SyntaxNode) => ILiftoEditorPill[]>> = {
  [PlannerNodeName.ExerciseSet]: setGroupPills,
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
};

export function LiftoEditorActions_pillsForNode(text: string, node: SyntaxNode): ILiftoEditorPill[] {
  return pillBuilders[node.name as PlannerNodeName]?.(text, node) ?? [];
}

// Levels of these node types own their pill rail: the rail's ancestor fall-through stops
// here even when the pill list is empty, so e.g. `used: none` shows "No actions" instead
// of the whole exercise's pills.
export function LiftoEditorActions_isPillBoundary(nodeName: string): boolean {
  return nodeName in pillBuilders;
}
