import { SyntaxNode } from "@lezer/common";
import { IDayData, IPlannerProgram, ISettings } from "../../../types";
import { ObjectUtils_clone } from "../../../utils/object";
import { CollectionUtils_sortBy } from "../../../utils/collection";
import { IEither } from "../../../utils/types";
import { StringUtils_nextName } from "../../../utils/string";
import { parser as plannerExerciseParser } from "../plannerExerciseParser";
import { PlannerNodeName } from "../plannerExerciseStyles";
import { PlannerProgram_evaluate } from "./plannerProgram";
import type { PlannerSyntaxError } from "../plannerExerciseEvaluator";
import { PlannerKey_fromFullName } from "../plannerKey";
import { PlannerDocument_blockSpans } from "./plannerDocument";
import {
  PlannerProgramExercise_getProgressScript,
  PlannerProgramExercise_getUpdateScript,
} from "./plannerProgramExercise";
import { IPlannerProgramExercise } from "./types";
import { StringUtils_unindent } from "../../../utils/string";

// Every edit that changes *where things are* in a program: which weeks exist and in what order,
// which day slots exist, and which exercises sit in which day. Not what an exercise says — that is
// the per-exercise editors' half of the split, and this module never touches a set, a weight or a
// progression.
//
// It is named for the job rather than for the grid, because the job outlives the feature. The grid
// is the surface that offers these operations today (plans/20260722-liftoscript-first-editor.md
// deliberately keeps cross-week structure there, and puts per-exercise content in the text editor),
// but the rules here are the language's, not the grid's: a repeat covers one contiguous run of
// weeks, a day slot means the same thing in every week, `[2]` means "day 2 of my week" while
// `[1:2]` means "day 2 of week 1". Anything that ever rearranges a program has to obey them.
//
// Every edit takes a planner and returns either a new one or a sentence saying why not. None of
// them evaluates its way to an answer and prints the program back out — they splice the text the
// author wrote, so everything they did not edit stays exactly as it was.

function children(node: SyntaxNode): SyntaxNode[] {
  const cursor = node.cursor();
  const result: SyntaxNode[] = [];
  if (!cursor.firstChild()) {
    return result;
  }
  do {
    result.push(cursor.node);
  } while (cursor.nextSibling());
  return result;
}

// The forced order shares the repeat's bracket (`Squat[3,1-4]` is order 3 repeating weeks 1-4), so
// rewriting the range has to carry any order along with it.
function orderOf(repeatNode: SyntaxNode, text: string): number | undefined {
  for (const child of children(repeatNode)) {
    if (child.type.name === PlannerNodeName.Rep) {
      return parseInt(text.slice(child.from, child.to), 10);
    }
  }
  return undefined;
}

interface IExerciseLine {
  variationsEnd: number;
  repeatNode?: SyntaxNode;
}

function findExerciseLine(text: string, fullName: string): IExerciseLine | undefined {
  const tree = plannerExerciseParser.parse(text);
  for (const node of children(tree.topNode)) {
    if (node.type.name !== PlannerNodeName.ExerciseExpression) {
      continue;
    }
    const variations = node.getChild(PlannerNodeName.ExerciseVariations);
    if (variations == null || text.slice(variations.from, variations.to).trim() !== fullName) {
      continue;
    }
    return {
      variationsEnd: variations.to,
      repeatNode: node.getChild(PlannerNodeName.Repeat) ?? undefined,
    };
  }
  return undefined;
}

// The failure side carries a sentence, not a code: the UI shows it verbatim, so a refusal can say
// which exercise stands in the way rather than just refusing.
//
// `warnings` is the other half of that: an edit that went through but had to change something the
// user didn't ask it to change says so, rather than leaving them to notice later. A refusal has
// none — it changed nothing.
export type IPlannerStructureResult = IEither<IPlannerProgram, string> & { warnings?: string[] };

function withWarnings(result: IPlannerStructureResult, warnings: string[]): IPlannerStructureResult {
  return result.success && warnings.length > 0 ? { ...result, warnings } : result;
}

// Only `from`/`to` are ever read, so a parser node and a span found by hand in a comment both fit.
interface ITextSpan {
  from: number;
  to: number;
}

interface IDayReference {
  node: ITextSpan;
  day: number;
  hasWeek: boolean;
  // Which week's day numbering this points into. Absent means "the week I am written in" — and the
  // difference matters, because a week that lacks a row is not renumbered the same as one that has
  // it, so a day number only means something relative to a particular week.
  week?: number;
  // What it reuses, and where that name is written. A renumbering only needs the day, but an edit
  // that moves one *exercise* has to tell references to it apart from references to its neighbours
  // in the same day — and relabelling it has to rewrite the name here too, or the reuse keeps
  // naming an exercise that no longer goes by that.
  fullName: string;
  nameNode: ITextSpan;
}

// `...main[2]` reuses day 2 of this week; `...main[1:2]` reuses week 1 day 2. Both address a day by
// its slot, so both move when a day row is removed.
function dayReferences(text: string): IDayReference[] {
  const tree = plannerExerciseParser.parse(text);
  const result: IDayReference[] = [];
  for (const node of children(tree.topNode)) {
    if (node.type.name !== PlannerNodeName.ExerciseExpression) {
      continue;
    }
    for (const section of node.getChildren(PlannerNodeName.ExerciseSection)) {
      const reuse = section.getChild(PlannerNodeName.ReuseSectionWithWeekDay);
      const weekDay = reuse?.getChild(PlannerNodeName.WeekDay);
      const nameNode = reuse?.getChild(PlannerNodeName.ReuseSection)?.getChild(PlannerNodeName.ExerciseName);
      if (weekDay == null || nameNode == null) {
        continue;
      }
      const parts = weekDay.getChildren(PlannerNodeName.WeekOrDay);
      const dayNode = parts[parts.length - 1];
      if (dayNode == null) {
        continue;
      }
      const day = parseInt(text.slice(dayNode.from, dayNode.to), 10);
      const week = parts.length > 1 ? parseInt(text.slice(parts[0].from, parts[0].to), 10) : undefined;
      if (!isNaN(day)) {
        result.push({
          node: dayNode,
          day,
          hasWeek: parts.length > 1,
          week: week != null && !isNaN(week) ? week : undefined,
          fullName: text.slice(nameNode.from, nameNode.to).trim(),
          nameNode,
        });
      }
    }
  }
  return [...result, ...commentReferences(text).days];
}

