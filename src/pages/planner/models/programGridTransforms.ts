import { SyntaxNode } from "@lezer/common";
import { IPlannerProgram, ISettings } from "../../../types";
import { ObjectUtils_clone } from "../../../utils/object";
import { parser as plannerExerciseParser } from "../plannerExerciseParser";
import { PlannerNodeName } from "../plannerExerciseStyles";
import { PlannerProgram_evaluate } from "./plannerProgram";

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

export type IProgramGridTransformResult =
  | { ok: true; planner: IPlannerProgram }
  // Named so the UI can say which exercise stands in the way rather than just refusing.
  | { ok: false; reason: string };

interface IDayReference {
  node: SyntaxNode;
  day: number;
  hasWeek: boolean;
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
      if (!isNaN(day)) {
        result.push({ node: dayNode, day, hasWeek: parts.length > 1 });
      }
    }
  }
  return result;
}

function renumberDayReferences(text: string, deletedDay: number): string {
  const references = dayReferences(text).filter((r) => r.day > deletedDay);
  let result = text;
  // Back to front so earlier splices don't move later offsets.
  for (const reference of references.slice().reverse()) {
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
      ok: false,
      reason: `${Array.from(blockers).join(", ")} reuses this day. Change those to reuse another day first.`,
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
  const errorsBefore = evaluationErrors(before, settings);
  const errorsAfter = evaluationErrors(after, settings);
  const introduced = errorsAfter.filter((e) => errorsBefore.indexOf(e) === -1);
  if (introduced.length > 0) {
    return { ok: false, reason: `That would break the program: ${introduced[0]}` };
  }
  return { ok: true, planner: after };
}

function evaluationErrors(planner: IPlannerProgram, settings: ISettings): string[] {
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

function reorderDayText(text: string, order: string[]): string {
  const { blocks, trailing } = exerciseBlocks(text);
  // Only the blocks named in `order` move, and they move within the slots they already occupy, so
  // anything the grid doesn't know about stays exactly where the author put it.
  const movableSlots = blocks.reduce<number[]>(
    (acc, block, index) => (order.indexOf(block.fullName) !== -1 ? [...acc, index] : acc),
    []
  );
  const reordered = movableSlots
    .map((slot) => blocks[slot])
    .sort((a, b) => order.indexOf(a.fullName) - order.indexOf(b.fullName));
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
      day.exerciseText = reorderDayText(day.exerciseText, order);
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
    return { ok: true, planner };
  }
  // A ragged program can have the day in one week and not the other. Moving then would delete the
  // exercise from the week that has no destination for it, so refuse the whole thing rather than
  // silently losing a week's worth of work.
  const missing = planner.weeks.filter(
    (week) =>
      week.days[toRowIndex] == null &&
      week.days[fromRowIndex] != null &&
      exerciseBlocks(week.days[fromRowIndex].exerciseText).blocks.some((b) => b.fullName === fullName)
  );
  if (missing.length > 0) {
    return { ok: false, reason: `${missing.map((w) => w.name).join(", ")} has no day to move ${fullName} into.` };
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
    const block = from.blocks.find((b) => b.fullName === fullName);
    if (block == null) {
      continue;
    }
    fromDay.exerciseText = joinBlocks(
      from.blocks.filter((b) => b !== block),
      from.trailing,
      fromDay.exerciseText
    );
    const to = exerciseBlocks(toDay.exerciseText);
    const anchor = beforeFullName != null ? to.blocks.findIndex((b) => b.fullName === beforeFullName) : -1;
    const blocks = to.blocks.slice();
    blocks.splice(anchor === -1 ? blocks.length : anchor, 0, block);
    toDay.exerciseText = joinBlocks(blocks, to.trailing, toDay.exerciseText);
    moved = true;
  }
  if (!moved) {
    return { ok: false, reason: `Couldn't find ${fullName} in that day.` };
  }
  // The destination day may already declare the same exercise, or something may reuse this one by
  // its old `[week:day]` address — both surface as evaluation errors rather than as anything this
  // could check for directly.
  return refuseIfWorse(planner, result, settings);
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
    return { ok: true, planner };
  }
  const oldOrder = Array.from({ length: rows }, (_, i) => i);
  oldOrder.splice(toIndex, 0, ...oldOrder.splice(fromIndex, 1));
  // oldOrder[newIndex] = the row that now sits there, so this inverts it into old day → new day.
  const newDayForOld = new Map<number, number>();
  oldOrder.forEach((oldIndex, newIndex) => newDayForOld.set(oldIndex + 1, newIndex + 1));

  const result = ObjectUtils_clone(planner);
  for (const week of result.weeks) {
    week.days = oldOrder.map((oldIndex) => week.days[oldIndex]).filter((day) => day != null);
    for (const day of week.days) {
      day.exerciseText = remapDayReferences(day.exerciseText, newDayForOld);
    }
  }
  return refuseIfWorse(planner, result, settings);
}

function remapDayReferences(text: string, newDayForOld: Map<number, number>): string {
  const references = dayReferences(text);
  let result = text;
  for (const reference of references.slice().reverse()) {
    const next = newDayForOld.get(reference.day);
    if (next != null && next !== reference.day) {
      result = `${result.slice(0, reference.node.from)}${next}${result.slice(reference.node.to)}`;
    }
  }
  return result;
}

// Changes how many weeks an exercise repeats for, by rewriting the `[from-to]` token on the line
// that declares it and nothing else. The later weeks hold no text for a repeated exercise — the
// evaluator synthesizes them from the range — so this is the whole edit: no other line moves, and a
// week that has its own definition inside the new range stays put and reads as an override.
//
// `toWeek` equal to `fromWeek` drops the repeat entirely, leaving the exercise in its own week.
export function ProgramGridTransforms_setRepeatRange(
  planner: IPlannerProgram,
  dayData: { week: number; dayInWeek: number },
  fullName: string,
  toWeek: number
): IPlannerProgram {
  const result = ObjectUtils_clone(planner);
  const day = result.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1];
  if (day == null) {
    return planner;
  }
  const text = day.exerciseText;
  const line = findExerciseLine(text, fullName);
  if (line == null) {
    return planner;
  }
  const order = line.repeatNode != null ? orderOf(line.repeatNode, text) : undefined;
  const parts: string[] = [];
  if (order != null && order !== 0) {
    parts.push(`${order}`);
  }
  if (toWeek > dayData.week) {
    parts.push(`${dayData.week}-${toWeek}`);
  }
  const token = parts.length > 0 ? `[${parts.join(",")}]` : "";
  const from = line.repeatNode?.from ?? line.variationsEnd;
  const to = line.repeatNode?.to ?? line.variationsEnd;
  day.exerciseText = `${text.slice(0, from)}${token}${text.slice(to)}`;
  return result;
}
