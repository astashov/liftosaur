import { IEvaluatedProgram } from "../../../models/program";
import { IDayData, IPercentage, ISettings, IWeight } from "../../../types";
import { IPlannerProgramExercise, IPlannerProgramExerciseGlobals } from "./types";
import {
  PlannerProgramExercise_currentDescription,
  PlannerProgramExercise_currentEvaluatedSetVariationIndex,
  PlannerProgramExercise_currentExerciseVariationIndex,
  PlannerProgramExercise_currentSetVariationIndex,
  PlannerProgramExercise_evaluatedSetsToDisplaySets,
  PlannerProgramExercise_getState,
  PlannerProgramExercise_setsToDisplaySets,
} from "./plannerProgramExercise";
import { IDisplaySet } from "../../../models/set";
import { Weight_print } from "../../../models/weight";
import { Progress_supersetColors } from "../../../models/progress";
import { PlannerStatsUtils_dayApproxTimeMs } from "./plannerStatsUtils";

// Mirrors the editor's node→style mapping (liftoEditorBrain.ts:102) so a strip reads like the
// Liftoscript it stands for, in the same colors. The view owns the mapping to actual palette
// entries; this only says which kind of token each run of text is.
export type IProgramGridTokenKind = "setPart" | "weight" | "rpe" | "timer" | "auto" | "reuse" | "separator";

export interface IProgramGridSchemeToken {
  text: string;
  kind: IProgramGridTokenKind;
  // Liftoscript marks the current set variation with a `!`; a strip has no room to spend on
  // punctuation, so the view spells it as weight instead.
  isCurrent?: boolean;
}

// One rung of an exercise-variation ladder, marked the same way and for the same reason.
export interface IProgramGridNamePart {
  text: string;
  isCurrent: boolean;
}

// What a run of weeks inside one strip actually runs, once a reuse has been read through to its
// source. A reusing line's own text is week-invariant — that's why the run collapsed in the first
// place — but the numbers behind it need not be, so this is a second run-length encoding *inside*
// the strip: consecutive weeks that resolve alike share a section, and the common case (a reuse that
// resolves the same every week) is one section spanning the whole strip.
export interface IProgramGridResolvedSection {
  colStart: number;
  colEnd: number;
  tokens: IProgramGridSchemeToken[];
}

export interface IProgramGridColumn {
  weekIndex: number;
  name: string;
  description?: string;
}

export interface IProgramGridRow {
  rowIndex: number;
  // Undefined where the week has no day in this row — a ragged program. `ProgramGrid_hasDay` is the
  // question every caller actually asks.
  namePerWeek: (string | undefined)[];
  // Per week for the same reason the name is: a row is one slot in every week, and each week writes
  // its own day, so the two can disagree.
  descriptionPerWeek: (string | undefined)[];
  // How long the day takes, by the same estimate the per-day editor prints. Per week because a
  // repeat is not the only thing a week can hold — an override changes the sets, and so the time.
  durationMsPerWeek: (number | undefined)[];
}