// `// ...Squat[1:2]` reuses another exercise's *description* (llms/liftoscript.md). It lives in a
// comment, so the parser hands it back as one opaque LineComment and the coordinates inside have no
// structure — they have to be found by hand. Miss them and a day or week move renumbers every
// exercise reuse while silently leaving these pointing at whatever now occupies the old slot, with
// no evaluation error for refuseIfWorse to catch.
function commentReferences(text: string): { days: IDayReference[]; weeks: IWeekReference[] } {
  const tree = plannerExerciseParser.parse(text);
  const days: IDayReference[] = [];
  const weeks: IWeekReference[] = [];
  for (const node of children(tree.topNode)) {
    if (node.type.name !== PlannerNodeName.LineComment) {
      continue;
    }
    const comment = text.slice(node.from, node.to);
    // Lezer hands us the comment's extent and nothing inside it — the grammar is
    // `LineComment { "//" ![\n]* linebreakOrEof }`, one opaque token — so whether this is a reuse
    // directive can only be decided by doing to it exactly what the evaluator does, in the same
    // order, with the same helper: strip the `//`, strip a leading `!` (the current-description
    // marker), unindent, and ask whether what is left starts with `...`. A pattern of our own here
    // is a second definition of the same thing, and the two drift — an earlier version required the
    // `...` immediately after the `//` and silently stopped renumbering every `// !...` directive.
    const value = StringUtils_unindent(comment.replace(/^\/\//, "").replace(/^\s*!/, ""));
    if (!value.startsWith("...")) {
      continue;
    }
    // Which bracket is the qualifier is decided with the evaluator's own pattern — greedy, so it
    // runs to the *last* `]` — rather than by scanning for the nearest one. Same reason as above: a
    // second rule for reading the same directive is a rule that drifts, and this one drifting means
    // renumbering one bracket while the evaluator resolves another.
    //
    // Known and accepted: a directive with a *second* bracket after the qualifier — `// ...Squat[1:2]
    // [cue]` — is read wrong, because the greedy match swallows both and the day span computed from
    // it covers the trailing prose. Renumbering that comment then deletes the prose, or (if the
    // second bracket holds a colon) parses the day as NaN and skips the reference, leaving it stale.
    // Deliberate: matching the evaluator matters more than a shape nobody writes, and diverging here
    // to fix it is how the two rules drift apart again. Bound the span, don't re-scan, if it ever
    // does need fixing.
    const dots = comment.indexOf("...");
    const directive = comment.slice(dots + 3);
    const bracket = /\[([^]+)\]/.exec(directive);
    if (bracket == null) {
      continue;
    }
    // The name is whatever precedes the qualifier — an exercise name can't hold a bracket, since
    // `NonSeparator` excludes both. Measured rather than trimmed out of the string, because a
    // relabel splices back into these coordinates.
    const rawName = directive.slice(0, bracket.index);
    const nameFrom = node.from + dots + 3 + (rawName.length - rawName.trimStart().length);
    const fullName = rawName.trim();
    const nameNode = { from: nameFrom, to: nameFrom + fullName.length };
    {
      const inner = bracket[1];
      const innerStart = node.from + dots + 3 + bracket.index + 1;
      let offset = 0;
      const spans = inner.split(":").map((part) => {
        const span = { from: innerStart + offset, to: innerStart + offset + part.length, value: part };
        offset += part.length + 1;
        return span;
      });
      const daySpan = spans[spans.length - 1];
      const day = parseInt(daySpan.value, 10);
      if (!isNaN(day)) {
        const commentWeek = spans.length > 1 ? parseInt(spans[0].value, 10) : undefined;
        days.push({
          node: daySpan,
          day,
          hasWeek: spans.length > 1,
          week: commentWeek != null && !isNaN(commentWeek) ? commentWeek : undefined,
          fullName,
          nameNode,
        });
      }
      if (spans.length > 1) {
        const week = parseInt(spans[0].value, 10);
        if (!isNaN(week)) {
          weeks.push({ node: spans[0], week, fullName });
        }
      }
    }
  }
  return { days, weeks };
}

interface IWeekReference {
  node: ITextSpan;
  week: number;
  fullName: string;
}

// Only the qualifiers that name a week: `...main[1:2]` does, `...main[2]` doesn't — the latter
// means "day 2 of whatever week I'm in", which survives any renumbering of the weeks.
function weekReferences(text: string): IWeekReference[] {
  const tree = plannerExerciseParser.parse(text);
  const result: IWeekReference[] = [];
  for (const node of children(tree.topNode)) {
    if (node.type.name !== PlannerNodeName.ExerciseExpression) {
      continue;
    }
    for (const section of node.getChildren(PlannerNodeName.ExerciseSection)) {
      const reuse = section.getChild(PlannerNodeName.ReuseSectionWithWeekDay);
      const weekDay = reuse?.getChild(PlannerNodeName.WeekDay);
      const nameNode = reuse?.getChild(PlannerNodeName.ReuseSection)?.getChild(PlannerNodeName.ExerciseName);
      const parts = weekDay?.getChildren(PlannerNodeName.WeekOrDay) ?? [];
      if (parts.length < 2 || nameNode == null) {
        continue;
      }
      const week = parseInt(text.slice(parts[0].from, parts[0].to), 10);
      if (!isNaN(week)) {
        result.push({ node: parts[0], week, fullName: text.slice(nameNode.from, nameNode.to).trim() });
      }
    }
  }
  return [...result, ...commentReferences(text).weeks];
}

interface IRepeatToken {
  fullName: string;
  node: SyntaxNode;
  order?: number;
  // 1-based and inclusive, straight off the `[from-to]` in the text.
  range?: [number, number];
}

function exerciseRepeats(text: string): IRepeatToken[] {
  const tree = plannerExerciseParser.parse(text);
  const result: IRepeatToken[] = [];
  for (const node of children(tree.topNode)) {
    if (node.type.name !== PlannerNodeName.ExerciseExpression) {
      continue;
    }
    const variations = node.getChild(PlannerNodeName.ExerciseVariations);
    const repeat = node.getChild(PlannerNodeName.Repeat);
    if (variations == null || repeat == null) {
      continue;
    }
    const rangeNode = repeat.getChild(PlannerNodeName.RepRange);
    const reps = rangeNode != null ? children(rangeNode).filter((c) => c.type.name === PlannerNodeName.Rep) : [];
    result.push({
      fullName: text.slice(variations.from, variations.to).trim(),
      node: repeat,
      order: orderOf(repeat, text),
      range:
        reps.length === 2
          ? [parseInt(text.slice(reps[0].from, reps[0].to), 10), parseInt(text.slice(reps[1].from, reps[1].to), 10)]
          : undefined,
    });
  }
  return result;
}

// Where a line's forced order lives, for every line in a day — including the ones that carry no
// bracket at all, since a number may need writing there. That is what separates this from
// exerciseRepeats: that one answers "what does this line repeat", and skips a line with no `[...]`
// because there is nothing to answer; this one answers "where would this line's number go", and
// every line has an answer.
interface IOrderSlot {
  fullName: string;
  // The bracket where there is one, and the empty span just past the exercise name where there
  // isn't — so writing a token is the same splice either way.
  span: ITextSpan;
  order?: number;
  // 1-based and inclusive, straight off the `[from-to]`, and carried through any rewrite verbatim.
  range?: [number, number];
}

function exerciseOrderSlots(text: string): IOrderSlot[] {
  const tree = plannerExerciseParser.parse(text);
  const result: IOrderSlot[] = [];
  for (const node of children(tree.topNode)) {
    if (node.type.name !== PlannerNodeName.ExerciseExpression) {
      continue;
    }
    const variations = node.getChild(PlannerNodeName.ExerciseVariations);
    if (variations == null) {
      continue;
    }
    const repeat = node.getChild(PlannerNodeName.Repeat);
    const rangeNode = repeat?.getChild(PlannerNodeName.RepRange);
    const reps = rangeNode != null ? children(rangeNode).filter((c) => c.type.name === PlannerNodeName.Rep) : [];
    const order = repeat != null ? orderOf(repeat, text) : undefined;
    result.push({
      fullName: text.slice(variations.from, variations.to).trim(),
      span: repeat != null ? { from: repeat.from, to: repeat.to } : { from: variations.to, to: variations.to },
      order: order === 0 ? undefined : order,
      range:
        reps.length === 2
          ? [parseInt(text.slice(reps[0].from, reps[0].to), 10), parseInt(text.slice(reps[1].from, reps[1].to), 10)]
          : undefined,
    });
  }
  return result;
}

function repeatToken(
  order: number | undefined,
  range: [number, number] | undefined,
  keepSingleWeek: boolean = false
): string {
  const parts: string[] = [];
  if (order != null && order !== 0) {
    parts.push(`${order}`);
  }
  if (range != null && (range[1] > range[0] || keepSingleWeek)) {
    parts.push(`${range[0]}-${range[1]}`);
  }
  return parts.length > 0 ? `[${parts.join(",")}]` : "";
}

// Rewrites every week number in one day's text to where that week is going. `newForOld` maps a
// 0-based week index to its new one, or to undefined for a week being removed.
//
// A repeat is the hard part: it names one *contiguous* range of weeks and the grammar has no way to
// say anything else (`getRepeat` stops at the first range, and the printer breaks a run at its first
// gap). So a permutation that scatters the weeks an exercise repeats over cannot be written down at
// all, and this refuses rather than writing a range that means something else.
// `newWeekOfText` is the week this text will live in once the reorder lands. A repeat that shrinks
// to a single week can only drop its range when that week is this one: a definition prescribes its
// own week as well as its range, so `Squat[1-1]` written in week 3 means weeks 1 *and* 3, and
// rewriting it to plain `Squat` would quietly move it to week 3 alone.
function rewriteWeekNumbersInDay(
  text: string,
  newForOld: Map<number, number | undefined>,
  newWeekOfText: number,
  // Where this text lives, for the refusals below. They are the only messages in this module that
  // can't name a place from the program they were handed, because all this one has is the text.
  where: string
): IDayRewrite {
  const edits: { from: number; to: number; text: string }[] = [];
  for (const repeat of exerciseRepeats(text)) {
    if (repeat.range == null) {
      continue;
    }
    const moved: number[] = [];
    for (let week = repeat.range[0]; week <= repeat.range[1]; week += 1) {
      const next = newForOld.get(week - 1);
      if (next != null) {
        moved.push(next);
      }
    }
    moved.sort((a, b) => a - b);
    if (moved.length === 0) {
      // Every week it claimed is gone. Leaving the range alone would leave it claiming whichever
      // weeks now hold those numbers — weeks that never had this exercise. What survives is the
      // line itself, which prescribes the week it is written in, so drop the range.
      edits.push({ from: repeat.node.from, to: repeat.node.to, text: repeatToken(repeat.order, undefined) });
      continue;
    }
    if (moved[moved.length - 1] - moved[0] !== moved.length - 1) {
      return {
        success: false,
        error: `${repeat.fullName} in ${where} repeats over weeks that would no longer be next to each other. A repeat can only cover a run of weeks in a row.`,
      };
    }
    const first = moved[0];
    const last = moved[moved.length - 1];
    edits.push({
      from: repeat.node.from,
      to: repeat.node.to,
      text: repeatToken(repeat.order, [first + 1, last + 1], first === last && first !== newWeekOfText),
    });
  }
  for (const reference of weekReferences(text)) {
    const next = newForOld.get(reference.week - 1);
    if (next == null) {
      return {
        success: false,
        error: `${where} reuses ${reference.fullName} from week ${reference.week}, which is being removed. Point it at another week first.`,
      };
    }
    edits.push({ from: reference.node.from, to: reference.node.to, text: `${next + 1}` });
  }
  // Back to front so earlier edits don't move later offsets.
  let result = text;
  for (const edit of edits.sort((a, b) => b.from - a.from)) {
    result = `${result.slice(0, edit.from)}${edit.text}${result.slice(edit.to)}`;
  }
  return { success: true, data: result };
}

type IDayRewrite = IEither<string, string>;

// Permutes the weeks and rewrites everything that addressed them by number. `oldOrder[newIndex]` is
// the week that ends up there; a week left out of it is being deleted.
function reorderWeeks(planner: IPlannerProgram, oldOrder: number[], settings: ISettings): IPlannerStructureResult {
  const newForOld = new Map<number, number | undefined>();
  planner.weeks.forEach((_week, oldIndex) => newForOld.set(oldIndex, undefined));
  oldOrder.forEach((oldIndex, newIndex) => newForOld.set(oldIndex, newIndex));

  const result = ObjectUtils_clone(planner);
  for (const oldIndex of oldOrder) {
    const newIndex = newForOld.get(oldIndex);
    const week = result.weeks[oldIndex];
    for (const day of week?.days ?? []) {
      const rewritten = rewriteWeekNumbersInDay(
        day.exerciseText,
        newForOld,
        newIndex ?? -1,
        `${week.name}, ${day.name}`
      );
      if (!rewritten.success) {
        return { success: false, error: rewritten.error };
      }
      day.exerciseText = rewritten.data;
    }
  }
  // A name belongs to its week and travels with it, even when that leaves them out of order. The
  // name is what tells you the week moved at all — renumbering them back to 1, 2, 3 makes a
  // successful reorder look like nothing happened, since only the contents appear to shift.
  result.weeks = oldOrder.map((oldIndex) => result.weeks[oldIndex]).filter((week) => week != null);
  return refuseIfWorse(planner, result, settings);
}

// Moves a week. Unlike a day row, this is not a renumbering that always works: every repeat is a
// range of week numbers, so moving a week can scatter the weeks an exercise repeats over into
// something the language cannot express, and then this refuses.
export function PlannerStructure_moveWeek(
  planner: IPlannerProgram,
  fromIndex: number,
  toIndex: number,
  settings: ISettings
): IPlannerStructureResult {
  const count = planner.weeks.length;
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= count || toIndex >= count) {
    return { success: true, data: planner };
  }
  const oldOrder = Array.from({ length: count }, (_, i) => i);
  oldOrder.splice(toIndex, 0, ...oldOrder.splice(fromIndex, 1));
  return reorderWeeks(planner, oldOrder, settings);
}

// Deletes a week. An exercise whose definition lives in this week but whose run carries on past it
// would take the rest of the run with it, so its line moves to the first week of the run that
// survives — the range says where an exercise appears, not the week its text happens to sit in, so
// relocating the line changes nothing about the program.
export function PlannerStructure_deleteWeek(
  planner: IPlannerProgram,
  weekIndex: number,
  settings: ISettings
): IPlannerStructureResult {
  if (planner.weeks.length <= 1) {
    return { success: false, error: "A program needs at least one week." };
  }
  const relocated = ObjectUtils_clone(planner);
  const doomed = relocated.weeks[weekIndex];
  if (doomed == null) {
    return { success: true, data: planner };
  }
  doomed.days.forEach((day, dayIndex) => {
    const { blocks } = exerciseBlocks(day.exerciseText);
    const repeats = exerciseRepeats(day.exerciseText);
    for (const block of blocks) {
      const repeat = repeats.find((r) => sameExercise(r.fullName, block.fullName, settings));
      const range = repeat?.range;
      // A week that already says something about this exercise has its own definition — an
      // override — and that one stays. Keep looking rather than giving up: a later week in the
      // range may still be inheriting, and abandoning here drops the exercise from every week
      // after the override.
      const nextWeek =
        range != null
          ? Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] - 1 + i).find((week) => {
              const candidate = week !== weekIndex ? relocated.weeks[week]?.days[dayIndex] : undefined;
              return (
                candidate != null &&
                !exerciseBlocks(candidate.exerciseText).blocks.some((b) =>
                  sameExercise(b.fullName, block.fullName, settings)
                )
              );
            })
          : undefined;
      if (nextWeek == null) {
        continue;
      }
      const target = relocated.weeks[nextWeek].days[dayIndex];
      const to = exerciseBlocks(target.exerciseText);
      target.exerciseText = joinBlocks(withBlockAt(to, to.blocks.length, block), target.exerciseText);
    }
    // Emptied rather than left to be dropped with the week, so that the intermediate program the
    // checks below evaluate never holds the same exercise twice.
    day.exerciseText = "";
  });

  const oldOrder = planner.weeks.map((_week, i) => i).filter((i) => i !== weekIndex);
  const reordered = reorderWeeks(relocated, oldOrder, settings);
  if (!reordered.success) {
    return reordered;
  }
  // Compared against the program as it was, not against the relocation step, so a move that broke
  // something is still caught.
  return refuseIfWorse(planner, reordered.data, settings);
}

