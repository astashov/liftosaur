import { IEvaluatedProgram } from "../../../models/program";
import { IDayData, IPercentage, ISettings, IWeight } from "../../../types";
import { IPlannerProgramExercise, IPlannerProgramExerciseGlobals } from "./types";
import {
  PlannerProgramExercise_currentEvaluatedSetVariation,
  PlannerProgramExercise_currentSetVariationIndex,
  PlannerProgramExercise_evaluatedSetsToDisplaySets,
  PlannerProgramExercise_getState,
  PlannerProgramExercise_setsToDisplaySets,
} from "./plannerProgramExercise";
import { IDisplaySet } from "../../../models/set";
import { Weight_print } from "../../../models/weight";
import { Progress_supersetColors } from "../../../models/progress";

// Mirrors the editor's node→style mapping (liftoEditorBrain.ts:102) so a strip reads like the
// Liftoscript it stands for, in the same colors. The view owns the mapping to actual palette
// entries; this only says which kind of token each run of text is.
export type IProgramGridTokenKind = "setPart" | "weight" | "rpe" | "timer" | "auto" | "reuse" | "separator";

export interface IProgramGridSchemeToken {
  text: string;
  kind: IProgramGridTokenKind;
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
}

export interface IProgramGridPlacement {
  id: string;
  key: string;
  fullName: string;
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
  // The color of the superset this exercise is part of, absent when it is in none — or in one whose
  // only member it is.
  supersetColor?: string;
  scheme: IProgramGridSchemeToken[];
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

function displaySetsToTokens(groups: IDisplaySet[][]): IProgramGridSchemeToken[][] {
  return groups.reduce<IProgramGridSchemeToken[][]>((acc, group) => {
    const first = group[0];
    if (first == null) {
      return acc;
    }
    const tokens: IProgramGridSchemeToken[] = [{ text: `${group.length}x${first.reps}`, kind: "setPart" }];
    if (!first.dimWeight && first.weight != null) {
      tokens.push({ text: " ", kind: "separator" });
      tokens.push({ text: `${first.weight}${first.unit ?? ""}`, kind: "weight" });
    }
    if (first.rpe != null) {
      tokens.push({ text: " ", kind: "separator" });
      tokens.push({ text: `@${first.rpe}`, kind: "rpe" });
    }
    const timer = first.setTimer ?? first.timer;
    if (timer != null) {
      tokens.push({ text: " ", kind: "separator" });
      tokens.push({ text: `${timer}s`, kind: "timer" });
    }
    if (first.auto) {
      tokens.push({ text: " ", kind: "separator" });
      tokens.push({ text: "auto", kind: "auto" });
    }
    return [...acc, tokens];
  }, []);
}

function joinGroups(groups: IProgramGridSchemeToken[][]): IProgramGridSchemeToken[] {
  const separator: IProgramGridSchemeToken = { text: ", ", kind: "separator" };
  return groups.reduce<IProgramGridSchemeToken[]>(
    (acc, group, i) => (i === 0 ? group : [...acc, separator, ...group]),
    []
  );
}

// What a reusing line writes on top of what it reuses. `PlannerProgramExercise_sets` resolves a
// reuse by letting this line's own sets and globals win over the reused ones, so those two fields
// hold exactly the overrides — everything else came from the source and belongs in the source's
// cells, not here.
function overrideTokens(exercise: IPlannerProgramExercise, settings: ISettings): IProgramGridSchemeToken[] {
  const tokens: IProgramGridSchemeToken[] = [];
  const ownSets = exercise.setVariations[PlannerProgramExercise_currentSetVariationIndex(exercise)]?.sets ?? [];
  if (ownSets.length > 0) {
    tokens.push(
      ...joinGroups(
        displaySetsToTokens(PlannerProgramExercise_setsToDisplaySets(ownSets, true, exercise.globals, settings))
      )
    );
  }
  for (const token of globalsToTokens(exercise.globals)) {
    if (tokens.length > 0) {
      tokens.push({ text: " ", kind: "separator" });
    }
    tokens.push(token);
  }
  return tokens;
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

function schemeTokens(exercise: IPlannerProgramExercise, settings: ISettings): IProgramGridSchemeToken[] {
  const reuse = exercise.reuse;
  if (reuse == null) {
    const variation = PlannerProgramExercise_currentEvaluatedSetVariation(exercise);
    return joinGroups(
      displaySetsToTokens(PlannerProgramExercise_evaluatedSetsToDisplaySets(variation?.sets ?? [], settings))
    );
  }
  // A reuser's inherited numbers vary week to week, so they stay in the source's cells (see the
  // grid RFC's run-length rule) — but what this line overrides is written right here, and hiding it
  // made a line that rewrites the sets and the weight look identical to one that reuses wholesale.
  const weekDay = reuse.week != null ? `[${reuse.week}${reuse.day != null ? `:${reuse.day}` : ""}]` : "";
  const tokens: IProgramGridSchemeToken[] = [{ text: `...${reuse.fullName}${weekDay}`, kind: "reuse" }];
  const overrides = overrideTokens(exercise, settings);
  if (overrides.length > 0) {
    tokens.push({ text: " / ", kind: "separator" }, ...overrides);
  }
  return tokens;
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
          continue;
        }
        const placement: IProgramGridPlacement = {
          id: `${rowIndex}:${lane}:${weekIndex}`,
          sourceWeeks: [],
          key: exercise.key,
          fullName: exercise.fullName,
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
          supersetColor: supersetColorByLane[lane],
          scheme: schemeTokens(exercise, settings),
        };
        addSourceWeek(placement, byWeek, lane, weekIndex, exercise);
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

export function ProgramGrid_hasDay(row: IProgramGridRow, weekIndex: number): boolean {
  return row.namePerWeek[weekIndex] !== undefined;
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