export interface IProgramGridPlacement {
  id: string;
  key: string;
  fullName: string;
  // `fullName` with the variation ladder taken apart, which is what the strip prints. The raw name
  // carries the `!` that marks the current rung, and printing that verbatim spends a character on
  // something the strip can say by weight instead.
  nameParts: IProgramGridNamePart[];
  rowIndex: number;
  laneIndex: number;
  colStart: number;
  colEnd: number;
  // The weeks a `[from-to]` claims, which is not the same as the weeks this run covers: a run stops
  // where the text changes, a claim doesn't. Used to tell an override from independent authoring.
  repeatSpan?: [number, number];
  // Which weeks hold the line or lines that produce this run — its provenance.
  //
  // A strip is not an editable unit: one line can draw several strips (a repeat interrupted by an
  // override), and several identical lines can collapse into one strip. Every edit needs to know
  // which lines the strip in front of the user actually came from, and the answer is free here,
  // while the runs are being collapsed, but expensive and error-prone to reconstruct afterwards
  // from week numbers alone. Reconstructing it is what every data-loss bug in this feature has had
  // in common.
  sourceWeeks: number[];
  // Both are `used: none`; what separates them is whether the name resolves to a real exercise. A
  // made-up name that exists only to be reused is a template, a real exercise switched off is
  // unused, and `isTemplate` implies `notused`. Everything visual keys off `notused` — neither one
  // runs — and only the word the user is shown differs.
  notused: boolean;
  isTemplate: boolean;
  isReuseSource: boolean;
  reuseOf?: string;
  isOverride: boolean;
  // The bare number in the `[...]` bracket, which pins this exercise's position in the day.
  // Undefined rather than 0 — 0 is the evaluator's way of saying there was no such number.
  order?: number;
  // `id: tags(3, 5)`, which is how a program says "this exercise belongs to that group".
  tags: number[];
  progression?: string;
  // The description the exercise is currently on, the way a day or a week carries its own — the
  // strip has no room for it, so the dock is where it gets read.
  description?: string;
  // The color of the superset this exercise is part of, absent when it is in none — or in one whose
  // only member it is.
  supersetColor?: string;
  scheme: IProgramGridSchemeToken[];
  // What the scheme comes out as, for a line whose scheme is a `...reference` rather than numbers.
  // Empty for everything else: an ordinary strip's scheme is already the resolved one, and printing
  // it twice says nothing.
  resolved: IProgramGridResolvedSection[];
}

export interface IProgramGridError {
  rowIndex: number;
  weekIndex: number;
  message: string;
}

export interface IProgramGrid {
  columns: IProgramGridColumn[];
  rows: IProgramGridRow[];
  placements: IProgramGridPlacement[];
  errors: IProgramGridError[];
}

interface IOpenRun {
  placement: IProgramGridPlacement;
  definingText: string;
}

function laneId(exercise: IPlannerProgramExercise, ordinal: number): string {
  return `${exercise.key}#${ordinal}`;
}

interface IProgramGridSetGroupPart {
  text: string;
  kind: IProgramGridTokenKind;
}

interface IProgramGridSetGroup {
  reps: string;
  parts: IProgramGridSetGroupPart[];
}

// The order Liftoscript writes them in, which is the order they read best in whether they end up
// next to their sets or after all of them.
const PART_KINDS: IProgramGridTokenKind[] = ["weight", "rpe", "timer", "auto"];

function displaySetsToGroups(groups: IDisplaySet[][]): IProgramGridSetGroup[] {
  return groups.reduce<IProgramGridSetGroup[]>((acc, group) => {
    const first = group[0];
    if (first == null) {
      return acc;
    }
    const parts: IProgramGridSetGroupPart[] = [];
    if (!first.dimWeight && first.weight != null) {
      parts.push({ text: `${first.weight}${first.unit ?? ""}`, kind: "weight" });
    }
    if (first.rpe != null) {
      parts.push({ text: `@${first.rpe}`, kind: "rpe" });
    }
    const timer = first.setTimer ?? first.timer;
    if (timer != null) {
      parts.push({ text: `${timer}s`, kind: "timer" });
    }
    if (first.auto) {
      parts.push({ text: "auto", kind: "auto" });
    }
    return [...acc, { reps: `${group.length}x${first.reps}`, parts }];
  }, []);
}

// A weight or a timer every group of every variation repeats is a property of the exercise rather
// than of any one group, and that's how the program says it — `3x3 86%, 1x3+ 86% / 190s`, written
// once after the sets. Repeating it costs the strip the width it has least of, and the repetition
// is what buries the number that does differ. A lone group has nothing to factor out of: pulling
// its own values behind a separator would only make it longer.
function commonParts(variations: IProgramGridSetGroup[][], taken: IProgramGridTokenKind[]): IProgramGridSetGroupPart[] {
  const groups = variations.reduce<IProgramGridSetGroup[]>((acc, v) => [...acc, ...v], []);
  const first = groups[0];
  if (groups.length < 2 || first == null) {
    return [];
  }
  return first.parts.filter(
    (part) =>
      taken.indexOf(part.kind) === -1 &&
      groups.every((group) => group.parts.some((p) => p.kind === part.kind && p.text === part.text))
  );
}