// Appends a copy of a week. Appending is what keeps it safe: no existing week moves, so no repeat
// range and no `[week:day]` has to be rewritten.
//
// Only a week that says everything it does can be copied. Most of a repeating program's weeks hold
// no text at all — their content is materialized from a repeat authored earlier — and copying their
// text would produce an empty week that looks like the one you asked for. Writing out what the
// evaluator resolved instead is the materialize operation, which the grid doesn't have yet, so this
// says so rather than silently making an empty week.
export function PlannerStructure_duplicateWeek(
  planner: IPlannerProgram,
  weekIndex: number,
  settings: ISettings
): IPlannerStructureResult {
  const week = planner.weeks[weekIndex];
  if (week == null) {
    return { success: true, data: planner };
  }
  const { evaluatedWeeks } = PlannerProgram_evaluate(planner, settings);
  const evaluated = evaluatedWeeks[weekIndex] ?? [];
  const inherited = new Set<string>();
  evaluated.forEach((day, dayIndex) => {
    if (!day.success) {
      return;
    }
    const authored = exerciseBlocks(week.days[dayIndex]?.exerciseText ?? "").blocks.map((b) => b.fullName);
    for (const exercise of day.data) {
      if (authored.indexOf(exercise.fullName) === -1) {
        inherited.add(exercise.fullName);
      }
    }
  });
  if (inherited.size > 0) {
    return {
      success: false,
      error: `${Array.from(inherited).slice(0, 3).join(", ")} appear${inherited.size === 1 ? "s" : ""} in this week by repeating from an earlier one, so there is no text here to copy. Duplicate the week that defines them instead.`,
    };
  }

  const result = ObjectUtils_clone(planner);
  result.weeks.push({
    name: uniqueWeekName(planner, `Week ${result.weeks.length + 1}`),
    // The copy stands on its own: a repeat carried over would claim the weeks the original already
    // covers and say nothing about the new one.
    days: week.days.map((day) => ({ name: day.name, exerciseText: stripRepeats(day.exerciseText) })),
  });
  return refuseIfWorse(planner, result, settings);
}

export interface IPlannerWeekDetails {
  name: string;
  description?: string;
}

// What a week is called and what it says about itself. Nothing in the language addresses a week by
// name — a repeat and a `[week:day]` both count weeks — so neither field can break an exercise, and
// the checks are about surviving the round trip through the full text, where a week is the one line
// `# name` above its `//` description.
export function PlannerStructure_setWeekDetails(
  planner: IPlannerProgram,
  weekIndex: number,
  details: IPlannerWeekDetails
): IPlannerStructureResult {
  const week = planner.weeks[weekIndex];
  if (week == null) {
    return { success: true, data: planner };
  }
  const name = details.name.trim();
  if (name.length === 0) {
    return { success: false, error: "A week needs a name." };
  }
  if (name.indexOf("\n") !== -1) {
    return { success: false, error: "A week name has to fit on one line." };
  }
  const description = details.description?.trim();
  const newDescription = description != null && description.length > 0 ? description : undefined;
  if (name === week.name && newDescription === week.description) {
    return { success: true, data: planner };
  }
  const result = ObjectUtils_clone(planner);
  result.weeks[weekIndex].name = name;
  result.weeks[weekIndex].description = newDescription;
  return { success: true, data: result };
}

// A field left out is left alone, in every week. A day row is one slot across the whole program, but
// each week writes its own `## name` and its own description, and the two can disagree — so an edit
// that only touched the description must not carry the name it was *shown* into weeks that call the
// day something else. An empty description is a field the user cleared, not one they left alone.
export interface IPlannerDayDetails {
  name?: string;
  description?: string;
}

// What a day is called and what it says about itself, in every week at once — the same reason
// deleting or duplicating a day row applies to all of them: a day number means the same slot in
// every week, so letting one week disagree about which slot is which is the corruption this editor
// exists to prevent. Names, though, are not addressable from anywhere in the language, so this can't
// break an exercise; the checks are about surviving the round trip through the full text, where a
// day is the one line `## name` under its `//` description.
export function PlannerStructure_setDayDetails(
  planner: IPlannerProgram,
  rowIndex: number,
  details: IPlannerDayDetails
): IPlannerStructureResult {
  const name = details.name?.trim();
  if (name != null) {
    if (name.length === 0) {
      return { success: false, error: "A day needs a name." };
    }
    if (name.indexOf("\n") !== -1) {
      return { success: false, error: "A day name has to fit on one line." };
    }
  }
  const trimmedDescription = details.description?.trim();
  const description = trimmedDescription != null && trimmedDescription.length > 0 ? trimmedDescription : undefined;
  const result = ObjectUtils_clone(planner);
  let changed = false;
  for (const week of result.weeks) {
    const day = week.days[rowIndex];
    if (day == null) {
      continue;
    }
    if (name != null && day.name !== name) {
      day.name = name;
      changed = true;
    }
    if (details.description != null && day.description !== description) {
      day.description = description;
      changed = true;
    }
  }
  return { success: true, data: changed ? result : planner };
}

function uniqueWeekName(planner: IPlannerProgram, preferred: string): string {
  const taken = new Set(planner.weeks.map((week) => week.name));
  let name = preferred;
  while (taken.has(name)) {
    name = StringUtils_nextName(name);
  }
  return name;
}

function stripRepeats(text: string): string {
  let result = text;
  for (const repeat of exerciseRepeats(text).slice().reverse()) {
    result = `${result.slice(0, repeat.node.from)}${repeatToken(repeat.order, undefined)}${result.slice(repeat.node.to)}`;
  }
  return result;
}

function renumberDayReferences(text: string, deletedDay: number): string {
  const references = dayReferences(text).filter((r) => r.day > deletedDay);
  let result = text;
  // Back to front so earlier splices don't move later offsets — sorted rather than reversed,
  // because comment references are collected after the exercise ones, not in document order.
  for (const reference of references.slice().sort((a, b) => b.node.from - a.node.from)) {
    result = `${result.slice(0, reference.node.from)}${reference.day - 1}${result.slice(reference.node.to)}`;
  }
  return result;
}

// Removes a day from EVERY week at once. Doing it in one week only would shift that week's slots
// and leave the others alone, so a repeat or a `...main[2]` would then mean a different day
// depending on which week you read it from — the corruption this editor exists to prevent. Removing
// the whole row is a uniform renumber instead: every week loses the same slot, and every day
// qualifier after it shifts by one.
export function PlannerStructure_deleteDayRow(
  planner: IPlannerProgram,
  rowIndex: number,
  settings: ISettings
): IPlannerStructureResult {
  const deletedDay = rowIndex + 1;
  // Grouped by the day that does the reusing rather than listed flat, so several reuses from one
  // day read as one clause instead of repeating the day's name for each.
  const blockers = new Map<string, Set<string>>();
  for (const week of planner.weeks) {
    week.days.forEach((day, dayIndex) => {
      if (dayIndex === rowIndex) {
        return;
      }
      for (const reference of dayReferences(day.exerciseText)) {
        if (reference.day === deletedDay) {
          blockers.set(day.name, (blockers.get(day.name) ?? new Set()).add(reference.fullName));
        }
      }
    });
  }
  if (blockers.size > 0) {
    const clauses = Array.from(blockers).map(
      ([dayName, names]) => `${dayName} reuses ${Array.from(names).join(" and ")}`
    );
    return {
      success: false,
      error: `${clauses.join("; ")} from this day. Change those to reuse another day first.`,
    };
  }

  const result = ObjectUtils_clone(planner);
  for (const week of result.weeks) {
    if (week.days[rowIndex] != null) {
      week.days.splice(rowIndex, 1);
    }
    for (const day of week.days) {
      day.exerciseText = renumberDayReferences(day.exerciseText, deletedDay);
    }
  }
  return refuseIfWorse(planner, result, settings);
}

