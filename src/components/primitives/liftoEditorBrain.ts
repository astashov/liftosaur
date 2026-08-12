import { SyntaxNode, Tree, TreeFragment } from "@lezer/common";
import { parser } from "../../pages/planner/plannerExerciseParser";
import { parser as liftoscriptParser } from "../../liftoscript";
import { PlannerNodeName } from "../../pages/planner/plannerExerciseStyles";
import { IDayData } from "../../types";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import {
  ILiftoEditorPill,
  LiftoEditorActions_endOfExerciseLine,
  LiftoEditorActions_enclosingExercise,
  LiftoEditorActions_labelRenamePill,
  LiftoEditorActions_pillsForNode,
  LiftoEditorActions_setVariationSections,
  LiftoEditorActions_warmupSetsPillsAt,
} from "./liftoEditorActions";

function nodeText(text: string, node: SyntaxNode): string {
  return text.slice(node.from, node.to);
}

// Every gesture re-derives tokens/context/styles from the same text, and each brain
// function used to run its own full parse — a single tap cost 2+ parses, a keystroke 3+.
// One cache instance shared by all of them makes them parse once. It's owned by whoever
// is editing (the session creates one, the editor view borrows it) rather than living in
// the module, so two editors never evict each other's tree and it dies with its owner.
export class LiftoEditorParseCache {
  private lastParse: { text: string; tree: Tree } | undefined;
  // Script bodies are small and repeat across keystrokes (an edit elsewhere leaves them
  // byte-identical), so a keyed memo covers them; the cap only guards against unbounded
  // growth over a very long session.
  private readonly liftoscriptTrees = new Map<string, Tree>();

  // Consecutive versions reparse incrementally: the edited span is recovered by
  // prefix/suffix diff and everything outside it is reused from the previous tree, so
  // typing cost stays proportional to the edited line, not the document.
  public parse(text: string): Tree {
    const previous = this.lastParse;
    if (previous?.text === text) {
      return previous.tree;
    }
    let tree: Tree;
    if (previous == null) {
      tree = parser.parse(text);
    } else {
      const old = previous.text;
      let from = 0;
      const minLength = Math.min(old.length, text.length);
      while (from < minLength && old.charCodeAt(from) === text.charCodeAt(from)) {
        from += 1;
      }
      let toA = old.length;
      let toB = text.length;
      while (toA > from && toB > from && old.charCodeAt(toA - 1) === text.charCodeAt(toB - 1)) {
        toA -= 1;
        toB -= 1;
      }
      const fragments = TreeFragment.applyChanges(TreeFragment.addTree(previous.tree), [
        { fromA: from, toA, fromB: from, toB },
      ]);
      tree = parser.parse(text, fragments);
    }
    this.lastParse = { text, tree };
    return tree;
  }

  public parseLiftoscript(source: string): Tree {
    let tree = this.liftoscriptTrees.get(source);
    if (tree == null) {
      if (this.liftoscriptTrees.size > 500) {
        this.liftoscriptTrees.clear();
      }
      tree = liftoscriptParser.parse(source);
      this.liftoscriptTrees.set(source, tree);
    }
    return tree;
  }
}