function groupToTokens(group: IProgramGridSetGroup, common: IProgramGridSetGroupPart[]): IProgramGridSchemeToken[] {
  const tokens: IProgramGridSchemeToken[] = [{ text: group.reps, kind: "setPart" }];
  for (const part of group.parts) {
    if (common.some((c) => c.kind === part.kind)) {
      continue;
    }
    tokens.push({ text: " ", kind: "separator" });
    tokens.push({ text: part.text, kind: part.kind });
  }
  return tokens;
}

// Marked like the sets are: a global applies to whichever variation is running, so it belongs to
// the current prescription as much as the sets it was pulled out of.
function withTrailing(
  tokens: IProgramGridSchemeToken[],
  trailing: IProgramGridSchemeToken[]
): IProgramGridSchemeToken[] {
  const result = [...tokens];
  const sorted = [...trailing].sort((a, b) => PART_KINDS.indexOf(a.kind) - PART_KINDS.indexOf(b.kind));
  for (let i = 0; i < sorted.length; i += 1) {
    if (result.length > 0) {
      result.push({ text: i === 0 ? " / " : " ", kind: "separator", isCurrent: true });
    }
    result.push({ ...sorted[i], isCurrent: true });
  }
  return result;
}

function variationsToTokens(
  variations: IProgramGridSetGroup[][],
  currentIndex: number,
  globals: IProgramGridSchemeToken[]
): IProgramGridSchemeToken[] {
  const common = commonParts(
    variations,
    globals.map((g) => g.kind)
  );
  const tokens = joinVariations(
    variations.map((groups) => joinGroups(groups.map((group) => groupToTokens(group, common)))),
    currentIndex
  );
  return withTrailing(tokens, [...common, ...globals]);
}

function joinGroups(groups: IProgramGridSchemeToken[][]): IProgramGridSchemeToken[] {
  const separator: IProgramGridSchemeToken = { text: ", ", kind: "separator" };
  return groups.reduce<IProgramGridSchemeToken[]>(
    (acc, group, i) => (i === 0 ? group : [...acc, separator, ...group]),
    []
  );
}

// Every set variation, spelled the way the program spells them — `/` between, current one marked.
// Showing only the current one made a `5x3 / !6x2 / 10x1` exercise indistinguishable from a plain
// `6x2` one, which is the difference between an exercise that has somewhere to go and one that
// doesn't. The lone variation of an ordinary exercise is marked too: current is how a strip is
// drawn, and an exercise with nothing to switch to is not a reason to draw it some other way.
function joinVariations(variations: IProgramGridSchemeToken[][], currentIndex: number): IProgramGridSchemeToken[] {
  const present = variations
    .map((tokens, index) => ({ tokens, isCurrent: index === currentIndex }))
    .filter((variation) => variation.tokens.length > 0);
  const tokens: IProgramGridSchemeToken[] = [];
  for (const variation of present) {
    if (tokens.length > 0) {
      tokens.push({ text: " / ", kind: "separator" });
    }
    tokens.push(...(variation.isCurrent ? variation.tokens.map((t) => ({ ...t, isCurrent: true })) : variation.tokens));
  }
  return tokens;
}

// What a reusing line writes on top of what it reuses. `PlannerProgramExercise_sets` resolves a
// reuse by letting this line's own sets and globals win over the reused ones, so those two fields
// hold exactly the overrides — everything else came from the source and belongs in the source's
// cells, not here.
function overrideTokens(exercise: IPlannerProgramExercise, settings: ISettings): IProgramGridSchemeToken[] {
  return variationsToTokens(
    exercise.setVariations.map((variation) =>
      displaySetsToGroups(PlannerProgramExercise_setsToDisplaySets(variation.sets, true, exercise.globals, settings))
    ),
    PlannerProgramExercise_currentSetVariationIndex(exercise),
    globalsToTokens(exercise.globals)
  );
}

