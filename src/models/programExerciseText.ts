import { IPlannerProgram, ISettings } from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerProgram_evaluate, PlannerProgram_thrownErrorMessage } from "../pages/planner/models/plannerProgram";
import type { IPlannerEvalResult } from "../pages/planner/plannerExerciseEvaluator";
import { parser as plannerExerciseParser } from "../pages/planner/plannerExerciseParser";
import { PlannerNodeName } from "../pages/planner/plannerExerciseStyles";
import { PlannerEvaluator_hoistedProperties } from "../pages/planner/plannerEvaluator";
import { IPlannerDocumentBlockSpan, PlannerDocument_blockSpans } from "../pages/planner/models/plannerDocument";
import { CollectionUtils_compact } from "../utils/collection";
import { IEvaluatedProgram, Program_getAllProgramExercises } from "./program";
import {
  IProgramExerciseSwap,
  IProgramExerciseSwapScope,
  ProgramExerciseSwap_apply,
  ProgramExerciseSwap_rebaseRange,
  ProgramExerciseSwap_revertedText,
} from "./programExerciseSwap";

// Errors inside the edited exercise carry blurb-local from/to so the editor can tint the
// offending span; errors elsewhere in the program are message-only.
export interface IProgramExerciseTextError {
  message: string;
  from?: number;
  to?: number;
}

// Where the exercise's source text physically lives: repeat instances carry the
// declaration's text/line but their own dayData, so anchor edits to the non-repeat
// declaration that repeats into the opened week.
export function ProgramExerciseText_findDeclaration(
  evaluatedProgram: IEvaluatedProgram,
  programExercise: IPlannerProgramExercise
): IPlannerProgramExercise {
  if (!programExercise.isRepeat) {
    return programExercise;
  }
  return (
    Program_getAllProgramExercises(evaluatedProgram).find(
      (e) => e.key === programExercise.key && !e.isRepeat && e.repeating.includes(programExercise.dayData.week)
    ) ?? programExercise
  );
}

// Where this declaration physically sits in its day. Found by line and confirmed by text:
// identical exercise lines repeat across weeks and days, and a declaration resolved before an
// edit landed can name a line that now holds something else — which is exactly what tells a
// sheet its exercise moved out from under it.
function declarationSpan(
  planner: IPlannerProgram,
  declaration: IPlannerProgramExercise
): { dayText: string; span: IPlannerDocumentBlockSpan } | undefined {
  const dayText = planner.weeks[declaration.dayData.week - 1]?.days[declaration.dayData.dayInWeek - 1]?.exerciseText;
  if (dayText == null) {
    return undefined;
  }
  // Trimmed on both sides, because `declaration.text` is: the span keeps whatever trailing
  // spaces the line was written with, and those are not a difference in the exercise.
  const span = PlannerDocument_blockSpans(dayText).find(
    (s) => s.line === declaration.line && dayText.slice(s.exerciseFrom, s.to).trim() === declaration.text
  );
  return span != null ? { dayText, span } : undefined;
}

// What editing "an exercise" actually covers: the `//` description lines the evaluator attaches
// to it, plus its own line(s). A surface showing only `declaration.text` hides half of what the
// user wrote about this exercise — and one that saves only that line leaves the descriptions
// stranded above whatever ends up there next.
//
// Read off the day's source rather than rebuilt from `descriptions.values`: those have already
// had their `//`, their `!` marker and their indentation stripped, so they can't be spliced back.
export function ProgramExerciseText_blurb(planner: IPlannerProgram, declaration: IPlannerProgramExercise): string {
  const found = declarationSpan(planner, declaration);
  return found != null ? found.dayText.slice(found.span.from, found.span.to) : declaration.text;
}

