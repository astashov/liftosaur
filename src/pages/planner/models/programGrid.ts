import { IEvaluatedProgram } from "../../../models/program";
import { IDayData, ISettings } from "../../../types";
import { IPlannerProgramExercise } from "./types";
import {
  PlannerProgramExercise_currentEvaluatedSetVariation,
  PlannerProgramExercise_evaluatedSetsToDisplaySets,
} from "./plannerProgramExercise";

// Mirrors the editor's node→style mapping (liftoEditorBrain.ts:102) so a strip reads like the
// Liftoscript it stands for, in the same colors. The view owns the mapping to actual palette
// entries; this only says which kind of token each run of text is.
export type IProgramGridTokenKind = "setPart" | "weight" | "rpe" | "timer" | "auto" | "separator";

export interface IProgramGridSchemeToken {
  text: string;
  kind: IProgramGridTokenKind;
}

export interface IProgramGridColumn {
  weekIndex: number;
  name: string;
}

export interface IProgramGridRow {
  rowIndex: number;
  // Undefined where the week has no day in this row — a ragged program. `ProgramGrid_hasDay` is the
  // question every caller actually asks.
  namePerWeek: (string | undefined)[];
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
  isTemplate: boolean;
  isReuseSource: boolean;
  reuseOf?: string;
  isOverride: boolean;
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

export type IProgramGridDensity = 0 | 1 | 2;

interface IOpenRun {
  placement: IProgramGridPlacement;
  definingText: string;
}

function laneId(exercise: IPlannerProgramExercise, ordinal: number): string {
  return `${exercise.key}#${ordinal}`;
}

function displaySetsToTokens(exercise: IPlannerProgramExercise, settings: ISettings): IProgramGridSchemeToken[][] {
  const variation = PlannerProgramExercise_currentEvaluatedSetVariation(exercise);
  const groups = PlannerProgramExercise_evaluatedSetsToDisplaySets(variation?.sets ?? [], settings);
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
  }));
  const numberOfRows = program.weeks.reduce((max, week) => Math.max(max, week.days.length), 0);
  const rows: IProgramGridRow[] = [];
  for (let rowIndex = 0; rowIndex < numberOfRows; rowIndex += 1) {
    rows.push({
      rowIndex,
      namePerWeek: program.weeks.map((week) => week.days[rowIndex]?.name),
    });
  }

  const reuseSources = collectReuseSources(program);
  const placements: IProgramGridPlacement[] = [];

  for (let rowIndex = 0; rowIndex < numberOfRows; rowIndex += 1) {
    const lanes = buildLanes(program, rowIndex);
    const byWeek = program.weeks.map((_, weekIndex) => exercisesByLane(program, rowIndex, weekIndex));
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
        const schemeGroups = displaySetsToTokens(exercise, settings);
        const separator: IProgramGridSchemeToken = { text: ", ", kind: "separator" };
        const scheme = schemeGroups.reduce<IProgramGridSchemeToken[]>(
          (acc, group, i) => (i === 0 ? group : [...acc, separator, ...group]),
          []
        );
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
          isTemplate: !!exercise.notused,
          isReuseSource: reuseSources.has(exercise.fullName),
          reuseOf: exercise.reuse?.fullName,
          isOverride: false,
          scheme,
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
    source = -1;
    for (let back = weekIndex - 1; back >= 0; back -= 1) {
      const previous = byWeek[back][lane];
      if (previous != null && !previous.isRepeat && previous.text === exercise.text) {
        source = back;
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

export function ProgramGrid_counts(grid: IProgramGrid): { weeks: number; exercises: number; templates: number } {
  const exerciseKeys = new Set<string>();
  const templateKeys = new Set<string>();
  for (const placement of grid.placements) {
    (placement.isTemplate ? templateKeys : exerciseKeys).add(placement.key);
  }
  return { weeks: grid.columns.length, exercises: exerciseKeys.size, templates: templateKeys.size };
}

// Density decides whether the scheme shows at all, never how much of it — the full text is handed
// to the view so it ellipsizes only when it genuinely doesn't fit the column.
export function ProgramGrid_cellScheme(
  placement: IProgramGridPlacement,
  density: IProgramGridDensity
): IProgramGridSchemeToken[] {
  return density === 0 ? [] : placement.scheme;
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
    if (placements.some((s) => s.fullName === placement.fullName)) {
      sameExerciseIds.add(placement.id);
    } else if (placements.some((s) => s.reuseOf === placement.fullName || s.fullName === placement.reuseOf)) {
      linkedIds.add(placement.id);
    }
  }
  return { selectedIds, placements, sameExerciseIds, linkedIds };
}

export function ProgramGrid_isRelated(selection: IProgramGridSelection | undefined, placementId: string): boolean {
  if (selection == null) {
    return true;
  }
  return (
    selection.selectedIds.has(placementId) ||
    selection.sameExerciseIds.has(placementId) ||
    selection.linkedIds.has(placementId)
  );
}