function globalsToTokens(globals: IPlannerProgramExerciseGlobals): IProgramGridSchemeToken[] {
  const tokens: IProgramGridSchemeToken[] = [];
  if (globals.weight != null) {
    tokens.push({ text: `${Weight_print(globals.weight)}${globals.askWeight ? "+" : ""}`, kind: "weight" });
  } else if (globals.percentage != null) {
    tokens.push({ text: `${globals.percentage}%${globals.askWeight ? "+" : ""}`, kind: "weight" });
  }
  if (globals.rpe != null) {
    tokens.push({ text: `@${globals.rpe}${globals.logRpe ? "+" : ""}`, kind: "rpe" });
  }
  const timer = globals.setTimer ?? globals.timer;
  if (timer != null) {
    tokens.push({
      text: `${timer}s${globals.setTimer != null && globals.isOverflowSetTimer ? "+" : ""}`,
      kind: "timer",
    });
  }
  if (globals.auto) {
    tokens.push({ text: "auto", kind: "auto" });
  }
  return tokens;
}

// Evaluated sets carry the globals folded into every one of them, so there is nothing left that
// says which values were written once — `commonParts` reads that back off the sets themselves. A
// reuse is already resolved by this point, which is what lets a reuser print its numbers too.
function evaluatedTokens(exercise: IPlannerProgramExercise, settings: ISettings): IProgramGridSchemeToken[] {
  return variationsToTokens(
    exercise.evaluatedSetVariations.map((variation) =>
      displaySetsToGroups(PlannerProgramExercise_evaluatedSetsToDisplaySets(variation.sets, settings))
    ),
    PlannerProgramExercise_currentEvaluatedSetVariationIndex(exercise),
    []
  );
}

function schemeTokens(exercise: IPlannerProgramExercise, settings: ISettings): IProgramGridSchemeToken[] {
  const reuse = exercise.reuse;
  if (reuse == null) {
    return evaluatedTokens(exercise, settings);
  }
  // The scheme line says what the *line* says: the reference, plus whatever this line writes over
  // it — hiding the overrides made a line that rewrites the sets and the weight look identical to
  // one that reuses wholesale. What it all comes out as goes on `resolved`, a line below.
  const weekDay = reuse.week != null ? `[${reuse.week}${reuse.day != null ? `:${reuse.day}` : ""}]` : "";
  const tokens: IProgramGridSchemeToken[] = [{ text: `...${reuse.fullName}${weekDay}`, kind: "reuse" }];
  const overrides = overrideTokens(exercise, settings);
  if (overrides.length > 0) {
    tokens.push({ text: " / ", kind: "separator" }, ...overrides);
  }
  return tokens;
}

function tokensKey(tokens: IProgramGridSchemeToken[]): string {
  return tokens.map((token) => `${token.kind}:${token.isCurrent ? 1 : 0}:${token.text}`).join("|");
}

// Adds one week of a run to the strip's resolved line, extending the last section when the numbers
// haven't moved. A week that resolves to nothing still gets a section: the sections are laid out
// against the week columns they cover, and a hole with no width would slide the ones after it into
// the wrong columns.
function addResolvedWeek(
  placement: IProgramGridPlacement,
  weekIndex: number,
  exercise: IPlannerProgramExercise,
  settings: ISettings
): void {
  if (exercise.reuse == null) {
    return;
  }
  const tokens = evaluatedTokens(exercise, settings);
  const last = placement.resolved[placement.resolved.length - 1];
  if (last != null && tokensKey(last.tokens) === tokensKey(tokens)) {
    last.colEnd = weekIndex;
    return;
  }
  placement.resolved.push({ colStart: weekIndex, colEnd: weekIndex, tokens });
}