// Which properties an instance in a later week is governed by even though its own line never
// mentions them — the thing that makes editing one line a lie about the exercise.
//
// Derived from the evaluator's own list rather than restated, so adding a property to
// fillSingleProperties reaches the sheet instead of quietly not doing so. `used` is hoisted but
// deliberately not surfaced: `used: none` marks an exercise as a template that appears in no
// workout, so it barely coexists with real instances, and it carries no value to edit from
// another week — a caption about it would be unactionable noise.
export const ProgramExerciseText_sharedProperties: string[] = PlannerEvaluator_hoistedProperties.filter(
  (property) => property !== "used"
);

interface IExerciseSection {
  property: string;
  // The section on its own, with any trailing line continuation dropped — it's a readability
  // wrapper for where the section currently sits, and carrying it into a recomposed line would
  // leave a "\" with nothing continuing after it.
  text: string;
  start: number;
  // Past the continuation's newline where there is one, so removing the section doesn't leave a
  // dangling line break that ends the exercise early.
  end: number;
  // The "/" introducing the section — removing a section has to take its separator with it.
  separatorStart: number;
  // `progress: none` and friends. Only progress gets an exemption from being program-wide
  // (plannerEvaluator only registers `type !== "none"`), so this is what tells a genuine
  // per-day override apart from a declaration.
  isNone: boolean;
}

// Whether a section is the kind the evaluator hoists to the whole exercise. A `progress: none`
// is not: it is a per-day opt-out that lives on the day it's written, so routing it to the
// declaring week would overwrite that week's real progression with "none".
function isSharedDeclaration(section: IExerciseSection): boolean {
  return !(section.property === "progress" && section.isNone);
}

function exerciseSections(text: string): IExerciseSection[] {
  const exercise = plannerExerciseParser.parse(text).topNode.getChild(PlannerNodeName.ExerciseExpression);
  if (exercise == null) {
    return [];
  }
  const sections: IExerciseSection[] = [];
  let separatorStart: number | undefined;
  for (let node = exercise.firstChild; node != null; node = node.nextSibling) {
    if (node.name === PlannerNodeName.SectionSeparator) {
      separatorStart = node.from;
      continue;
    }
    if (node.name !== PlannerNodeName.ExerciseSection) {
      continue;
    }
    const nameNode = node.getChild(PlannerNodeName.ExerciseProperty)?.getChild(PlannerNodeName.ExercisePropertyName);
    if (nameNode != null) {
      let trimmed = node.to;
      while (
        trimmed > node.from &&
        (text[trimmed - 1] === " " || text[trimmed - 1] === "\n" || text[trimmed - 1] === "\r")
      ) {
        trimmed -= 1;
      }
      const isContinued = text[trimmed - 1] === "\\";
      let textEnd = isContinued ? trimmed - 1 : trimmed;
      while (textEnd > node.from && text[textEnd - 1] === " ") {
        textEnd -= 1;
      }
      sections.push({
        property: text.slice(nameNode.from, nameNode.to),
        text: text.slice(node.from, textEnd),
        start: node.from,
        end: isContinued ? node.to : trimmed,
        separatorStart: separatorStart ?? node.from,
        isNone: node.getChild(PlannerNodeName.ExerciseProperty)?.getChild(PlannerNodeName.None) != null,
      });
    }
    separatorStart = undefined;
  }
  return sections;
}

function isSameDeclaration(a: IPlannerProgramExercise, b: IPlannerProgramExercise): boolean {
  return a.dayData.week === b.dayData.week && a.dayData.dayInWeek === b.dayData.dayInWeek && a.line === b.line;
}

// Cutting a section out leaves the space that preceded its separator behind.
function cutSection(text: string, section: IExerciseSection): string {
  let start = section.separatorStart;
  while (start > 0 && text[start - 1] === " ") {
    start -= 1;
  }
  return text.slice(0, start) + text.slice(section.end);
}

export interface IProgramExerciseSharedSection {
  property: string;
  text: string;
  // Every declaration that physically carries this property, not just the first. The evaluator
  // allows the same property on several days as long as the arguments match, so rewriting one
  // and leaving the rest is exactly what makes them disagree.
  owners: IPlannerProgramExercise[];
}

export interface IProgramExerciseSharedEdit {
  property: string;
  owners: IPlannerProgramExercise[];
  text: string;
}