export interface ITextEdit {
  start: number;
  end: number;
  text: string;
}

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
function pushLiftoscriptRanges(
  cache: LiftoEditorParseCache,
  text: string,
  from: number,
  to: number,
  ranges: ILiftoEditorStyledRange[]
): void {
  const styles = liftoscriptNodeStyles();
  const tree = cache.parseLiftoscript(text.slice(from, to));
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

export function LiftoEditorBrain_computeStyledRanges(
  cache: LiftoEditorParseCache,
  text: string
): ILiftoEditorStyledRange[] {
  const styles = nodeStyles();
  const ranges: ILiftoEditorStyledRange[] = [];
  const tree = cache.parse(text);
  tree.iterate({
    enter: (node) => {
      if (node.name === PlannerNodeName.Liftoscript) {
        pushLiftoscriptRanges(cache, text, node.from, node.to, ranges);
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

export interface IEditorTokenNumeric {
  kind: "weight" | "percentage" | "timer" | "number";
  // Weights in function args (lp/dp/sum increments) step by a plain unit; weights in set
  // sections (incl. globals and warmups) are real lifted weights, so the controller steps
  // them through Weight_increment/decrement to respect equipment settings.
  inFunctionArgs: boolean;
}

export interface IEditorToken {
  start: number;
  end: number;
  text: string;
  // ‹ › stops on it. False only for numeric tap-targets nested inside a larger stop (the
  // timers inside a `30s|60s` SetTimer, ints inside a ReuseSection) — tapping them opens
  // the keypad, but the walk treats the enclosing token as one stop.
  walkStop: boolean;
  // Present iff tapping the token opens the numeric keypad.
  numeric?: IEditorTokenNumeric;
}

// "Whole" = the node's entire text (digits + suffix, e.g. "100kg", "45%", "60s") is one
// steppable token — as opposed to bare Int/Float leaves, which become "number" tokens.
const wholeNumericTokenKinds: Partial<Record<PlannerNodeName, IEditorTokenNumeric["kind"]>> = {
  [PlannerNodeName.Weight]: "weight",
  [PlannerNodeName.Percentage]: "percentage",
  [PlannerNodeName.Timer]: "timer",
};

// Numeric spans inside a {~ ~} script body, found by nest-parsing like the highlighting
// does. They all count as "function args" for stepping: script weights are increments
// (weights += 5lb), not lifted loads, so they step by a plain unit.
function liftoscriptNumericSpans(
  cache: LiftoEditorParseCache,
  text: string,
  from: number,
  to: number
): { start: number; end: number; kind: IEditorTokenNumeric["kind"] }[] {
  const spans: { start: number; end: number; kind: IEditorTokenNumeric["kind"] }[] = [];
  const tree = cache.parseLiftoscript(text.slice(from, to));
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

// Set-section weights never reach this table — the controller steps them through
// Weight_increment/decrement so equipment settings (plates, fixed weights) apply.
// The weight entry here only serves function-argument weights like lp() increments.
const stepByKind: Record<IEditorTokenNumeric["kind"], (suffix: string) => number> = {
  weight: () => 1,
  percentage: () => 1,
  timer: () => 15,
  number: () => 1,
};

export function LiftoEditorBrain_stepToken(token: IEditorToken, direction: 1 | -1): string | undefined {
  if (token.numeric == null) {
    return undefined;
  }
  const match = token.text.match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
  if (match == null) {
    return undefined;
  }
  const [, sign, num, suffix] = match;
  const value = parseFloat(`${sign}${num}`);
  const step = stepByKind[token.numeric.kind](suffix);
  const next = Math.round((value + step * direction) * 100) / 100;
  return `${next}${suffix}`;
}

export interface ILiftoEditorHandle {
  setSelection: (start: number, end: number) => void;
  replaceRange: (start: number, end: number, text: string) => void;
  getText: () => string;
  // Asks the native side for the range's vertical extent; answered via onCaretRect.
  requestCaretRect: (start: number, end: number) => void;
}

const breadcrumbLabels: Partial<Record<PlannerNodeName, string>> = {
  [PlannerNodeName.SetPart]: "Sets×Reps",
  [PlannerNodeName.Weight]: "Weight",
  [PlannerNodeName.WeightWithPlus]: "Weight",
  [PlannerNodeName.Percentage]: "Percentage",
  [PlannerNodeName.PercentageWithPlus]: "Percentage",
  [PlannerNodeName.Rpe]: "RPE",
  [PlannerNodeName.Timer]: "Rest timer",
  [PlannerNodeName.SetTimer]: "Set timer",
  [PlannerNodeName.Auto]: "Auto",
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

export interface ILiftoEditorLevel {
  label: string;
  nodeName: string;
  start: number;
  end: number;
  pills: ILiftoEditorPill[];
  // Exercise levels only: every variation, i.e. the planner's fullName. The label is just
  // the first variation — enough for a breadcrumb, but not enough to identify the exercise.
  fullName?: string;
}

export interface ILiftoEditorContext {
  // Outer -> inner; breadcrumb is levels' labels. Each level carries its node's extent for
  // level highlighting, its node name for sibling walking, and the add-actions valid there.
  breadcrumb: string[];
  levels: ILiftoEditorLevel[];
}

// Week/Day headers are siblings of the exercises rather than their parents, so which day an
// offset belongs to is "how many headers came before it" rather than an ancestor walk. Read
// off the raw lines: a line can only start with "#" as a header (comments start with "//"),
// and a whole-program document is big enough that this is worth not parsing for.
export function LiftoEditorBrain_dayDataAt(text: string, index: number): Required<IDayData> {
  let weeks = 0;
  let daysInWeek = 0;
  let days = 0;
  for (const line of text.slice(0, index).split("\n")) {
    if (line.startsWith("##")) {
      daysInWeek += 1;
      days += 1;
    } else if (line.startsWith("#")) {
      weeks += 1;
      daysInWeek = 0;
    }
  }
  return { week: Math.max(1, weeks), dayInWeek: Math.max(1, daysInWeek), day: Math.max(1, days) };
}

// Flattens possibly-overlapping styled ranges into sorted non-overlapping segments with
// merged properties (later input ranges win per property). The native sides assume exactly
// this. Sweep-line rather than filtering all ranges per segment — the naive version was
// O(ranges²) and dominated every keystroke on multi-hundred-line programs.
export function LiftoEditorBrain_flattenRanges(ranges: ILiftoEditorStyledRange[]): ILiftoEditorStyledRange[] {
  const boundaries = Array.from(new Set(ranges.flatMap((r) => [r.start, r.end]))).sort((a, b) => a - b);
  const byStart = ranges
    .map((range, inputIndex) => ({ range, inputIndex }))
    .sort((a, b) => a.range.start - b.range.start);
  const result: ILiftoEditorStyledRange[] = [];
  let nextToEnter = 0;
  let active: { range: ILiftoEditorStyledRange; inputIndex: number }[] = [];
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    while (nextToEnter < byStart.length && byStart[nextToEnter].range.start <= start) {
      active.push(byStart[nextToEnter]);
      nextToEnter += 1;
    }
    active = active.filter((a) => a.range.end >= end);
    if (active.length === 0) {
      continue;
    }
    const covering = [...active].sort((a, b) => a.inputIndex - b.inputIndex);
    const merged = covering.reduce<ILiftoEditorStyledRange>((acc, a) => ({ ...acc, ...a.range, start, end }), {
      start,
      end,
    });
    result.push(merged);
  }
  return result;
}

// Mirrors the native stores' edit shifting (ExternalRangesStore.applyEdit on iOS and its
// Kotlin twin) so the JS-side mirror of pushed ranges stays byte-identical with what the
// native side holds between pushes. Any rule change here must land on both native sides too.
export function LiftoEditorBrain_shiftStyledRanges(
  ranges: ILiftoEditorStyledRange[],
  editStart: number,
  editEnd: number,
  insertedLength: number
): ILiftoEditorStyledRange[] {
  const delta = insertedLength - (editEnd - editStart);
  if (delta === 0) {
    return ranges;
  }
  const result: ILiftoEditorStyledRange[] = [];
  for (const range of ranges) {
    let start = range.start;
    let end = range.end;
    if (editEnd <= start) {
      start += delta;
      end += delta;
    } else if (editStart < end) {
      end = Math.max(start, end + delta);
    }
    if (end > start) {
      result.push(start === range.start && end === range.end ? range : { ...range, start, end });
    }
  }
  return result;
}

export interface IStyledRangesPatch {
  start: number;
  end: number;
  ranges: ILiftoEditorStyledRange[];
}

function styledRangesEqual(a: ILiftoEditorStyledRange, b: ILiftoEditorStyledRange): boolean {
  return (
    a.start === b.start &&
    a.end === b.end &&
    a.color === b.color &&
    a.backgroundColor === b.backgroundColor &&
    a.bold === b.bold &&
    a.italic === b.italic
  );
}

// The delta protocol's JS half: previous = the mirror of what the native store holds (last
// push shifted through subsequent edits), next = freshly computed flattened ranges. Returns
// the window to replace, "unchanged" when no push is needed, or "full" when the diff spans
// most of the document and a full resend is cheaper. Both arrays must be flattened (sorted,
// non-overlapping) — the window math relies on it.
//
// editedSpan (next-text coordinates) forces ranges intersecting a just-applied programmatic
// edit into the window even when they compare equal: Android applies a replace as separate
// delete+insert shifts, whose composition can drop or shorten a range that the one-shot
// shift (this mirror, and iOS) preserves — replacing the edit's neighborhood wholesale makes
// that divergence unobservable.
export function LiftoEditorBrain_diffStyledRanges(
  previous: ILiftoEditorStyledRange[],
  next: ILiftoEditorStyledRange[],
  editedSpan?: { start: number; end: number }
): IStyledRangesPatch | "unchanged" | "full" {
  let prefix = 0;
  const maxPrefix = Math.min(previous.length, next.length);
  while (prefix < maxPrefix && styledRangesEqual(previous[prefix], next[prefix])) {
    prefix += 1;
  }
  let suffix = 0;
  const maxSuffix = maxPrefix - prefix;
  while (
    suffix < maxSuffix &&
    styledRangesEqual(previous[previous.length - 1 - suffix], next[next.length - 1 - suffix])
  ) {
    suffix += 1;
  }
  let windowStart: number | undefined;
  let windowEnd: number | undefined;
  const extend = (rangeStart: number): void => {
    windowStart = windowStart == null ? rangeStart : Math.min(windowStart, rangeStart);
    windowEnd = windowEnd == null ? rangeStart + 1 : Math.max(windowEnd, rangeStart + 1);
  };
  for (let i = prefix; i < previous.length - suffix; i += 1) {
    extend(previous[i].start);
  }
  for (let i = prefix; i < next.length - suffix; i += 1) {
    extend(next[i].start);
  }
  if (editedSpan != null && editedSpan.end > editedSpan.start) {
    for (const ranges of [previous, next]) {
      for (const range of ranges) {
        if (range.start < editedSpan.end && range.end > editedSpan.start) {
          extend(range.start);
        }
      }
    }
  }
  if (windowStart == null || windowEnd == null) {
    return "unchanged";
  }
  const finalStart = windowStart;
  const finalEnd = windowEnd;
  const inside = next.filter((r) => r.start >= finalStart && r.start < finalEnd);
  if (inside.length > next.length / 2) {
    return "full";
  }
  return { start: windowStart, end: windowEnd, ranges: inside };
}

// A set group whose Sets×Reps is removed stops reading as a set group ("warmup: 40%", or a
// weight that now looks like globals), so removal must target the whole group. Warmup
// groups aren't breadcrumb levels, so the extent is re-derived from the tree; isOnlyGroup
// lets the caller cascade further when the group list would end up empty.
export function LiftoEditorBrain_enclosingSetGroup(
  cache: LiftoEditorParseCache,
  text: string,
  level: { nodeName: string; start: number }
): { nodeName: string; start: number; end: number; isOnlyGroup: boolean } | undefined {
  const groupName =
    level.nodeName === PlannerNodeName.SetPart
      ? PlannerNodeName.ExerciseSet
      : level.nodeName === PlannerNodeName.WarmupSetPart
        ? PlannerNodeName.WarmupExerciseSet
        : undefined;
  if (groupName == null) {
    return undefined;
  }
  let node: SyntaxNode | null = cache.parse(text).resolveInner(level.start + 1, -1);
  while (node != null && node.name !== groupName) {
    node = node.parent;
  }
  if (node == null) {
    return undefined;
  }
  const siblings = node.parent?.getChildren(groupName) ?? [];
  return { nodeName: node.name, start: node.from, end: node.to, isOnlyGroup: siblings.length <= 1 };
}

// The `...X` of a script reuse (`custom() { ...X }`) can't just be deleted — `{ }` without
// tildes doesn't parse — so removal must swap the whole body back to an empty script.
export function LiftoEditorBrain_scriptReuseBody(
  cache: LiftoEditorParseCache,
  text: string,
  level: { nodeName: string; start: number }
): { start: number; end: number } | undefined {
  if (level.nodeName !== PlannerNodeName.ReuseSection) {
    return undefined;
  }
  let node: SyntaxNode | null = cache.parse(text).resolveInner(level.start + 1, -1);
  while (node != null && node.name !== PlannerNodeName.ReuseSection) {
    node = node.parent;
  }
  const body = node?.parent;
  if (body == null || body.name !== PlannerNodeName.ReuseLiftoscript) {
    return undefined;
  }
  return { start: body.from, end: body.to };
}

export interface ILiftoEditorExerciseVariationSpan {
  // The name as written — label, name and equipment, without the `!` current marker.
  text: string;
  start: number;
  end: number;
  isCurrent: boolean;
}

export interface ILiftoEditorExerciseName {
  fullName: string;
  start: number;
  end: number;
  usedNone: boolean;
  variations: ILiftoEditorExerciseVariationSpan[];
}

function trimmedSpan<K extends string>(
  text: string,
  from: number,
  to: number,
  key: K
): { [P in K]: string } & { start: number; end: number } {
  const raw = text.slice(from, to);
  const trimmed = raw.trim();
  const start = from + (raw.length - raw.trimStart().length);
  return { [key]: trimmed, start, end: start + trimmed.length } as { [P in K]: string } & {
    start: number;
    end: number;
  };
}

// The rungs of a ladder, straight off the grammar. Splitting the full name on "|" and peeling
// a leading "!" gets the same answer for well-formed text and quietly disagrees for anything
// else, so the separator and the current marker are read as nodes, never as characters.
function readVariations(text: string, variations: SyntaxNode): ILiftoEditorExerciseVariationSpan[] {
  return variations.getChildren(PlannerNodeName.ExerciseVariation).map((variation) => {
    const name = variation.getChild(PlannerNodeName.ExerciseName);
    return {
      ...trimmedSpan(text, name?.from ?? variation.from, name?.to ?? variation.to, "text"),
      isCurrent: variation.getChild(PlannerNodeName.CurrentVariation) != null,
    };
  });
}

// The exercise's planner fullName (every `|` variation, no properties) and where it sits in
// the text — the identity of the thing being edited, independent of where the focus is. The
// span is the trimmed name, so replacing it can't eat the separator that follows. `usedNone`
// mirrors the evaluator's own `used: none` check rather than matching on the raw text, which
// would also fire inside a description.
export function LiftoEditorBrain_exerciseFullName(
  cache: LiftoEditorParseCache,
  text: string
): ILiftoEditorExerciseName | undefined {
  const tree = cache.parse(text);
  let variations: Omit<ILiftoEditorExerciseName, "usedNone"> | undefined;
  let usedNone = false;
  tree.iterate({
    enter: (node) => {
      if (variations == null && node.name === PlannerNodeName.ExerciseVariations) {
        variations = {
          ...trimmedSpan(text, node.from, node.to, "fullName"),
          variations: readVariations(text, node.node),
        };
        return false;
      }
      if (!usedNone && node.name === PlannerNodeName.ExerciseProperty) {
        const property = node.node;
        const name = property.getChild(PlannerNodeName.ExercisePropertyName);
        if (name != null && nodeText(text, name).trim() === "used") {
          usedNone = property.getChild(PlannerNodeName.None) != null;
        }
        return false;
      }
      return true;
    },
  });
  return variations != null ? { ...variations, usedNone } : undefined;
}

export function LiftoEditorBrain_contextAt(
  cache: LiftoEditorParseCache,
  text: string,
  index: number
): ILiftoEditorContext {
  const tree = cache.parse(text);
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
        pills: LiftoEditorActions_pillsForNode(text, node),
      });
    } else if (name === PlannerNodeName.ExerciseSets) {
      const exercise = LiftoEditorActions_enclosingExercise(node);
      const variations = exercise != null ? LiftoEditorActions_setVariationSections(exercise) : [];
      const variationIndex = variations.findIndex((s) => s.from === node!.from);
      levels.unshift({
        label: variations.length > 1 && variationIndex !== -1 ? `Sets ${variationIndex + 1}` : "Sets",
        nodeName: name,
        start: node.from,
        end: node.to,
        pills: LiftoEditorActions_pillsForNode(text, node),
      });
    } else if (name === PlannerNodeName.ExerciseVariation) {
      const siblings = node.parent?.getChildren(PlannerNodeName.ExerciseVariation) ?? [];
      // Single-variation exercises (the common case) get no level: the exercise level
      // already covers the name, and "Variation 1" would just be noise.
      if (siblings.length > 1) {
        const variationIndex = siblings.findIndex((s) => s.from === node!.from);
        levels.unshift({
          label: `Variation ${variationIndex + 1}`,
          nodeName: name,
          start: node.from,
          end: node.to,
          pills: LiftoEditorActions_pillsForNode(text, node),
        });
      }
    } else if (name === PlannerNodeName.ExerciseExpression) {
      const variations = node.getChild(PlannerNodeName.ExerciseVariations);
      const exerciseName = variations
        ?.getChild(PlannerNodeName.ExerciseVariation)
        ?.getChild(PlannerNodeName.ExerciseName);
      levels.unshift({
        label: exerciseName != null ? nodeText(text, exerciseName).trim() : "Exercise",
        nodeName: name,
        start: node.from,
        end: LiftoEditorActions_endOfExerciseLine(text, node),
        pills: LiftoEditorActions_pillsForNode(text, node),
        fullName: variations != null ? nodeText(text, variations).trim() : undefined,
      });
    } else if (name === PlannerNodeName.KeyValue) {
      const keyword = node.getChild(PlannerNodeName.Keyword);
      if (keyword != null) {
        levels.unshift({
          label: nodeText(text, keyword),
          nodeName: name,
          start: node.from,
          end: node.to,
          pills: LiftoEditorActions_pillsForNode(text, node),
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
        const renamePill = LiftoEditorActions_labelRenamePill(text, node);
        levels.unshift({
          label: "Label",
          nodeName: name,
          start: node.from,
          end: afterColon,
          pills: renamePill != null ? [renamePill] : [],
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
          pills: LiftoEditorActions_pillsForNode(text, node),
        });
      }
    } else if (name === PlannerNodeName.WarmupExerciseSets) {
      levels.unshift({
        label: breadcrumbLabels[name] ?? "Warmup sets",
        nodeName: name,
        start: node.from,
        end: node.to,
        pills: LiftoEditorActions_warmupSetsPillsAt(text, node, index),
      });
    } else if (name === PlannerNodeName.FunctionExpression) {
      const functionName = node.getChild(PlannerNodeName.FunctionName);
      if (functionName != null) {
        levels.unshift({
          label: `${nodeText(text, functionName)}()`,
          nodeName: name,
          start: node.from,
          end: node.to,
          pills: LiftoEditorActions_pillsForNode(text, node),
        });
      }
    } else {
      const isHeader = name === PlannerNodeName.Week || name === PlannerNodeName.Day;
      // "# Week 1" reads better as its own name than as the generic "Week", and in full-program
      // mode the crumb is the only thing saying where in the program the caret is.
      const label = (isHeader ? nodeText(text, node).replace(/^#+/, "").trim() : "") || breadcrumbLabels[name];
      if (label != null && levels[0]?.label !== label) {
        // Week/Day tokens include their trailing linebreak; keep the highlight on the line.
        const end = isHeader ? LiftoEditorActions_endOfExerciseLine(text, node) : node.to;
        levels.unshift({
          label,
          nodeName: name,
          start: node.from,
          end,
          pills: LiftoEditorActions_pillsForNode(text, node),
        });
      }
    }
  }
  return { breadcrumb: levels.map((level) => level.label), levels };
}

// Non-numeric word-level stops. A tap or ‹ › lands on the whole token; unlike numeric
// tokens they open no keypad. The walk descends INTO them looking for nested numeric
// tap-targets (a SetTimer's inner timers, a ReuseSection's week/day ints) — those come out
// with walkStop: false so the enclosing token stays a single ‹ › stop.
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

// The single walk behind both ‹ › focus hopping (walkStop tokens) and keypad targeting
// (numeric tokens). Whole numeric terminals (Weight/Percentage/Timer) are checked before
// plain names because their digits are not separate Int nodes.
export function LiftoEditorBrain_tokens(cache: LiftoEditorParseCache, text: string): IEditorToken[] {
  const tree = cache.parse(text);
  const tokens: IEditorToken[] = [];
  const plainStopStack: { from: number; to: number }[] = [];
  const plainSpan = (start: number, end: number): IEditorToken => {
    return { start, end, text: text.slice(start, end), walkStop: true };
  };
  tree.iterate({
    enter: (node) => {
      if (node.to <= node.from) {
        return true;
      }
      const insidePlainStop = plainStopStack.length > 0;
      if (node.name === PlannerNodeName.Liftoscript) {
        for (const span of liftoscriptNumericSpans(cache, text, node.from, node.to)) {
          tokens.push({
            start: span.start,
            end: span.end,
            text: text.slice(span.start, span.end),
            walkStop: true,
            numeric: { kind: span.kind, inFunctionArgs: true },
          });
        }
        return false;
      }
      const whole = wholeNumericTokenKinds[node.name as PlannerNodeName];
      if (whole != null) {
        tokens.push({
          start: node.from,
          end: node.to,
          text: text.slice(node.from, node.to),
          walkStop: !insidePlainStop,
          numeric: { kind: whole, inFunctionArgs: isInFunctionArgs(node.node) },
        });
        return false;
      }
      if (node.name === PlannerNodeName.Int || node.name === PlannerNodeName.Float) {
        tokens.push({
          start: node.from,
          end: node.to,
          text: text.slice(node.from, node.to),
          walkStop: !insidePlainStop,
          numeric: { kind: "number", inFunctionArgs: isInFunctionArgs(node.node) },
        });
        return false;
      }
      if (insidePlainStop) {
        // The enclosing token already is the stop; keep descending for numeric tap-targets.
        return true;
      }
      // State var names in custom(): the raw Keyword token inside KeyValue, so tapping
      // `myvar` in `custom(myvar: 0)` focuses it (the value stays a numeric keypad stop).
      if (node.name === PlannerNodeName.Keyword && node.node.parent?.name === PlannerNodeName.KeyValue) {
        tokens.push(plainSpan(node.from, node.to));
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
            tokens.push(plainSpan(node.from, node.from + colonIdx));
            let rest = node.from + colonIdx + 1;
            while (text[rest] === " ") {
              rest += 1;
            }
            if (rest < node.to) {
              tokens.push(plainSpan(rest, node.to));
            }
            return false;
          }
        }
        // SetTimer is one terminal ("30s|60s"), so its two timers aren't Int children the
        // descent below could find — split them out here as keypad tap-targets.
        if (node.name === PlannerNodeName.SetTimer) {
          tokens.push(plainSpan(node.from, node.to));
          const raw = text.slice(node.from, node.to);
          const timerRe = /\d+s/g;
          let timerMatch: RegExpExecArray | null;
          while ((timerMatch = timerRe.exec(raw)) != null) {
            const start = node.from + timerMatch.index;
            tokens.push({
              start,
              end: start + timerMatch[0].length,
              text: timerMatch[0],
              walkStop: false,
              numeric: { kind: "timer", inFunctionArgs: false },
            });
          }
          return false;
        }
        tokens.push(plainSpan(node.from, node.to));
        plainStopStack.push({ from: node.from, to: node.to });
        return true;
      }
      return true;
    },
    leave: (node) => {
      const top = plainStopStack[plainStopStack.length - 1];
      if (top != null && top.from === node.from && top.to === node.to) {
        plainStopStack.pop();
      }
    },
  });
  return tokens;
}