// Split on the `|` the grammar reserves for the ladder rather than rebuilt from `exerciseVariations`,
// whose names are stripped of the label and equipment that `fullName` spells out — the strip should
// print what the line says, minus the `!` that `isCurrent` already knows.
function nameParts(exercise: IPlannerProgramExercise): IProgramGridNamePart[] {
  const segments = exercise.fullName.split("|");
  if (segments.length < 2) {
    return [{ text: exercise.fullName, isCurrent: true }];
  }
  const currentIndex = PlannerProgramExercise_currentExerciseVariationIndex(exercise);
  return segments.map((segment, index) => ({
    text: segment.replace(/^\s*!\s*/, "").trim(),
    isCurrent: index === currentIndex,
  }));
}

// Short enough for one line of the dock, and spelled the way the program spells it — property name
// included, because on its own a word like "custom" doesn't say what it is talking about.
function progressionText(exercise: IPlannerProgramExercise): string | undefined {
  const progress = exercise.progress;
  if (progress == null) {
    return undefined;
  }
  const body = (): string => {
    if (progress.type === "none") {
      return "none";
    }
    const state = PlannerProgramExercise_getState(exercise);
    const print = (value: unknown): string => Weight_print(value as IWeight | IPercentage);
    if (progress.type === "lp") {
      const successes = state.successes as number;
      return `lp(${print(state.increment)}${successes > 1 ? `, ${successes}` : ""})`;
    }
    if (progress.type === "dp") {
      return `dp(${print(state.increment)}, ${state.minReps}, ${state.maxReps})`;
    }
    if (progress.type === "sum") {
      return `sum(${state.reps}, ${print(state.increment)})`;
    }
    const reuse = progress.reuse;
    return reuse != null ? `custom { ...${reuse.exercise?.fullName ?? reuse.fullName} }` : "custom";
  };
  return `progress: ${body()}`;
}

// Which lanes of one day row are supersetted together, and in what color — the workout screen's
// palette, in the workout screen's order, so a superset looks the same being read as being performed
// (`Progress_getSupersetToColor`).
//
// Scoped to the row rather than the week, because a superset is a fact about a day and a lane is
// that day's slot in every week: coloring per week would give one group a different color in each
// column of the same row. A lane's group is read from the first week that has it, the same way the
// row's name and description are.
//
// A group of one gets no color, since a line pairing an exercise with nothing says nothing — but the
// index still advances past it, which is what keeps this in step with the workout screen.
function supersetColors(
  lanes: string[],
  byWeek: Record<string, IPlannerProgramExercise>[]
): Record<string, string | undefined> {
  const groupByLane: Record<string, string> = {};
  const order: string[] = [];
  const laneCount: Record<string, number> = {};
  for (const lane of lanes) {
    const group = byWeek.map((week) => week[lane]).find((exercise) => exercise != null)?.superset?.name;
    if (group == null) {
      continue;
    }
    groupByLane[lane] = group;
    if (order.indexOf(group) === -1) {
      order.push(group);
    }
    laneCount[group] = (laneCount[group] ?? 0) + 1;
  }
  return lanes.reduce<Record<string, string | undefined>>((acc, lane) => {
    const group = groupByLane[lane];
    if (group != null && laneCount[group] > 1) {
      acc[lane] = Progress_supersetColors[order.indexOf(group) % Progress_supersetColors.length];
    }
    return acc;
  }, {});
}

function buildLanes(program: IEvaluatedProgram, rowIndex: number): string[] {
  const lanes: string[] = [];
  for (const week of program.weeks) {
    const day = week.days[rowIndex];
    if (day == null) {
      continue;
    }
    const seenInDay: Record<string, number> = {};
    for (const exercise of day.exercises) {
      const ordinal = seenInDay[exercise.key] ?? 0;
      seenInDay[exercise.key] = ordinal + 1;
      const id = laneId(exercise, ordinal);
      if (lanes.indexOf(id) === -1) {
        lanes.push(id);
      }
    }
  }
  return lanes;
}