// The couplings a day can carry are open-ended — a `used: none` template declared in one day and
// redefined in the others, a reuse by name across days, something not yet thought of — so rather
// than trying to enumerate them, check the answer: if the edit breaks something that evaluated
// cleanly before, refuse and say what broke. Enumerating is how silent corruption gets shipped.
function refuseIfWorse(before: IPlannerProgram, after: IPlannerProgram, settings: ISettings): IPlannerStructureResult {
  // Ask it of each day individually: was this day fine before, and is it broken now?
  //
  // Days are matched by id rather than by position, because a structural edit moves them, and not
  // by message, because a message embeds the week it happened in — "no such exercise Missing at
  // week: 1" becomes "... at week: 2" when the week moves, which once made a legitimate move look
  // like a new error and refused it. A day the edit removed is not compared at all: it was meant to
  // go.
  const beforeDays = dayOutcomes(before, settings);
  const afterDays = dayOutcomes(after, settings);
  const identified = [...beforeDays, ...afterDays].every((day) => day.id != null);
  if (identified) {
    const wasFine = new Set(beforeDays.filter((day) => day.failure == null).map((day) => day.id));
    const broken = afterDays.find((day) => day.failure != null && wasFine.has(day.id));
    if (broken != null) {
      return { success: false, error: describeBreak(after, broken, settings) };
    }
    return { success: true, data: after };
  }

  // Without ids there is nothing to match days by, so fall back to counting failures. That misses a
  // *substitution* — one day going green while another goes red keeps the count the same — which
  // matters because deleting a week or a day removes whatever was failing inside it, so exactly the
  // destructive edits this guards can hide a new break behind a removed one.
  //
  // This is the path a planner parsed straight from text takes, which is every test in this
  // module; the app itself always has ids, from the storage migration and the backfill in
  // screenProgram. Worth knowing when reading a test that says an edit is refused: it proves less
  // than the same edit does in the app.
  const brokenBefore = beforeDays.filter((day) => day.failure != null);
  const brokenAfter = afterDays.filter((day) => day.failure != null);
  if (brokenAfter.length > brokenBefore.length) {
    const messages = brokenBefore.map((day) => day.failure?.message);
    const introduced = brokenAfter.find((day) => messages.indexOf(day.failure?.message) === -1) ?? brokenAfter[0];
    return { success: false, error: describeBreak(after, introduced, settings) };
  }
  return { success: true, data: after };
}

// One outcome per day. The count is what the check is made of; the rest is what the refusal is
// written from, which is why the whole error is kept rather than its message — the message is
// written for someone reading the text, and a refusal has to be readable by someone looking at a
// grid.
interface IDayOutcome {
  // Days carry a stable id once a program has been through the store, but a planner parsed straight
  // from text has none — see refuseIfWorse for what that costs.
  id: string | undefined;
  failure: PlannerSyntaxError | undefined;
  weekName: string;
  dayName: string;
  text: string;
}

function dayOutcomes(planner: IPlannerProgram, settings: ISettings): IDayOutcome[] {
  const { evaluatedWeeks } = PlannerProgram_evaluate(planner, settings);
  return planner.weeks.reduce<IDayOutcome[]>(
    (acc, week, weekIndex) => [
      ...acc,
      ...week.days.map((day, dayIndex) => {
        const evaluated = evaluatedWeeks[weekIndex]?.[dayIndex];
        return {
          id: day.id,
          failure: evaluated != null && !evaluated.success ? evaluated.error : undefined,
          weekName: week.name,
          dayName: day.name,
          text: day.exerciseText,
        };
      }),
    ],
    []
  );
}

// How a week and day are named to the user. The grid draws names, not numbers, so a refusal that
// says "week: 2, day: 1" sends them counting — and counting the wrong thing, since the numbers in
// an evaluator message are of the *intermediate* program the check built, not the one on screen.
function placeName(planner: IPlannerProgram, week: number, dayInWeek: number): string {
  const weekName = planner.weeks[week - 1]?.name ?? `Week ${week}`;
  const dayName = planner.weeks[week - 1]?.days[dayInWeek - 1]?.name ?? `Day ${dayInWeek}`;
  return `${weekName}, ${dayName}`;
}

function placeOf(planner: IPlannerProgram, dayData: IDayData): string | undefined {
  return dayData.week != null && dayData.dayInWeek != null
    ? placeName(planner, dayData.week, dayData.dayInWeek)
    : undefined;
}

// A refusal, written from the error's details rather than its message. Only the kinds a structural
// edit can actually cause are spelled out; anything else falls back to the evaluator's own words
// with its line and column stripped, since those address a day's text and the grid shows no text.
function describeBreak(planner: IPlannerProgram, outcome: IDayOutcome, settings: ISettings): string {
  const error = outcome.failure;
  if (error == null) {
    return "That would break the program.";
  }
  const where = `${outcome.weekName}, ${outcome.dayName}`;
  const details = error.details;
  switch (details.type) {
    case "reuseTargetNotFound": {
      // A reuse without a day means "wherever in that week it is", so naming a day here would put
      // a place in front of the user that the reuse never claimed.
      const { week, day } = details.data;
      const at =
        week == null
          ? ""
          : day == null
            ? ` from ${planner.weeks[week - 1]?.name ?? `week ${week}`}`
            : ` from ${placeName(planner, week, day)}`;
      return `${details.subject ?? "Something"} in ${where} reuses ${details.data.fullName}${at}, which wouldn't be there any more.`;
    }
    case "duplicateExerciseInDay": {
      const name = exerciseBlocks(outcome.text).blocks.find(
        (block) => exerciseKey(block.fullName, settings) === details.data.key
      )?.fullName;
      return `${where} would end up with two of ${name ?? "the same exercise"}. Give one of them a label to tell them apart.`;
    }
    case "conflictingProperty": {
      // Both are the 1-based `dayData` the evaluator was handed. Its own message adds one to the
      // first of them, which reads a week late; the details are the numbers themselves, so this
      // doesn't inherit that.
      const first = placeOf(planner, details.data.a);
      const second = placeOf(planner, details.data.b);
      const between = first != null && second != null ? ` — one in ${first}, another in ${second}` : "";
      return `${details.data.exercise} would say two different things about ${details.data.property}${between}. It has to say the same thing everywhere.`;
    }
    case "reuseAmbiguous":
      return `A reuse in ${where} would match several exercises. It needs a [week:day] to say which one it means.`;
    case "unknownExercise":
      return `${where} has no exercise called ${details.data.name}.`;
    default:
      return `That would break the program: ${error.message.replace(/\s*\(\d+:\d+\)$/, "")} (in ${where}).`;
  }
}

// Appends a copy of the day to every week. Appending is what keeps this safe: no existing slot
// moves, so nothing that points at one has to be rewritten.
export function PlannerStructure_duplicateDayRow(
  planner: IPlannerProgram,
  rowIndex: number,
  settings: ISettings
): IPlannerStructureResult {
  const result = ObjectUtils_clone(planner);
  const copies = result.weeks.map((week) => {
    const day = week.days[rowIndex];
    if (day == null) {
      return -1;
    }
    week.days.push({ name: `Day ${week.days.length + 1}`, exerciseText: day.exerciseText });
    return week.days.length - 1;
  });
  // A copied day can redeclare an exercise the original owned, so this gets the same check.
  const checked = refuseIfWorse(planner, result, settings);
  if (!checked.success) {
    return checked;
  }
  // And then the check this operation needs on top: does the copy actually say what the original
  // said, in every week?
  //
  // Appending puts the copy at a different row index in a week with fewer days, so a repeat that
  // fills "day 3" has no day 3 to fill in the short week and the copy evaluates empty. Inserting
  // beside the original instead of appending would fix it properly, but that moves every slot
  // below and means renumbering every reference to them — so for now this refuses rather than
  // handing back a duplicate that is silently blank in some weeks.
  const { evaluatedWeeks } = PlannerProgram_evaluate(checked.data, settings);
  for (let weekIndex = 0; weekIndex < copies.length; weekIndex += 1) {
    if (copies[weekIndex] === -1) {
      continue;
    }
    const source = evaluatedWeeks[weekIndex]?.[rowIndex];
    const copy = evaluatedWeeks[weekIndex]?.[copies[weekIndex]];
    if (!source?.success || !copy?.success) {
      continue;
    }
    if (copy.data.length !== source.data.length) {
      return {
        success: false,
        error: `${result.weeks[weekIndex].name} inherits this day from a repeat elsewhere, so the copy would come out empty. Write the day out in that week first.`,
      };
    }
  }
  return checked;
}

// A comment or description line belongs to the exercise it precedes, so reordering moves the block
// rather than the bare line — otherwise an exercise's notes stay behind with whatever takes its
// place.
interface IExerciseBlock {
  fullName: string;
  text: string;
}

// Split on the parser's node ranges, not on lines: an exercise's `{~ ... ~}` script spans several
// lines, and cutting between them turns a progress block into loose statements the next exercise
// inherits.
// The same exercise can be spelled differently from week to week — `!Squat | Front Squat` and
// `Squat | !Front Squat` differ only in which variation is active — so matching on raw text finds
// it in the week a drag started in and silently misses it everywhere else, leaving half a move
// behind.
//
// The key is the identity the *evaluator* uses, so using anything else here means the two disagree
// about what one exercise is. These functions work on text and never build an
// `IPlannerProgramExercise`, so the key is derived from the name — which needs the custom exercises
// out of settings to resolve a name and equipment to a canonical exercise. Verified against every
// builtin: 5393 evaluated exercises, and the derived key matched the stored one every time.
function exerciseKey(fullName: string, settings: ISettings): string {
  return PlannerKey_fromFullName(fullName, settings.exercises);
}

function sameExercise(a: string, b: string, settings: ISettings): boolean {
  return exerciseKey(a, settings) === exerciseKey(b, settings);
}

// A day's text as movable blocks separated by spans that stay where they are. `fixed` is one
// longer than `blocks`: fixed[0], blocks[0], fixed[1], blocks[1] ... fixed[n]. The fixed spans hold
// `///` comments and the blank lines that space a day out — content that belongs to the position
// rather than to any exercise, and that must not travel when an exercise is moved or deleted.
interface IDayDocument {
  blocks: IExerciseBlock[];
  fixed: string[];
}

