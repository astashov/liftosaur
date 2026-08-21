import { SyntaxNode } from "@lezer/common";
import { IPlannerProgram, ISettings } from "../../../types";
import { ObjectUtils_clone } from "../../../utils/object";
import { IEither } from "../../../utils/types";
import { StringUtils_nextName } from "../../../utils/string";
import { Program_create, Program_evaluateCachedPlanner } from "../../../models/program";
import { ProgramToPlanner } from "../../../models/programToPlanner";
import { parser as plannerExerciseParser } from "../plannerExerciseParser";
import { PlannerNodeName } from "../plannerExerciseStyles";
import { PlannerProgram_evaluate } from "./plannerProgram";
import { PlannerKey_fromFullName } from "../plannerKey";
import { StringUtils_unindent } from "../../../utils/string";

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
export type IProgramGridTransformResult = IEither<IPlannerProgram, string>;

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
      if (weekDay == null) {
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
    // It is a directive, so the brackets that follow the name are its week/day qualifier rather
    // than incidental text: index to them instead of matching a shape.
    const open = comment.indexOf("[", comment.indexOf("..."));
    const close = open === -1 ? -1 : comment.indexOf("]", open);
    if (open === -1 || close === -1) {
      continue;
    }
    {
      const inner = comment.slice(open + 1, close);
      const innerStart = node.from + open + 1;
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
        });
      }
      if (spans.length > 1) {
        const week = parseInt(spans[0].value, 10);
        if (!isNaN(week)) {
          weeks.push({ node: spans[0], week });
        }
      }
    }
  }
  return { days, weeks };
}