function exercisesByLane(
  program: IEvaluatedProgram,
  rowIndex: number,
  weekIndex: number
): Record<string, IPlannerProgramExercise> {
  const day = program.weeks[weekIndex]?.days[rowIndex];
  const result: Record<string, IPlannerProgramExercise> = {};
  if (day == null) {
    return result;
  }
  const seenInDay: Record<string, number> = {};
  for (const exercise of day.exercises) {
    const ordinal = seenInDay[exercise.key] ?? 0;
    seenInDay[exercise.key] = ordinal + 1;
    result[laneId(exercise, ordinal)] = exercise;
  }
  return result;
}

function collectReuseSources(program: IEvaluatedProgram): Set<string> {
  const sources = new Set<string>();
  for (const week of program.weeks) {
    for (const day of week.days) {
      for (const exercise of day.exercises) {
        if (exercise.reuse?.fullName != null) {
          sources.add(exercise.reuse.fullName);
        }
      }
    }
  }
  return sources;
}

export function ProgramGrid_build(program: IEvaluatedProgram, settings: ISettings): IProgramGrid {
  const columns: IProgramGridColumn[] = program.weeks.map((week, weekIndex) => ({
    weekIndex,
    name: week.name,
    description: week.description,
  }));
  const numberOfRows = program.weeks.reduce((max, week) => Math.max(max, week.days.length), 0);
  const rows: IProgramGridRow[] = [];
  for (let rowIndex = 0; rowIndex < numberOfRows; rowIndex += 1) {
    rows.push({
      rowIndex,
      namePerWeek: program.weeks.map((week) => week.days[rowIndex]?.name),
      descriptionPerWeek: program.weeks.map((week) => week.days[rowIndex]?.description),
      durationMsPerWeek: program.weeks.map((week) => {
        const day = week.days[rowIndex];
        return day == null
          ? undefined
          : PlannerStatsUtils_dayApproxTimeMs(day.exercises, settings.timers.workout || 0, settings.timers.superset);
      }),
    });
  }

  const reuseSources = collectReuseSources(program);
  const placements: IProgramGridPlacement[] = [];

  for (let rowIndex = 0; rowIndex < numberOfRows; rowIndex += 1) {
    const lanes = buildLanes(program, rowIndex);
    const byWeek = program.weeks.map((_, weekIndex) => exercisesByLane(program, rowIndex, weekIndex));
    const supersetColorByLane = supersetColors(lanes, byWeek);
    lanes.forEach((lane, laneIndex) => {
      const lanePlacements: IProgramGridPlacement[] = [];
      let open: IOpenRun | undefined;
      for (let weekIndex = 0; weekIndex < program.weeks.length; weekIndex += 1) {
        const exercise = byWeek[weekIndex][lane];
        if (exercise == null) {
          open = undefined;
          continue;
        }
        if (open != null && exercise.text === open.definingText) {
          open.placement.colEnd = weekIndex;
          addSourceWeek(open.placement, byWeek, lane, weekIndex, exercise);
          addResolvedWeek(open.placement, weekIndex, exercise, settings);
          continue;
        }
        const placement: IProgramGridPlacement = {
          id: `${rowIndex}:${lane}:${weekIndex}`,
          sourceWeeks: [],
          key: exercise.key,
          fullName: exercise.fullName,
          nameParts: nameParts(exercise),
          rowIndex,
          laneIndex,
          colStart: weekIndex,
          colEnd: weekIndex,
          repeatSpan:
            exercise.repeating.length > 1
              ? [Math.min(...exercise.repeating) - 1, Math.max(...exercise.repeating) - 1]
              : undefined,
          notused: !!exercise.notused,
          isTemplate: !!exercise.notused && exercise.exerciseType == null,
          isReuseSource: reuseSources.has(exercise.fullName),
          reuseOf: exercise.reuse?.fullName,
          isOverride: false,
          order: exercise.order > 0 ? exercise.order : undefined,
          tags: exercise.tags,
          progression: progressionText(exercise),
          description: PlannerProgramExercise_currentDescription(exercise),
          supersetColor: supersetColorByLane[lane],
          scheme: schemeTokens(exercise, settings),
          resolved: [],
        };
        addSourceWeek(placement, byWeek, lane, weekIndex, exercise);
        addResolvedWeek(placement, weekIndex, exercise, settings);
        lanePlacements.push(placement);
        open = { placement, definingText: exercise.text };
      }
      // An override is a run that punches into the span some repeat claims. Independently authored
      // weeks (undulation) sit outside any claimed span and are not overrides.
      const claimedSpans = lanePlacements.map((p) => p.repeatSpan).filter((s): s is [number, number] => s != null);
      for (const placement of lanePlacements) {
        placement.isOverride =
          placement.repeatSpan == null &&
          claimedSpans.some(([from, to]) => placement.colStart >= from && placement.colStart <= to);
        placements.push(placement);
      }
    });
  }

  const errors: IProgramGridError[] = program.errors.map((error) => ({
    rowIndex: error.dayData.dayInWeek - 1,
    weekIndex: error.dayData.week - 1,
    message: error.error.message,
  }));

  return { columns, rows, placements, errors };
}