function exerciseBlocks(text: string): IDayDocument {
  const spans = PlannerDocument_blockSpans(text);
  const blocks: IExerciseBlock[] = [];
  const fixed: string[] = [];
  let cursor = 0;
  for (const span of spans) {
    fixed.push(text.slice(cursor, span.from));
    const body = text.slice(span.from, span.exerciseTo);
    // An exercise expression usually ends past its own line break, but the last one in a day does
    // not. Normalize so a block moved anywhere else does not run into the line after it — and only
    // step over a line break the body did not already take, or the blank line that spaces the next
    // one out gets eaten.
    const complete = body.endsWith("\n");
    blocks.push({ fullName: span.fullName, text: complete ? body : `${body}\n` });
    cursor = span.exerciseTo;
    if (!complete && text[cursor] === "\n") {
      cursor += 1;
    }
  }
  fixed.push(text.slice(cursor));
  return { blocks, fixed };
}

function joinBlocks(document: IDayDocument, originalText: string): string {
  const joined = document.fixed.reduce(
    (acc, span, i) => `${acc}${span}${i < document.blocks.length ? document.blocks[i].text : ""}`,
    ""
  );
  return originalText.endsWith("\n") || joined === "" ? joined : joined.replace(/\n$/, "");
}

// Dropping a block closes the gap it left: the spans on either side of it become one, so the
// `///` comment that sat above it and the blank line below do not end up doubled.
function withoutBlock(document: IDayDocument, index: number): IDayDocument {
  const fixed = document.fixed.slice();
  fixed.splice(index, 2, `${fixed[index]}${fixed[index + 1]}`);
  return { blocks: document.blocks.filter((_, i) => i !== index), fixed };
}

function withBlockAt(document: IDayDocument, index: number, block: IExerciseBlock): IDayDocument {
  const blocks = document.blocks.slice();
  blocks.splice(index, 0, block);
  const fixed = document.fixed.slice();
  fixed.splice(index + 1, 0, "");
  return { blocks, fixed };
}

function reorderDayText(text: string, order: string[], settings: ISettings): string {
  const document = exerciseBlocks(text);
  // By key, like every other match in this module: the order comes from one week, and another week
  // may spell the same exercise differently.
  const orderKeys = order.map((name) => exerciseKey(name, settings));
  const rank = (block: IExerciseBlock): number => orderKeys.indexOf(exerciseKey(block.fullName, settings));
  // Only the blocks named in `order` move, and they move within the slots they already occupy, so
  // anything the grid doesn't know about stays exactly where the author put it — including the
  // fixed spans between them, which never move at all.
  const movableSlots = document.blocks.reduce<number[]>(
    (acc, block, index) => (rank(block) !== -1 ? [...acc, index] : acc),
    []
  );
  const reordered = movableSlots.map((slot) => document.blocks[slot]).sort((a, b) => rank(a) - rank(b));
  const blocks = document.blocks.slice();
  movableSlots.forEach((slot, i) => {
    blocks[slot] = reordered[i];
  });
  return joinBlocks({ blocks, fixed: document.fixed }, text);
}

// `Squat[3]` is not a position, it is an absolute sort key: Program_buildWeeks sorts every day by
// it with an absent one counting as 0, and document position only breaks ties between exercises
// sharing a number. So a day carrying numbers overrules anything that moves a line, and the two
// disagree until something makes them agree again — which is why a drag on such a day used to
// rewrite the text and then appear to do nothing at all.
//
// Everything below is that reconciliation, run after a transform has put the lines where they
// belong. It prefers to reconcile on *no* numbers: with every order 0 the sort is stable and
// document order wins outright, which is both what the author is looking at and one less thing in
// the text.
//
// A row's exercises in the order its text puts them, which after such a transform is the order that
// was asked for. Weeks in order, each week's blocks in order, first sighting wins — the same rule
// the grid builds its lanes by, so the two cannot drift. Every exercise on a row is authored by
// exactly one line on that row (a repeat covers the same day row in later weeks), so this sees all
// of them.
function rowOrderFromText(planner: IPlannerProgram, rowIndex: number, settings: ISettings): string[] {
  const seen = new Set<string>();
  return planner.weeks.reduce<string[]>((acc, week) => {
    for (const slot of exerciseOrderSlots(week.days[rowIndex]?.exerciseText ?? "")) {
      const key = exerciseKey(slot.fullName, settings);
      if (!seen.has(key)) {
        seen.add(key);
        acc.push(slot.fullName);
      }
    }
    return acc;
  }, []);
}

function withRowOrders(
  planner: IPlannerProgram,
  rowIndex: number,
  orderFor: (slot: IOrderSlot) => number | undefined
): IPlannerProgram {
  const result = ObjectUtils_clone(planner);
  for (const week of result.weeks) {
    const day = week.days[rowIndex];
    if (day == null) {
      continue;
    }
    // Back to front, so rewriting one bracket does not shift the offsets of the ones after it.
    day.exerciseText = exerciseOrderSlots(day.exerciseText).reduceRight((text, slot) => {
      // keepSingleWeek, because a range that survives a rewrite has to survive it verbatim:
      // `Squat[1-1]` written in week 3 means weeks 1 *and* 3, and dropping it would move it.
      const token = repeatToken(orderFor(slot), slot.range, slot.range != null);
      return `${text.slice(0, slot.span.from)}${token}${text.slice(slot.span.to)}`;
    }, day.exerciseText);
  }
  return result;
}

// Whether every week draws the row the way its text reads. The evaluator does not sort — that is
// Program_buildWeeks' job, and the grid reads its output — so the same key is applied here.
function rowReadsInTextOrder(
  planner: IPlannerProgram,
  rowIndex: number,
  wanted: string[],
  settings: ISettings
): boolean {
  const { evaluatedWeeks } = PlannerProgram_evaluate(planner, settings);
  const wantedKeys = wanted.map((fullName) => exerciseKey(fullName, settings));
  return planner.weeks.every((_week, weekIndex) => {
    const day = evaluatedWeeks[weekIndex]?.[rowIndex];
    if (day == null || !day.success) {
      return true;
    }
    const shown = CollectionUtils_sortBy(day.data, "order")
      .map((exercise) => exercise.key)
      .filter((key) => wantedKeys.indexOf(key) !== -1);
    // What this week ought to show is the row's order restricted to what this week actually has.
    // Drawn from a dwindling copy rather than by `includes`, so a day holding two of one exercise
    // has to match twice.
    const remaining = shown.slice();
    const expected = wantedKeys.filter((key) => {
      const at = remaining.indexOf(key);
      if (at !== -1) {
        remaining.splice(at, 1);
      }
      return at !== -1;
    });
    return shown.length === expected.length && shown.every((key, i) => key === expected[i]);
  });
}

// Makes a row's numbers agree with its positions, using as few numbers as it can.
//
// When they can be dropped altogether is not readable from the day's own text: an exercise that
// repeats into a later week has no line there, so its position in that week comes from its number
// and nothing else. Rather than model that, the stripped program is evaluated and checked, and only
// a row that fails gets numbered — every exercise on it, because a number can only be outranked by
// a smaller one, so pinning some of them cannot place the rest.
export function PlannerStructure_normalizeOrdersInDay(
  planner: IPlannerProgram,
  rowIndex: number,
  settings: ISettings
): IPlannerProgram {
  const slots = planner.weeks.flatMap((week) => exerciseOrderSlots(week.days[rowIndex]?.exerciseText ?? ""));
  if (!slots.some((slot) => slot.order != null)) {
    return planner;
  }
  const wanted = rowOrderFromText(planner, rowIndex, settings);
  const stripped = withRowOrders(planner, rowIndex, () => undefined);
  if (rowReadsInTextOrder(stripped, rowIndex, wanted, settings)) {
    return stripped;
  }
  const numbers = wanted.reduce<Record<string, number>>(
    (acc, fullName, index) => ({ ...acc, [exerciseKey(fullName, settings)]: index + 1 }),
    {}
  );
  return withRowOrders(planner, rowIndex, (slot) => numbers[exerciseKey(slot.fullName, settings)] ?? slot.order);
}

// Reorders exercises within a day. This is content order — no slot identity moves — so it is safe
// in a way none of the other structural edits are. Applied to every week's copy of the day so the
// grid's lanes, which are shared across weeks, keep meaning one thing.
export function PlannerStructure_reorderExercisesInDay(
  planner: IPlannerProgram,
  rowIndex: number,
  order: string[],
  settings: ISettings
): IPlannerStructureResult {
  const result = ObjectUtils_clone(planner);
  for (const week of result.weeks) {
    const day = week.days[rowIndex];
    if (day != null) {
      day.exerciseText = reorderDayText(day.exerciseText, order, settings);
    }
  }
  return refuseIfWorse(planner, PlannerStructure_normalizeOrdersInDay(result, rowIndex, settings), settings);
}

// Moves one exercise from one day row to another, in every week that authors it there. A repeated
// exercise is authored once — the later weeks hold no text for it — so moving that one line carries
// the whole run with it, and it now repeats on the new day. A week that overrides the exercise with
// its own definition moves that copy too, which is what keeps the lane whole.
//
// `beforeFullName` anchors the insert by name rather than by index: the target day can hold a
// different number of exercises in each week (a ragged week, an override), and an index would land
// in a different place in each of them.
export function PlannerStructure_moveExerciseToDay(
  planner: IPlannerProgram,
  fromRowIndex: number,
  fullName: string,
  toRowIndex: number,
  beforeFullName: string | undefined,
  settings: ISettings
): IPlannerStructureResult {
  return PlannerStructure_moveExercisesToDay(
    planner,
    [{ fromRowIndex, fullName }],
    toRowIndex,
    beforeFullName,
    settings
  );
}

export interface IPlannerStructureExerciseMove {
  fromRowIndex: number;
  fullName: string;
}

// Where an exercise's name is written on its own line, found by key rather than by matching the
// text: two weeks can spell the same exercise differently — `!Squat | Front Squat` against
// `Squat | !Front Squat` — and a relabel has to land in both.
function variationsSpan(text: string, fullName: string, settings: ISettings): ITextSpan | undefined {
  const tree = plannerExerciseParser.parse(text);
  for (const node of children(tree.topNode)) {
    if (node.type.name !== PlannerNodeName.ExerciseExpression) {
      continue;
    }
    const variations = node.getChild(PlannerNodeName.ExerciseVariations);
    if (variations == null) {
      continue;
    }
    if (sameExercise(text.slice(variations.from, variations.to).trim(), fullName, settings)) {
      return { from: variations.from, to: variations.to };
    }
  }
  return undefined;
}