export interface IProgramExerciseSharedRange {
  property: string;
  start: number;
  end: number;
}

// Which shared properties govern this declaration without being written on it, and which line
// does hold each. Only other declarations of the same key count: an exercise that inherits
// `progress` through `...reuse` gets it from a different key entirely, and rewriting that from
// here would edit an exercise the user isn't looking at.
export function ProgramExerciseText_sharedSections(
  evaluatedProgram: IEvaluatedProgram,
  declaration: IPlannerProgramExercise
): IProgramExerciseSharedSection[] {
  const own = new Set(exerciseSections(declaration.text).map((s) => s.property));
  const missing = ProgramExerciseText_sharedProperties.filter((p) => !own.has(p));
  if (missing.length === 0) {
    return [];
  }
  const found: IProgramExerciseSharedSection[] = [];
  for (const sibling of Program_getAllProgramExercises(evaluatedProgram)) {
    if (sibling.key !== declaration.key || sibling.isRepeat || isSameDeclaration(sibling, declaration)) {
      continue;
    }
    for (const section of exerciseSections(sibling.text)) {
      if (!missing.includes(section.property) || !isSharedDeclaration(section)) {
        continue;
      }
      const existing = found.find((f) => f.property === section.property);
      if (existing == null) {
        found.push({ property: section.property, text: section.text, owners: [sibling] });
      } else if (!existing.owners.some((owner) => isSameDeclaration(owner, sibling))) {
        existing.owners.push(sibling);
      }
    }
  }
  return found.sort(
    (a, b) =>
      ProgramExerciseText_sharedProperties.indexOf(a.property) -
      ProgramExerciseText_sharedProperties.indexOf(b.property)
  );
}

export function ProgramExerciseText_compose(localBlurb: string, shared: { text: string }[]): string {
  return shared.reduce((acc, section) => `${acc} / ${section.text}`, localBlurb.trimEnd());
}

// The inverse of compose, but keyed on the property rather than on where compose put it: after
// freeform typing the sections can be anywhere, and a shared property belongs to its owner no
// matter where in this text it ends up — including when the user adds one that was never
// composed in.
//
// An absent section always means untouched, never removed: removing a shared property is not
// something this sheet offers (the editor hides the delete affordance for them), so a section
// that isn't in the text is simply one that is currently hidden. That is what lets the collapsed
// default — where none of them are in the text — save without wiping anything.
export function ProgramExerciseText_split(
  text: string,
  shared: IProgramExerciseSharedSection[]
): { localBlurb: string; sharedEdits: IProgramExerciseSharedEdit[] } {
  if (shared.length === 0) {
    return { localBlurb: text, sharedEdits: [] };
  }
  const sections = exerciseSections(text).filter(isSharedDeclaration);
  const sharedEdits = CollectionUtils_compact(
    shared.map((s) => {
      const found = sections.find((section) => section.property === s.property);
      return found != null ? { property: s.property, owners: s.owners, text: found.text } : undefined;
    })
  );
  let localBlurb = text;
  const cuts = sections
    .filter((section) => shared.some((s) => s.property === section.property))
    .sort((a, b) => b.start - a.start);
  for (const cut of cuts) {
    localBlurb = cutSection(localBlurb, cut);
  }
  return { localBlurb, sharedEdits };
}

export function ProgramExerciseText_sharedRanges(text: string, properties: string[]): IProgramExerciseSharedRange[] {
  return exerciseSections(text)
    .filter((section) => properties.includes(section.property) && isSharedDeclaration(section))
    .map((section) => ({ property: section.property, start: section.separatorStart, end: section.end }));
}