// Everything below is derived from the grid rather than stored on it: a second copy of a fact is a
// chance for the two to disagree after an edit.

// Where the line behind one week of a run lives. An instance that is not a repeat holds its own
// line; a repeat holds a copy of an earlier week's, and the one it copies is the nearest preceding
// week with the same text that authored it — "same text" being what separates the line it repeats
// from an override sitting in between.
function addSourceWeek(
  placement: IProgramGridPlacement,
  byWeek: Record<string, IPlannerProgramExercise>[],
  lane: string,
  weekIndex: number,
  exercise: IPlannerProgramExercise
): void {
  let source = weekIndex;
  if (exercise.isRepeat) {
    // Both directions: `Squat[1-2]` can be written in week 4 and fill weeks 1 and 2, so the line
    // behind an instance is not always above it. Searching backwards only left a back-filled strip
    // with no provenance at all, and an edit with nothing to act on reports success having done
    // nothing.
    source = -1;
    for (let other = 0; other < byWeek.length; other += 1) {
      const candidate = byWeek[other][lane];
      if (other !== weekIndex && candidate != null && !candidate.isRepeat && candidate.text === exercise.text) {
        source = other;
        break;
      }
    }
  }
  if (source !== -1 && placement.sourceWeeks.indexOf(source) === -1) {
    placement.sourceWeeks.push(source);
  }
}

// Whether a strip has anything to print on its resolved line. A reuse can resolve to nothing — a
// template with no prescription of its own — and that still leaves a section per week, because the
// sections are laid against the week columns they cover and a hole with no width would slide the
// ones after it into the wrong columns.
//
// The geometry asks this to decide the lane is a line taller, and the cell asks it to decide whether
// to draw one. They must agree, so they ask the same function rather than each spelling out the
// test: they disagreed once, and the result was a blank line in a lane with no room for it.
export function ProgramGrid_hasResolvedLine(placement: IProgramGridPlacement): boolean {
  return placement.resolved.some((section) => section.tokens.length > 0);
}

// Which lanes of a day row have a resolved line to print, which is what decides how tall each one
// is. Per lane rather than per grid: a lane is one exercise's slot in every week, and it is the
// smallest band that can afford a third line without every other lane paying for it too. Any one
// week claiming the line is enough, since a lane is one height across all of them.
export function ProgramGrid_laneResolved(grid: IProgramGrid, rowIndex: number): boolean[] {
  const resolved: boolean[] = [];
  for (const placement of grid.placements) {
    if (placement.rowIndex === rowIndex) {
      resolved[placement.laneIndex] =
        (resolved[placement.laneIndex] ?? false) || ProgramGrid_hasResolvedLine(placement);
    }
  }
  return Array.from({ length: resolved.length }, (_, i) => resolved[i] ?? false);
}

export function ProgramGrid_hasDay(row: IProgramGridRow, weekIndex: number): boolean {
  return row.namePerWeek[weekIndex] !== undefined;
}