// The same name under a different label. A label is whatever precedes the first colon — the same
// rule `extractNameParts` applies, so a name that happens to contain one is already being read as
// labelled and this agrees with the evaluator rather than inventing a second rule. The `!` marking
// the current variation sits outside the label, and only the first of several `|` variations
// carries one.
function withLabel(fullName: string, label: string): string {
  const segments = fullName.split("|");
  const marker = segments[0].trimStart().startsWith("!") ? "!" : "";
  const body = segments[0].trim().replace(/^!\s*/, "");
  const colon = body.indexOf(":");
  const unlabeled = colon === -1 ? body : body.slice(colon + 1).trim();
  return [`${marker}${label}: ${unlabeled}`, ...segments.slice(1)].join("|");
}

// Rewrites the reuses that address one exercise on one day row — matched on the name *and* the row
// together, because a day holds several exercises and only the one being moved should have its
// address rewritten. Both halves are optional: a move changes the day, a relabel changes the name,
// and a move into an occupied day does both at once.
function retargetDayReferences(
  planner: IPlannerProgram,
  match: { fullName: string; day: number },
  next: { fullName?: string; day?: number },
  settings: ISettings
): void {
  for (const week of planner.weeks) {
    for (const day of week.days) {
      const edits: { from: number; to: number; text: string }[] = [];
      for (const reference of dayReferences(day.exerciseText)) {
        if (reference.day !== match.day || !sameExercise(reference.fullName, match.fullName, settings)) {
          continue;
        }
        if (next.day != null && next.day !== reference.day) {
          edits.push({ from: reference.node.from, to: reference.node.to, text: `${next.day}` });
        }
        if (next.fullName != null) {
          edits.push({ from: reference.nameNode.from, to: reference.nameNode.to, text: next.fullName });
        }
      }
      // Back to front so earlier splices don't move later offsets.
      day.exerciseText = edits
        .sort((a, b) => b.from - a.from)
        .reduce((text, edit) => `${text.slice(0, edit.from)}${edit.text}${text.slice(edit.to)}`, day.exerciseText);
    }
  }
}

// Which exercises one week's copy of a day prescribes. Every question of the form "is this exercise
// there" goes through here, so that they cannot answer it differently.
//
// The evaluator is the authority, because only it sees a repeat backfilling into a week that holds
// no text of its own. But a day that fails to evaluate hands back *nothing at all*, and reading
// that as "the day is empty" is how a move deletes the last copy of something or drops a second one
// on top of it — a broken program is exactly when those must not happen. So a day that doesn't
// evaluate is answered from the text instead, which is weaker but honest: what this week writes
// down, plus what another week's repeat claims for it.
function keysPresentInDay(
  planner: IPlannerProgram,
  weekIndex: number,
  rowIndex: number,
  settings: ISettings
): Set<string> {
  const { evaluatedWeeks } = PlannerProgram_evaluate(planner, settings);
  const evaluated = evaluatedWeeks[weekIndex]?.[rowIndex];
  if (evaluated?.success) {
    return new Set(evaluated.data.map((exercise) => exercise.key));
  }
  const result = new Set<string>();
  for (const block of exerciseBlocks(planner.weeks[weekIndex]?.days[rowIndex]?.exerciseText ?? "").blocks) {
    result.add(exerciseKey(block.fullName, settings));
  }
  // The repeats other weeks author on this row. Reading only this week's own text is what still
  // lost an exercise that lives here purely by inheritance — `Squat[1-2]` written in week 1 is in
  // week 2 as well, and week 2's text says nothing about it.
  planner.weeks.forEach((week, otherIndex) => {
    if (otherIndex === weekIndex) {
      return;
    }
    for (const repeat of exerciseRepeats(week.days[rowIndex]?.exerciseText ?? "")) {
      const range = repeat.range;
      if (range != null && weekIndex + 1 >= range[0] && weekIndex + 1 <= range[1]) {
        result.add(exerciseKey(repeat.fullName, settings));
      }
    }
  });
  return result;
}

// Every exercise the day shows in any week — what a move has to look at to know whether it is
// landing on top of something.
function keysShownInDay(planner: IPlannerProgram, rowIndex: number, settings: ISettings): Set<string> {
  return planner.weeks.reduce<Set<string>>((acc, _week, weekIndex) => {
    for (const key of keysPresentInDay(planner, weekIndex, rowIndex, settings)) {
      acc.add(key);
    }
    return acc;
  }, new Set());
}

// A day can hold the same exercise twice as long as labels tell them apart, so a move into a day
// that already has this one renames rather than refuses — and says so, because a name the user
// didn't choose is not something to discover later. Renaming means rewriting the line in every week
// that writes it, and every reuse that named it: a reuse that still says `Squat` would now resolve
// to the exercise that was already there, which is a different exercise wearing the right name.
// The first label of a fixed sequence that this day doesn't already use. Walking a sequence rather
// than rolling a random id is what keeps the transform pure: the grid runs it twice — once as the
// pre-flight that decides whether to dispatch at all, once for real — and a random label differs
// between the two, so the warning would name something the program never got.
//
// A word, not a letter. `superset: a` is how a superset group is written, and single-letter labels
// are what real programs use for those, so `a: Squat` would read as the wrong kind of thing
// entirely. Labels cap at 8 characters, which `alt` plus two digits stays well inside.
function freeLabel(taken: Set<string>, fullName: string, settings: ISettings): string | undefined {
  for (let attempt = 1; attempt <= 99; attempt += 1) {
    const label = attempt === 1 ? "alt" : `alt${attempt}`;
    if (!taken.has(exerciseKey(withLabel(fullName, label), settings))) {
      return label;
    }
  }
  return undefined;
}

function labelApart(
  planner: IPlannerProgram,
  move: IPlannerStructureExerciseMove,
  toRowIndex: number,
  taken: Set<string>,
  settings: ISettings
): { fullName: string; warning: string } | undefined {
  const label = freeLabel(taken, move.fullName, settings);
  if (label == null) {
    return undefined;
  }
  const fullName = withLabel(move.fullName, label);
  for (const week of planner.weeks) {
    const day = week.days[move.fromRowIndex];
    const span = day != null ? variationsSpan(day.exerciseText, move.fullName, settings) : undefined;
    if (day != null && span != null) {
      day.exerciseText = `${day.exerciseText.slice(0, span.from)}${fullName}${day.exerciseText.slice(span.to)}`;
    }
  }
  const dayName = planner.weeks.find((week) => week.days[toRowIndex] != null)?.days[toRowIndex]?.name;
  return {
    fullName,
    warning: `${dayName ?? `Day ${toRowIndex + 1}`} already had ${move.fullName}, so the one you moved now has label: ${fullName}.`,
  };
}

// What an exercise prescribes over and above its own sets. The evaluator hoists these across every
// line sharing a key, so they survive being written on one line only — which is exactly what makes
// them fragile when a key is split in two.
interface IHoistedSummary {
  progress: string;
  update: string;
  warmup: string;
  used: string;
}

function hoistedSummary(exercise: IPlannerProgramExercise): IHoistedSummary {
  return {
    progress: `${exercise.progress?.type ?? "-"}/${PlannerProgramExercise_getProgressScript(exercise) ?? "-"}`,
    update: `${exercise.update?.type ?? "-"}/${PlannerProgramExercise_getUpdateScript(exercise) ?? "-"}`,
    warmup: JSON.stringify(exercise.warmupSets ?? null),
    used: exercise.notused ? "none" : "-",
  };
}

function summaryForKey(planner: IPlannerProgram, key: string, settings: ISettings): IHoistedSummary | undefined {
  const { evaluatedWeeks } = PlannerProgram_evaluate(planner, settings);
  for (const week of evaluatedWeeks) {
    for (const day of week) {
      if (!day.success) {
        continue;
      }
      const exercise = day.data.find((e) => e.key === key);
      if (exercise != null) {
        return hoistedSummary(exercise);
      }
    }
  }
  return undefined;
}

// Labelling two same-named exercises apart makes them two keys, and a property written on only one
// of their lines then belongs to only one of them. The exercise that loses it keeps evaluating
// cleanly — it simply stops progressing — so nothing downstream catches it and the user finds out
// weeks later.
//
// Rather than trying to move the declaration to where it would be needed, this refuses. Reusing is
// what the language has for "same as that one", and a labelled copy could say `...Squat[1:2]` and
// inherit the lot — but a reuse target may not itself be reusing, which is exactly the case in the
// template-driven programs where this matters. Lifting that restriction is its own piece of work;
// until then a refusal the user can act on beats a silent loss they can't see.
function strandedByLabelling(
  before: IPlannerProgram,
  after: IPlannerProgram,
  relabels: { oldFullName: string; newFullName: string }[],
  settings: ISettings
): string | undefined {
  const properties: (keyof IHoistedSummary)[] = ["progress", "update", "warmup", "used"];
  for (const relabel of relabels) {
    const wanted = summaryForKey(before, exerciseKey(relabel.oldFullName, settings), settings);
    if (wanted == null) {
      continue;
    }
    for (const fullName of [relabel.newFullName, relabel.oldFullName]) {
      const got = summaryForKey(after, exerciseKey(fullName, settings), settings);
      const lost = got == null ? undefined : properties.find((property) => got[property] !== wanted[property]);
      if (lost != null) {
        return (
          `Both copies of ${relabel.oldFullName} share one ${lost}, and it is written on only one of their lines. ` +
          `Telling them apart by label would leave the other one without it. ` +
          `Give this one its own ${lost} first, or move it to a day that doesn't already have ${relabel.oldFullName}.`
        );
      }
    }
  }
  return undefined;
}