function rewriteSharedSections(ownerText: string, edits: IProgramExerciseSharedEdit[]): string {
  const sections = exerciseSections(ownerText);
  const changes = edits
    .map((edit) => ({ edit, section: sections.find((s) => s.property === edit.property) }))
    .filter(
      (change): change is { edit: IProgramExerciseSharedEdit; section: IExerciseSection } => change.section != null
    )
    .sort((a, b) => b.section.start - a.section.start);
  let result = ownerText;
  for (const { edit, section } of changes) {
    if (edit.text !== section.text) {
      // Replaces up to the trimmed text end, so a section written with a trailing line
      // continuation keeps it and the line after it still belongs to this exercise.
      result = result.slice(0, section.start) + edit.text + result.slice(section.start + section.text.length);
    }
  }
  return result;
}

// One rewrite per physical line, carrying every property that line declares.
function groupByOwner(
  edits: IProgramExerciseSharedEdit[]
): { owner: IPlannerProgramExercise; edits: IProgramExerciseSharedEdit[] }[] {
  const groups: { owner: IPlannerProgramExercise; edits: IProgramExerciseSharedEdit[] }[] = [];
  for (const edit of edits) {
    for (const owner of edit.owners) {
      const group = groups.find((g) => isSameDeclaration(g.owner, owner));
      if (group != null) {
        group.edits.push(edit);
      } else {
        groups.push({ owner, edits: [edit] });
      }
    }
  }
  return groups;
}

// Identical exercise lines commonly appear in several weeks (repeated weeks written out), so
// the replacement targets the declaration's own span rather than a search for its text — which
// could match the same line further down the day and rewrite an exercise nobody was editing.
//
// `scope` says how far the replacement reaches: editing the exercise replaces the whole blurb,
// descriptions included, while a shared property rewritten on another day's line touches that
// line alone and leaves that day's descriptions where they are.
export function ProgramExerciseText_replaceInPlanner(
  planner: IPlannerProgram,
  declaration: IPlannerProgramExercise,
  newText: string,
  scope: "blurb" | "exercise"
): { planner: IPlannerProgram; dayTextOffset: number } | undefined {
  const found = declarationSpan(planner, declaration);
  if (found == null) {
    return undefined;
  }
  const { dayText, span } = found;
  const at = scope === "blurb" ? span.from : span.exerciseFrom;
  const newExerciseText = dayText.slice(0, at) + newText + dayText.slice(span.to);
  const weekIndex = declaration.dayData.week - 1;
  const dayIndex = declaration.dayData.dayInWeek - 1;
  const newWeeks = planner.weeks.map((w, wi) =>
    wi === weekIndex
      ? { ...w, days: w.days.map((d, di) => (di === dayIndex ? { ...d, exerciseText: newExerciseText } : d)) }
      : w
  );
  return { planner: { ...planner, weeks: newWeeks }, dayTextOffset: at };
}

export function ProgramExerciseText_cleanErrorMessage(message: string): string {
  return message.replace(/\s*\(\d+:\d+\)$/, "");
}

function findEvalError(
  evaluatedWeeks: IPlannerEvalResult[][],
  edited: { weekIndex: number; dayIndex: number; from: number; to: number }
): IProgramExerciseTextError | undefined {
  let firstOutside: IProgramExerciseTextError | undefined;
  for (let wi = 0; wi < evaluatedWeeks.length; wi += 1) {
    for (let di = 0; di < evaluatedWeeks[wi].length; di += 1) {
      const result = evaluatedWeeks[wi][di];
      if (!result.success) {
        const error = result.error;
        const isInEdited =
          wi === edited.weekIndex && di === edited.dayIndex && error.from >= edited.from && error.to <= edited.to;
        if (isInEdited) {
          return {
            message: ProgramExerciseText_cleanErrorMessage(error.message),
            from: error.from - edited.from,
            to: error.to - edited.from,
          };
        }
        firstOutside = firstOutside ?? {
          message: `Week ${wi + 1}, Day ${di + 1}: ${ProgramExerciseText_cleanErrorMessage(error.message)}`,
        };
      }
    }
  }
  return firstOutside;
}