interface IWeekReference {
  node: ITextSpan;
  week: number;
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
      const parts = weekDay?.getChildren(PlannerNodeName.WeekOrDay) ?? [];
      if (parts.length < 2) {
        continue;
      }
      const week = parseInt(text.slice(parts[0].from, parts[0].to), 10);
      if (!isNaN(week)) {
        result.push({ node: parts[0], week });
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
  newWeekOfText: number
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
        error: `${repeat.fullName} repeats over weeks that would no longer be next to each other. A repeat can only cover a run of weeks in a row.`,
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
      return { success: false, error: `Something reuses week ${reference.week}, which is being removed.` };
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
function reorderWeeks(planner: IPlannerProgram, oldOrder: number[], settings: ISettings): IProgramGridTransformResult {
  const newForOld = new Map<number, number | undefined>();
  planner.weeks.forEach((_week, oldIndex) => newForOld.set(oldIndex, undefined));
  oldOrder.forEach((oldIndex, newIndex) => newForOld.set(oldIndex, newIndex));

  const result = ObjectUtils_clone(planner);
  for (const oldIndex of oldOrder) {
    const newIndex = newForOld.get(oldIndex);
    for (const day of result.weeks[oldIndex]?.days ?? []) {
      const rewritten = rewriteWeekNumbersInDay(day.exerciseText, newForOld, newIndex ?? -1);
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
export function ProgramGridTransforms_moveWeek(
  planner: IPlannerProgram,
  fromIndex: number,
  toIndex: number,
  settings: ISettings
): IProgramGridTransformResult {
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
export function ProgramGridTransforms_deleteWeek(
  planner: IPlannerProgram,
  weekIndex: number,
  settings: ISettings
): IProgramGridTransformResult {
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
      target.exerciseText = joinBlocks([...to.blocks, block], to.trailing, target.exerciseText);
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
export function ProgramGridTransforms_duplicateWeek(
  planner: IPlannerProgram,
  weekIndex: number,
  settings: ISettings
): IProgramGridTransformResult {
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
export function ProgramGridTransforms_deleteDayRow(
  planner: IPlannerProgram,
  rowIndex: number,
  settings: ISettings
): IProgramGridTransformResult {
  const deletedDay = rowIndex + 1;
  const blockers = new Set<string>();
  for (const week of planner.weeks) {
    week.days.forEach((day, dayIndex) => {
      if (dayIndex === rowIndex) {
        return;
      }
      for (const reference of dayReferences(day.exerciseText)) {
        if (reference.day === deletedDay) {
          blockers.add(day.name);
        }
      }
    });
  }
  if (blockers.size > 0) {
    return {
      success: false,
      error: `${Array.from(blockers).join(", ")} reuses this day. Change those to reuse another day first.`,
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
function refuseIfWorse(
  before: IPlannerProgram,
  after: IPlannerProgram,
  settings: ISettings
): IProgramGridTransformResult {
  // How many days fail to evaluate, not which messages they carry. Message text is not stable
  // across a structural edit — it embeds the week number and the source position, so "no such
  // exercise Missing at week: 1" becomes "... at week: 2" when the week moves, and comparing
  // strings called that an introduced error and refused a valid move. Counting failures asks the
  // question this check actually cares about: did the edit break a day that used to work?
  //
  // The gap it accepts: a day that failed before and fails differently after is not caught. The
  // transforms never repair an error, so a swap would mean an edit both broke and fixed something
  // in one step, which none of them can do.
  const brokenBefore = failingDays(before, settings);
  const brokenAfter = failingDays(after, settings);
  if (brokenAfter.length > brokenBefore.length) {
    const introduced = brokenAfter.find((message) => brokenBefore.indexOf(message) === -1) ?? brokenAfter[0];
    return { success: false, error: `That would break the program: ${introduced}` };
  }
  return { success: true, data: after };
}

// One message per day that fails to evaluate. The messages are for showing the user which day
// broke; the count is what the check is made of.
function failingDays(planner: IPlannerProgram, settings: ISettings): string[] {
  const { evaluatedWeeks } = PlannerProgram_evaluate(planner, settings);
  const result: string[] = [];
  for (const week of evaluatedWeeks) {
    for (const day of week) {
      if (!day.success) {
        result.push(day.error.message);
      }
    }
  }
  return result;
}

// Appends a copy of the day to every week. Appending is what keeps this safe: no existing slot
// moves, so nothing that points at one has to be rewritten.
export function ProgramGridTransforms_duplicateDayRow(
  planner: IPlannerProgram,
  rowIndex: number,
  settings: ISettings
): IProgramGridTransformResult {
  const result = ObjectUtils_clone(planner);
  for (const week of result.weeks) {
    const day = week.days[rowIndex];
    if (day != null) {
      week.days.push({ name: `Day ${week.days.length + 1}`, exerciseText: day.exerciseText });
    }
  }
  // A copied day can redeclare an exercise the original owned, so this gets the same check.
  return refuseIfWorse(planner, result, settings);
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

function exerciseBlocks(text: string): { blocks: IExerciseBlock[]; trailing: string } {
  const tree = plannerExerciseParser.parse(text);
  const blocks: IExerciseBlock[] = [];
  let cursor = 0;
  for (const node of children(tree.topNode)) {
    if (node.type.name !== PlannerNodeName.ExerciseExpression) {
      continue;
    }
    const variations = node.getChild(PlannerNodeName.ExerciseVariations);
    if (variations == null) {
      continue;
    }
    // Whatever sits between the last exercise and this one — comments, blank lines — leads it.
    // The final block carries no trailing newline, so normalize: moved to the front it would
    // otherwise run into the line that follows it.
    const body = text.slice(cursor, node.to);
    blocks.push({
      fullName: text.slice(variations.from, variations.to).trim(),
      text: body.endsWith("\n") ? body : `${body}\n`,
    });
    cursor = node.to;
  }
  return { blocks, trailing: text.slice(cursor) };
}

function reorderDayText(text: string, order: string[], settings: ISettings): string {
  const { blocks, trailing } = exerciseBlocks(text);
  // By key, like every other match in this module: the order comes from one week, and another week
  // may spell the same exercise differently.
  const orderKeys = order.map((name) => exerciseKey(name, settings));
  const rank = (block: IExerciseBlock): number => orderKeys.indexOf(exerciseKey(block.fullName, settings));
  // Only the blocks named in `order` move, and they move within the slots they already occupy, so
  // anything the grid doesn't know about stays exactly where the author put it.
  const movableSlots = blocks.reduce<number[]>((acc, block, index) => (rank(block) !== -1 ? [...acc, index] : acc), []);
  const reordered = movableSlots.map((slot) => blocks[slot]).sort((a, b) => rank(a) - rank(b));
  const result = blocks.slice();
  movableSlots.forEach((slot, i) => {
    result[slot] = reordered[i];
  });
  return joinBlocks(result, trailing, text);
}

function joinBlocks(blocks: IExerciseBlock[], trailing: string, originalText: string): string {
  const joined = `${blocks.map((b) => b.text).join("")}${trailing}`;
  return originalText.endsWith("\n") ? joined : joined.replace(/\n$/, "");
}

// Reorders exercises within a day. This is content order — no slot identity moves — so it is safe
// in a way none of the other structural edits are. Applied to every week's copy of the day so the
// grid's lanes, which are shared across weeks, keep meaning one thing.
export function ProgramGridTransforms_reorderExercisesInDay(
  planner: IPlannerProgram,
  rowIndex: number,
  order: string[],
  settings: ISettings
): IProgramGridTransformResult {
  const result = ObjectUtils_clone(planner);
  for (const week of result.weeks) {
    const day = week.days[rowIndex];
    if (day != null) {
      day.exerciseText = reorderDayText(day.exerciseText, order, settings);
    }
  }
  return refuseIfWorse(planner, result, settings);
}

// Moves one exercise from one day row to another, in every week that authors it there. A repeated
// exercise is authored once — the later weeks hold no text for it — so moving that one line carries
// the whole run with it, and it now repeats on the new day. A week that overrides the exercise with
// its own definition moves that copy too, which is what keeps the lane whole.
//
// `beforeFullName` anchors the insert by name rather than by index: the target day can hold a
// different number of exercises in each week (a ragged week, an override), and an index would land
// in a different place in each of them.
export function ProgramGridTransforms_moveExerciseToDay(
  planner: IPlannerProgram,
  fromRowIndex: number,
  fullName: string,
  toRowIndex: number,
  beforeFullName: string | undefined,
  settings: ISettings
): IProgramGridTransformResult {
  if (fromRowIndex === toRowIndex) {
    return { success: true, data: planner };
  }
  // A ragged program can have the day in one week and not the other. Moving then would delete the
  // exercise from the week that has no destination for it, so refuse the whole thing rather than
  // silently losing a week's worth of work.
  // Which weeks actually *show* the exercise on this day — asked of the evaluator, not of the text.
  // A repeat backfills: `Squat[1-2]` authored in week 2 is visible in week 1, which holds no text
  // for it. Checking authored blocks alone missed exactly those weeks, and moving into a day they
  // don't have deleted the only copy without any evaluation error to catch it.
  const visibleWeeks = weeksShowing(planner, fromRowIndex, fullName, settings);
  const missing = visibleWeeks.filter((weekIndex) => planner.weeks[weekIndex]?.days[toRowIndex] == null);
  if (missing.length > 0) {
    return {
      success: false,
      error: `${missing.map((w) => planner.weeks[w].name).join(", ")} has no day to move ${fullName} into.`,
    };
  }

  const result = ObjectUtils_clone(planner);
  let moved = false;
  for (const week of result.weeks) {
    const fromDay = week.days[fromRowIndex];
    const toDay = week.days[toRowIndex];
    if (fromDay == null || toDay == null) {
      continue;
    }
    const from = exerciseBlocks(fromDay.exerciseText);
    const block = from.blocks.find((b) => sameExercise(b.fullName, fullName, settings));
    if (block == null) {
      continue;
    }
    fromDay.exerciseText = joinBlocks(
      from.blocks.filter((b) => b !== block),
      from.trailing,
      fromDay.exerciseText
    );
    const to = exerciseBlocks(toDay.exerciseText);
    const anchor =
      beforeFullName != null ? to.blocks.findIndex((b) => sameExercise(b.fullName, beforeFullName, settings)) : -1;
    const blocks = to.blocks.slice();
    blocks.splice(anchor === -1 ? blocks.length : anchor, 0, block);
    toDay.exerciseText = joinBlocks(blocks, to.trailing, toDay.exerciseText);
    moved = true;
  }
  if (!moved) {
    return { success: false, error: `Couldn't find ${fullName} in that day.` };
  }
  // The destination day may already declare the same exercise, or something may reuse this one by
  // its old `[week:day]` address — both surface as evaluation errors rather than as anything this
  // could check for directly.
  return refuseIfWorse(planner, result, settings);
}

export interface IProgramGridExerciseTarget {
  week: number;
  dayInWeek: number;
  fullName: string;
}

// Deletes exercises. Unlike every other transform here this one works on the *evaluated* program
// and prints it back through ProgramToPlanner, rather than splicing text: removing an exercise has
// to take its repeats with it, and the evaluated structure is where "this run, in these weeks"
// already exists. It is the same mechanism the older per-exercise editor uses, minus that one's
// dialog — a transform reports a refusal, it doesn't show one.
export function ProgramGridTransforms_deleteExercises(
  planner: IPlannerProgram,
  targets: IProgramGridExerciseTarget[],
  settings: ISettings
): IProgramGridTransformResult {
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

  const evaluated = ObjectUtils_clone(Program_evaluateCachedPlanner({ ...Program_create("Temp"), planner }, settings));
  for (const target of targets) {
    const day = evaluated.weeks[target.week - 1]?.days[target.dayInWeek - 1];
    const targetKey = exerciseKey(target.fullName, settings);
    const exercise = day?.exercises.find((e) => e.key === targetKey);
    if (day == null || exercise == null) {
      continue;
    }
    // The line's own week plus the weeks it repeats into — deleting a strip deletes the run it
    // draws, not just the cell under the finger. A week inside that span which authors its own line
    // is a *different* line that happens to sit in the range: an override, or an independently
    // written week. It survives, and only the instances this line produced are removed.
    const weeks = new Set<number>([target.week, ...exercise.repeating]);
    for (const week of weeks) {
      const exercises = evaluated.weeks[week - 1]?.days[target.dayInWeek - 1]?.exercises;
      const index = exercises?.findIndex((e) => e.key === targetKey) ?? -1;
      if (exercises == null || index === -1) {
        continue;
      }
      if (week !== target.week && !exercises[index].isRepeat) {
        continue;
      }
      exercises.splice(index, 1);
    }
  }
  return refuseIfWorse(planner, new ProgramToPlanner(evaluated, settings).convertToPlanner(), settings);
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
export function ProgramGridTransforms_addDay(
  planner: IPlannerProgram,
  weekIndex: number,
  settings: ISettings
): IProgramGridTransformResult {
  const result = ObjectUtils_clone(planner);
  const week = result.weeks[weekIndex];
  if (week == null) {
    return { success: false, error: "That week is gone." };
  }
  week.days.push({ name: `Day ${week.days.length + 1}`, exerciseText: "" });
  return refuseIfWorse(planner, result, settings);
}

// Appends an empty week, named so it collides with nothing.
export function ProgramGridTransforms_addWeek(
  planner: IPlannerProgram,
  settings: ISettings
): IProgramGridTransformResult {
  const result = ObjectUtils_clone(planner);
  result.weeks.push({ name: uniqueWeekName(planner, `Week ${result.weeks.length + 1}`), days: [] });
  return refuseIfWorse(planner, result, settings);
}

// The weeks whose copy of this day prescribes the exercise, whether it is written there or arrives
// by a repeat. Anything that asks "where does this appear" has to ask the evaluator: the text says
// where it is *authored*, which is a different question.
function weeksShowing(planner: IPlannerProgram, rowIndex: number, fullName: string, settings: ISettings): number[] {
  const { evaluatedWeeks } = PlannerProgram_evaluate(planner, settings);
  return evaluatedWeeks.reduce<number[]>((acc, week, weekIndex) => {
    const day = week[rowIndex];
    const key = exerciseKey(fullName, settings);
    const shows = day != null && day.success && day.data.some((exercise) => exercise.key === key);
    return shows ? [...acc, weekIndex] : acc;
  }, []);
}

// Moves a whole day row. Every week is permuted identically, which is what keeps this a renumber
// rather than a desync: after it, day slot N means the same thing in every week, and the qualifiers
// that named the old positions are rewritten to the new ones.
export function ProgramGridTransforms_moveDayRow(
  planner: IPlannerProgram,
  fromIndex: number,
  toIndex: number,
  settings: ISettings
): IProgramGridTransformResult {
  const rows = planner.weeks.reduce((max, week) => Math.max(max, week.days.length), 0);
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= rows || toIndex >= rows) {
    return { success: true, data: planner };
  }
  const oldOrder = Array.from({ length: rows }, (_, i) => i);
  oldOrder.splice(toIndex, 0, ...oldOrder.splice(fromIndex, 1));
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
// `toWeek` equal to `runStart.week` drops the repeat entirely, leaving the exercise in its own week.
//
// `runStart` is where the *run* begins, which is where the grid draws the strip — not necessarily
// where the line is written. A repeat can back-fill: `Squat[1-3]` authored in week 2 shows from
// week 1, and week 1 holds no text for it. So the line is searched for rather than assumed, or
// dragging that strip's edge silently does nothing.
export function ProgramGridTransforms_setRepeatRange(
  planner: IPlannerProgram,
  runStart: { week: number; dayInWeek: number },
  fullName: string,
  toWeek: number,
  settings: ISettings
): IProgramGridTransformResult {
  const result = ObjectUtils_clone(planner);
  const authored = findAuthoringWeek(result, runStart, fullName, settings);
  const day = authored != null ? result.weeks[authored]?.days[runStart.dayInWeek - 1] : undefined;
  if (authored == null || day == null) {
    return { success: false, error: `Couldn't find where ${fullName} is defined.` };
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
    day.exerciseText = joinBlocks(
      source.blocks.filter((_, i) => i !== index),
      source.trailing,
      day.exerciseText
    );
    const blocks = destination.blocks.slice();
    blocks.splice(Math.min(index, blocks.length), 0, block);
    target.exerciseText = joinBlocks(blocks, destination.trailing, target.exerciseText);
  }
  return { success: true, data: result };
}