// The number pinning an exercise's position, spelled the way the language writes it, to be read as
// part of the name it follows: `Squat[1]`. Empty when there is no forced order.
//
// Part of the name rather than a badge beside it, because a forced order decides where the exercise
// happens — and it is the one property that reads as nonsense on its own: "order 3" on the second
// strip down is a puzzle, `Squat[3]` sitting above `Bench Press[1]` is a fact you can act on.
//
// Display only, and never spliced into `fullName` — that is the identity every edit matches by, and
// it stays the name alone.
export function ProgramGrid_orderSuffix(placement: IProgramGridPlacement): string {
  return placement.order == null ? "" : `[${placement.order}]`;
}

// Which exercise sits in each lane of a day row, by lane index. This is *identity*: it answers
// "what am I dragging", so it comes from the placements rather than from the layout — geometry
// happens to carry the same names for drawing ghosts, and a drag must not depend on that.
export function ProgramGrid_laneNames(grid: IProgramGrid, rowIndex: number): string[] {
  const names: string[] = [];
  for (const placement of grid.placements) {
    if (placement.rowIndex === rowIndex) {
      names[placement.laneIndex] = placement.fullName;
    }
  }
  return Array.from({ length: names.length }, (_, i) => names[i] ?? "");
}

export function ProgramGrid_weekDayCount(grid: IProgramGrid, weekIndex: number): number {
  return grid.rows.filter((row) => ProgramGrid_hasDay(row, weekIndex)).length;
}

// Where this run starts, as a day coordinate. NOT necessarily where the exercise is authored: a
// repeat that back-fills (`Squat[1-3]` written in week 2) starts in week 1, which holds no text for
// it. Anything that needs to *edit* the line has to find the authoring day itself.
//
// `day` is the program-wide day counter the rest of the app uses, so it has to count the days of
// every preceding week — including the short ones in a ragged program.
// The week is explicit because the caller has to say which one it means: the week a strip is drawn
// in is not always the week its line lives in.
export function ProgramGrid_dayDataAt(grid: IProgramGrid, rowIndex: number, weekIndex: number): Required<IDayData> {
  let day = rowIndex + 1;
  for (let earlier = 0; earlier < weekIndex; earlier += 1) {
    day += ProgramGrid_weekDayCount(grid, earlier);
  }
  return { week: weekIndex + 1, dayInWeek: rowIndex + 1, day };
}

export function ProgramGrid_errorAt(
  grid: IProgramGrid,
  rowIndex: number,
  weekIndex: number
): IProgramGridError | undefined {
  return grid.errors.find((e) => e.rowIndex === rowIndex && e.weekIndex === weekIndex);
}

export interface IProgramGridSelection {
  selectedIds: Set<string>;
  placements: IProgramGridPlacement[];
  // Other runs of the same exercise — the per-week cells of an undulating definition, or the far
  // side of a run that an override split in two.
  sameExerciseIds: Set<string>;
  // Reuse partners in both directions: selecting a reuser lights its source, selecting a source (or
  // template) lights every exercise that reuses it.
  linkedIds: Set<string>;
}

export function ProgramGrid_select(grid: IProgramGrid, placementIds: string[]): IProgramGridSelection | undefined {
  const selectedIds = new Set(placementIds);
  const placements = grid.placements.filter((p) => selectedIds.has(p.id));
  if (placements.length === 0) {
    return undefined;
  }
  const sameExerciseIds = new Set<string>();
  const linkedIds = new Set<string>();
  for (const placement of grid.placements) {
    if (selectedIds.has(placement.id)) {
      continue;
    }
    // By key, not by name. A multi-variation exercise is spelled differently in the weeks where a
    // different variation is active — `!Squat | Front Squat` and `Squat | !Front Squat` are one
    // exercise with one key, and comparing names left the second one dimmed as unrelated to the
    // first. Everything that decides identity uses the key; this was the last place that didn't.
    if (placements.some((s) => s.key === placement.key)) {
      sameExerciseIds.add(placement.id);
    } else if (placements.some((s) => s.reuseOf === placement.fullName || s.fullName === placement.reuseOf)) {
      linkedIds.add(placement.id);
    }
  }
  return { selectedIds, placements, sameExerciseIds, linkedIds };
}