// The evaluator can throw outright on drafts it never sees from saved programs (e.g. a
// reuse pointing at a week that doesn't exist) — and live validation feeds it every
// keystroke, so a throw must become an error result, not a crash.
function evaluatePlannerSafely(
  planner: IPlannerProgram,
  settings: ISettings,
  edited: { weekIndex: number; dayIndex: number; from: number; to: number }
): IProgramExerciseTextError | undefined {
  try {
    const { evaluatedWeeks } = PlannerProgram_evaluate(planner, settings);
    return findEvalError(evaluatedWeeks, edited);
  } catch (e) {
    return { message: ProgramExerciseText_cleanErrorMessage(PlannerProgram_thrownErrorMessage(e)) };
  }
}

// Turning one exercise's edited text into a new program, used both to save and to validate.
// Ordinary edits are a splice; an edit that changes *which exercise this is* gets spliced with
// the old name still in place — keeping the program valid, in particular every `...reuse`
// aimed at it — and then swapped at the program level, which is what rewrites those
// references, keeps ladders identical across instances and de-conflicts a colliding name.
//
// `localBlurb` is this declaration's whole blurb — its `//` description lines as well as its
// exercise line — and replaces all of it. Not just the line: the descriptions belong to the
// exercise, so a surface editing one edits both. Edits to shared properties are the exception,
// and land on the lines that declare them; those go first so the local splice's returned offset
// — which error ranges are mapped against — is measured against a planner nothing else will move.
export function ProgramExerciseText_apply(
  planner: IPlannerProgram,
  declaration: IPlannerProgramExercise,
  localBlurb: string,
  sharedEdits: IProgramExerciseSharedEdit[],
  swap: IProgramExerciseSwap | undefined,
  scope: IProgramExerciseSwapScope,
  settings: ISettings
): { planner: IPlannerProgram } | { error: IProgramExerciseTextError; notFound?: boolean } {
  const splicedText = swap != null ? ProgramExerciseSwap_revertedText(localBlurb, swap) : localBlurb;
  let withShared = planner;
  for (const group of groupByOwner(sharedEdits)) {
    const newOwnerText = rewriteSharedSections(group.owner.text, group.edits);
    if (newOwnerText === group.owner.text) {
      continue;
    }
    const replacedOwner = ProgramExerciseText_replaceInPlanner(withShared, group.owner, newOwnerText, "exercise");
    if (replacedOwner == null) {
      return {
        error: { message: "Couldn't find this exercise in the program anymore, so the changes weren't saved." },
        notFound: true,
      };
    }
    withShared = replacedOwner.planner;
  }
  const replaced = ProgramExerciseText_replaceInPlanner(withShared, declaration, splicedText, "blurb");
  if (replaced == null) {
    return {
      error: { message: "Couldn't find this exercise in the program anymore, so the changes weren't saved." },
      notFound: true,
    };
  }
  const spliceError = evaluatePlannerSafely(replaced.planner, settings, {
    weekIndex: declaration.dayData.week - 1,
    dayIndex: declaration.dayData.dayInWeek - 1,
    from: replaced.dayTextOffset,
    to: replaced.dayTextOffset + splicedText.length,
  });
  if (spliceError != null) {
    // The user sees the new name; the evaluator saw the old one, so in-blurb ranges are off
    // by the difference in length.
    return {
      error:
        swap != null && spliceError.from != null && spliceError.to != null
          ? { ...spliceError, ...ProgramExerciseSwap_rebaseRange({ from: spliceError.from, to: spliceError.to }, swap) }
          : spliceError,
    };
  }
  if (swap == null) {
    return { planner: replaced.planner };
  }
  const applied = ProgramExerciseSwap_apply(replaced.planner, swap, scope, declaration.dayData, settings);
  if ("error" in applied) {
    return { error: { message: ProgramExerciseText_cleanErrorMessage(applied.error) } };
  }
  // The swap rewrites the whole program, so anything it broke is reported without a range —
  // there is nothing in this blurb to point at.
  const evalError = evaluatePlannerSafely(applied.planner, settings, {
    weekIndex: -1,
    dayIndex: -1,
    from: 0,
    to: 0,
  });
  return evalError != null ? { error: evalError } : { planner: applied.planner };
}