// Several exercises into the same day at once — what dragging a multi-selection does. They land
// together, in the order given, above the same anchor.
//
// Ones that are already in the destination day are left alone rather than repositioned: they are a
// reorder, not a move, and reordering is a different transform that keeps the day's fixed spans in
// place. The grid uses that one when the whole selection lives in the target day.
export function PlannerStructure_moveExercisesToDay(
  planner: IPlannerProgram,
  moves: IPlannerStructureExerciseMove[],
  toRowIndex: number,
  beforeFullName: string | undefined,
  settings: ISettings
): IPlannerStructureResult {
  const crossing = moves.filter((move) => move.fromRowIndex !== toRowIndex);
  if (crossing.length === 0) {
    return { success: true, data: planner };
  }
  // A ragged program can have the day in one week and not the other. Moving then would delete the
  // exercise from the week that has no destination for it, so refuse the whole thing rather than
  // silently losing a week's worth of work.
  // Which weeks actually *show* the exercise on this day — asked of the evaluator, not of the text.
  // A repeat backfills: `Squat[1-2]` authored in week 2 is visible in week 1, which holds no text
  // for it. Checking authored blocks alone missed exactly those weeks, and moving into a day they
  // don't have deleted the only copy without any evaluation error to catch it.
  const missing = new Set<number>();
  const homeless = new Set<string>();
  for (const move of crossing) {
    for (const weekIndex of weeksShowing(planner, move.fromRowIndex, move.fullName, settings)) {
      if (planner.weeks[weekIndex]?.days[toRowIndex] == null) {
        missing.add(weekIndex);
        homeless.add(move.fullName);
      }
    }
  }
  if (missing.size > 0) {
    const weeks = Array.from(missing).map((weekIndex) => planner.weeks[weekIndex].name);
    return {
      success: false,
      error: `${weeks.join(", ")} has no day to move ${Array.from(homeless).join(", ")} into.`,
    };
  }

  const result = ObjectUtils_clone(planner);
  // Everything that pointed at these exercises is rewritten before a single block moves, while the
  // exercise is still the only one of its name on the row it is leaving. Doing it afterwards can't
  // work: once it has landed next to an exercise of the same name, `Squat on day 2` names two
  // things and there is no way to tell which one a reuse meant.
  const warnings: string[] = [];
  const relabels: { oldFullName: string; newFullName: string }[] = [];
  const taken = keysShownInDay(planner, toRowIndex, settings);
  const landing = crossing.map((move) => {
    const relabeled = taken.has(exerciseKey(move.fullName, settings))
      ? labelApart(result, move, toRowIndex, taken, settings)
      : undefined;
    const fullName = relabeled?.fullName ?? move.fullName;
    if (relabeled != null) {
      warnings.push(relabeled.warning);
      relabels.push({ oldFullName: move.fullName, newFullName: relabeled.fullName });
    }
    taken.add(exerciseKey(fullName, settings));
    retargetDayReferences(
      result,
      { fullName: move.fullName, day: move.fromRowIndex + 1 },
      { fullName: relabeled?.fullName, day: toRowIndex + 1 },
      settings
    );
    return { ...move, fullName };
  });

  let moved = false;
  for (const week of result.weeks) {
    const toDay = week.days[toRowIndex];
    if (toDay == null) {
      continue;
    }
    const blocks: IExerciseBlock[] = [];
    for (const move of landing) {
      const fromDay = week.days[move.fromRowIndex];
      if (fromDay == null) {
        continue;
      }
      const from = exerciseBlocks(fromDay.exerciseText);
      const block = from.blocks.find((b) => sameExercise(b.fullName, move.fullName, settings));
      if (block == null) {
        continue;
      }
      fromDay.exerciseText = joinBlocks(withoutBlock(from, from.blocks.indexOf(block)), fromDay.exerciseText);
      blocks.push(block);
      moved = true;
    }
    if (blocks.length === 0) {
      continue;
    }
    // The anchor is resolved after the removals, since one of them may have been above it.
    let to = exerciseBlocks(toDay.exerciseText);
    const anchor =
      beforeFullName != null ? to.blocks.findIndex((b) => sameExercise(b.fullName, beforeFullName, settings)) : -1;
    let at = anchor === -1 ? to.blocks.length : anchor;
    for (const block of blocks) {
      to = withBlockAt(to, at, block);
      at += 1;
    }
    toDay.exerciseText = joinBlocks(to, toDay.exerciseText);
  }
  if (!moved) {
    return { success: false, error: `Couldn't find ${crossing.map((m) => m.fullName).join(", ")} in that day.` };
  }
  // A forced order was written for the day the exercise is leaving and means something else in the
  // one it lands in — `Squat[1]` dropped at the top of an unnumbered day sorts to the bottom of it,
  // since an absent number counts as 0. Both ends are reconciled: the row it left can be holding
  // numbers that no longer say anything now that one of them has gone.
  const normalized = Array.from(new Set([toRowIndex, ...crossing.map((move) => move.fromRowIndex)])).reduce(
    (acc, row) => PlannerStructure_normalizeOrdersInDay(acc, row, settings),
    result
  );
  // The addresses were rewritten above and a same-named neighbour was labelled apart, so what is
  // left for this to catch is what neither could anticipate — a `used: none` template redeclared,
  // a property the two copies now disagree about.
  const checked = refuseIfWorse(planner, normalized, settings);
  if (!checked.success) {
    return checked;
  }
  // And then the loss that evaluates perfectly well, so nothing above can see it.
  const stranded = strandedByLabelling(planner, normalized, relabels, settings);
  if (stranded != null) {
    return { success: false, error: stranded };
  }
  return withWarnings(checked, warnings);
}

export interface IPlannerStructureExerciseTarget {
  week: number;
  dayInWeek: number;
  fullName: string;
}

// Deletes exercises, by splicing their lines out of the text like every other transform here.
export function PlannerStructure_deleteExercises(
  planner: IPlannerProgram,
  targets: IPlannerStructureExerciseTarget[],
  settings: ISettings
): IPlannerStructureResult {
  // Deleting an exercise that others reuse orphans them, and materializing the reusers is separate
  // work, so this refuses rather than quietly breaking the program.
  const sources = reusedNames(planner, settings);
  const blocked = targets.filter((t) => sources.has(t.fullName)).map((t) => t.fullName);
  if (blocked.length > 0) {
    const names = Array.from(new Set(blocked));
    return {
      success: false,
      error: `${names.join(", ")} ${names.length === 1 ? "is" : "are"} reused by other exercises. Change those to stop reusing it first.`,
    };
  }

  // Splice the line out of the day it is written in. That is the whole operation: a repeat has no
  // text of its own, so removing the line removes every week it repeated into, and a week that
  // writes its own line — an override, or an independently written week — is a different line and
  // is left alone.
  //
  // This used to delete from the *evaluated* program and print the result back through
  // ProgramToPlanner, which rewrote the entire program: a delete of an exercise that wasn't even
  // there still reformatted every day. Editing the text the author wrote is the only way to leave
  // the rest of it as they wrote it.
  const result = ObjectUtils_clone(planner);
  for (const target of targets) {
    const day = result.weeks[target.week - 1]?.days[target.dayInWeek - 1];
    if (day == null) {
      continue;
    }
    const document = exerciseBlocks(day.exerciseText);
    const index = document.blocks.findIndex((b) => sameExercise(b.fullName, target.fullName, settings));
    if (index === -1) {
      continue;
    }
    day.exerciseText = joinBlocks(withoutBlock(document, index), day.exerciseText);
  }
  return refuseIfWorse(planner, result, settings);
}

// Every exercise name that something else reuses, anywhere in the program.
function reusedNames(planner: IPlannerProgram, settings: ISettings): Set<string> {
  const { evaluatedWeeks } = PlannerProgram_evaluate(planner, settings);
  const result = new Set<string>();
  for (const week of evaluatedWeeks) {
    for (const day of week) {
      if (!day.success) {
        continue;
      }
      for (const exercise of day.data) {
        if (exercise.reuse?.fullName != null) {
          result.add(exercise.reuse.fullName);
        }
        // A description can reuse another exercise's description (`// ...Squat`) just as sets can
        // reuse its sets. Deleting the source leaves the dependent description as the literal text
        // `...Squat`, which the evaluator no longer resolves and no longer complains about — so
        // nothing downstream catches it and the author's note is simply gone.
        if (exercise.descriptions?.reuse?.fullName != null) {
          result.add(exercise.descriptions.reuse.fullName);
        }
      }
    }
  }
  return result;
}

// Appends a day to one week. The grid offers this per column, so a program can deliberately have
// weeks of different lengths; appending moves no existing slot, so nothing that points at one has
// to be rewritten.
export function PlannerStructure_addDay(
  planner: IPlannerProgram,
  weekIndex: number,
  settings: ISettings
): IPlannerStructureResult {
  const result = ObjectUtils_clone(planner);
  const week = result.weeks[weekIndex];
  if (week == null) {
    return { success: false, error: "That week is gone." };
  }
  week.days.push({ name: `Day ${week.days.length + 1}`, exerciseText: "" });
  return refuseIfWorse(planner, result, settings);
}

// Appends an empty week, named so it collides with nothing.
export function PlannerStructure_addWeek(planner: IPlannerProgram, settings: ISettings): IPlannerStructureResult {
  const result = ObjectUtils_clone(planner);
  result.weeks.push({ name: uniqueWeekName(planner, `Week ${result.weeks.length + 1}`), days: [] });
  return refuseIfWorse(planner, result, settings);
}

// The weeks whose copy of this day prescribes the exercise, whether it is written there or arrives
// by a repeat — "where does this appear", which is a different question from where it is authored.
function weeksShowing(planner: IPlannerProgram, rowIndex: number, fullName: string, settings: ISettings): number[] {
  const key = exerciseKey(fullName, settings);
  return planner.weeks.reduce<number[]>(
    (acc, _week, weekIndex) =>
      keysPresentInDay(planner, weekIndex, rowIndex, settings).has(key) ? [...acc, weekIndex] : acc,
    []
  );
}

// Moves a whole day row. Every week is permuted identically, which is what keeps this a renumber
// rather than a desync: after it, day slot N means the same thing in every week, and the qualifiers
// that named the old positions are rewritten to the new ones.
export function PlannerStructure_moveDayRow(
  planner: IPlannerProgram,
  fromIndex: number,
  toIndex: number,
  settings: ISettings
): IPlannerStructureResult {
  return PlannerStructure_moveDayRows(planner, [fromIndex], toIndex, settings);
}

// The same for several rows at once, which is what dragging a multi-row selection does. `insertAt`
// counts the rows that stay, not the rows there are now — the block is lifted out before it lands,
// so an index into the original list would mean something different depending on how many of the
// dragged rows were above it.
export function PlannerStructure_moveDayRows(
  planner: IPlannerProgram,
  fromIndexes: number[],
  insertAt: number,
  settings: ISettings
): IPlannerStructureResult {
  const rows = planner.weeks.reduce((max, week) => Math.max(max, week.days.length), 0);
  // Sorted, so the block keeps the order it is drawn in whichever of its rows the drag started from.
  const moved = Array.from(new Set(fromIndexes))
    .filter((index) => index >= 0 && index < rows)
    .sort((a, b) => a - b);
  const remaining = Array.from({ length: rows }, (_, i) => i).filter((index) => moved.indexOf(index) === -1);
  const at = Math.max(0, Math.min(remaining.length, insertAt));
  const oldOrder = [...remaining.slice(0, at), ...moved, ...remaining.slice(at)];
  if (moved.length === 0 || oldOrder.every((oldIndex, index) => oldIndex === index)) {
    return { success: true, data: planner };
  }
  const result = ObjectUtils_clone(planner);
  // A week that lacks one of the rows keeps the days it has, compacted — so the permutation lands
  // differently there, and a short week may not move at all. Renumbering every week's references
  // with one global map is what silently repointed a reuse at a different day.
  const survivorsPerWeek = result.weeks.map((week) => oldOrder.filter((oldIndex) => week.days[oldIndex] != null));
  const mapPerWeek = survivorsPerWeek.map((survivors) => {
    const map = new Map<number, number>();
    survivors.forEach((oldIndex, newIndex) => map.set(oldIndex + 1, newIndex + 1));
    return map;
  });
  const newDayForOldInWeek = (week: number): Map<number, number> => mapPerWeek[week - 1] ?? new Map();
  result.weeks.forEach((week, weekIndex) => {
    const original = week.days;
    week.days = survivorsPerWeek[weekIndex].map((oldIndex) => original[oldIndex]);
    for (const day of week.days) {
      day.exerciseText = remapDayReferences(day.exerciseText, weekIndex + 1, newDayForOldInWeek);
    }
  });
  return refuseIfWorse(planner, result, settings);
}

function remapDayReferences(
  text: string,
  containingWeek: number,
  newDayForOldInWeek: (week: number) => Map<number, number>
): string {
  const references = dayReferences(text);
  let result = text;
  for (const reference of references.slice().sort((a, b) => b.node.from - a.node.from)) {
    // `[2]` means day 2 of the week it is written in; `[1:2]` means day 2 of week 1. They renumber
    // by different maps whenever the two weeks hold different rows.
    const next = newDayForOldInWeek(reference.week ?? containingWeek).get(reference.day);
    if (next != null && next !== reference.day) {
      result = `${result.slice(0, reference.node.from)}${next}${result.slice(reference.node.to)}`;
    }
  }
  return result;
}

// Which week's copy of this day actually declares the exercise: the run's own week when it holds
// the text, otherwise the week whose repeat claims that week. Returns a 0-based index.
function findAuthoringWeek(
  planner: IPlannerProgram,
  runStart: { week: number; dayInWeek: number },
  fullName: string,
  settings: ISettings
): number | undefined {
  const dayIndex = runStart.dayInWeek - 1;
  const declares = (weekIndex: number): boolean => {
    const text = planner.weeks[weekIndex]?.days[dayIndex]?.exerciseText;
    return text != null && findExerciseLine(text, fullName) != null;
  };
  if (declares(runStart.week - 1)) {
    return runStart.week - 1;
  }
  return planner.weeks.reduce<number | undefined>((found, _week, weekIndex) => {
    if (found != null || !declares(weekIndex)) {
      return found;
    }
    const repeat = exerciseRepeats(planner.weeks[weekIndex].days[dayIndex].exerciseText).find((r) =>
      sameExercise(r.fullName, fullName, settings)
    );
    const range = repeat?.range;
    return range != null && runStart.week >= range[0] && runStart.week <= range[1] ? weekIndex : found;
  }, undefined);
}

// Changes how many weeks an exercise repeats for, by rewriting the `[from-to]` token on the line
// that declares it and nothing else. The later weeks hold no text for a repeated exercise — the
// evaluator synthesizes them from the range — so this is the whole edit: no other line moves, and a
// week that has its own definition inside the new range stays put and reads as an override.
//
// What a week says about this exercise, with the repeat token taken off — two weeks that draw as
// one strip say the same thing and differ only in the range they claim.
function declaredText(text: string, fullName: string, settings: ISettings): string | undefined {
  const block = exerciseBlocks(text).blocks.find((b) => sameExercise(b.fullName, fullName, settings));
  return block == null ? undefined : stripRepeats(block.text).trim();
}

// Which weeks write this exercise out themselves, as opposed to inheriting it from a repeat.
function weeksDeclaring(planner: IPlannerProgram, dayIndex: number, fullName: string, settings: ISettings): number[] {
  return planner.weeks.reduce<number[]>((acc, week, weekIndex) => {
    const text = week.days[dayIndex]?.exerciseText ?? "";
    const declares = exerciseBlocks(text).blocks.some((b) => sameExercise(b.fullName, fullName, settings));
    return declares ? [...acc, weekIndex] : acc;
  }, []);
}

// `toWeek` equal to `runStart.week` drops the repeat entirely, leaving the exercise in its own week.
//
// `runStart` is where the *run* begins, which is where the grid draws the strip — not necessarily
// where the line is written. A repeat can back-fill: `Squat[1-3]` authored in week 2 shows from
// week 1, and week 1 holds no text for it. So the line is searched for rather than assumed, or
// dragging that strip's edge silently does nothing.
export function PlannerStructure_setRepeatRange(
  planner: IPlannerProgram,
  runStart: { week: number; dayInWeek: number },
  runEnd: number,
  fullName: string,
  toWeek: number,
  settings: ISettings
): IPlannerStructureResult {
  const result = ObjectUtils_clone(planner);
  const authored = findAuthoringWeek(result, runStart, fullName, settings);
  const day = authored != null ? result.weeks[authored]?.days[runStart.dayInWeek - 1] : undefined;
  if (authored == null || day == null) {
    return { success: false, error: `Couldn't find where ${fullName} is defined.` };
  }
  // Identical weeks draw as one strip even when each is written out separately, and *shrinking*
  // such a strip cannot be done by editing one line: the weeks being dragged off still write the
  // exercise out themselves, so the strip comes back unchanged and the drag reads as having done
  // nothing. Extending is fine — the weeks it grows over keep their own lines, which simply become
  // overrides of the wider range.
  //
  // Only lines identical to the one being resized count. A week saying something different is an
  // override, and resizing around one is exactly what this is expected to handle. The line being
  // resized is excluded too: when it sits outside the new range it gets relocated below, which is
  // the back-filled case rather than a second line.
  const resized = declaredText(day.exerciseText, fullName, settings);
  const stranded = weeksDeclaring(result, runStart.dayInWeek - 1, fullName, settings).filter((weekIndex) => {
    const week = weekIndex + 1;
    const droppedByShrink = week > toWeek && week <= runEnd;
    const text = result.weeks[weekIndex].days[runStart.dayInWeek - 1]?.exerciseText ?? "";
    return weekIndex !== authored && droppedByShrink && declaredText(text, fullName, settings) === resized;
  });
  if (stranded.length > 0) {
    const writtenIn = [authored, ...stranded].sort((a, b) => a - b);
    const names = writtenIn.map((weekIndex) => result.weeks[weekIndex].name).join(", ");
    return {
      success: false,
      error: `${fullName} is written out separately in ${names}, so this run can't be resized as one. Edit those weeks individually.`,
    };
  }
  const text = day.exerciseText;
  const line = findExerciseLine(text, fullName);
  if (line == null) {
    return { success: false, error: `Couldn't find where ${fullName} is defined.` };
  }
  const order = line.repeatNode != null ? orderOf(line.repeatNode, text) : undefined;
  const parts: string[] = [];
  if (order != null && order !== 0) {
    parts.push(`${order}`);
  }
  if (toWeek > runStart.week) {
    parts.push(`${runStart.week}-${toWeek}`);
  }
  const token = parts.length > 0 ? `[${parts.join(",")}]` : "";
  const from = line.repeatNode?.from ?? line.variationsEnd;
  const to = line.repeatNode?.to ?? line.variationsEnd;
  day.exerciseText = `${text.slice(0, from)}${token}${text.slice(to)}`;

  // Shrinking a backfilled repeat can pull the range off the week the line is written in —
  // `Squat[1-3]` authored in week 2, dragged back to end at week 1. Rewriting the token in place
  // would leave the exercise sitting in week 2, i.e. moving it a week to the right instead of
  // shortening it. The line follows its own range.
  const coversAuthored = authored + 1 >= runStart.week && authored + 1 <= Math.max(toWeek, runStart.week);
  if (!coversAuthored) {
    const target = result.weeks[runStart.week - 1]?.days[runStart.dayInWeek - 1];
    const source = exerciseBlocks(day.exerciseText);
    const index = source.blocks.findIndex((b) => sameExercise(b.fullName, fullName, settings));
    const destination = target != null ? exerciseBlocks(target.exerciseText) : undefined;
    // A destination that already declares the exercise is an override that owns that week; leaving
    // the line where it is beats writing the same exercise into one day twice.
    if (target == null || index === -1) {
      return { success: false, error: `Couldn't move ${fullName} back to week ${runStart.week}.` };
    }
    if (destination == null || destination.blocks.some((b) => sameExercise(b.fullName, fullName, settings))) {
      return {
        success: false,
        error: `Week ${runStart.week} already has its own ${fullName}, so this run can't shrink onto it.`,
      };
    }
    const block = source.blocks[index];
    day.exerciseText = joinBlocks(withoutBlock(source, index), day.exerciseText);
    target.exerciseText = joinBlocks(
      withBlockAt(destination, Math.min(index, destination.blocks.length), block),
      target.exerciseText
    );
  }
  // A range may name a week the day doesn't exist in — the text takes it, and nothing appears,
  // because there is no day there to appear in. Extending onto nothing but those weeks changes the
  // program without changing anything on screen, which reads as the drag having failed rather than
  // as the program being ragged. Say so; the range is still worth writing, since the exercise turns
  // up on its own once the day does.
  const gained: number[] = [];
  for (let week = runEnd + 1; week <= toWeek; week += 1) {
    gained.push(week);
  }
  const dayless = gained.filter((week) => result.weeks[week - 1]?.days[runStart.dayInWeek - 1] == null);
  const warnings =
    gained.length > 0 && dayless.length === gained.length
      ? [
          `No ${day.name} in ${dayless.map((week) => result.weeks[week - 1].name).join(", ")}, so ${fullName} won't show up there yet. The repeat runs through ${result.weeks[toWeek - 1]?.name ?? `week ${toWeek}`} - add that day and it will.`,
        ]
      : [];
  return withWarnings({ success: true, data: result }, warnings);
}
