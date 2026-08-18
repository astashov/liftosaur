import { IEvaluatedProgram } from "../../../models/program";
import { IDayData, ISettings } from "../../../types";
import { IPlannerProgramExercise } from "./types";
import {
  PlannerProgramExercise_currentEvaluatedSetVariation,
  PlannerProgramExercise_evaluatedSetsToDisplaySets,
} from "./plannerProgramExercise";

export type IProgramGridRunKind = "single" | "repeat" | "identical";

// Mirrors the editor's node→style mapping (liftoEditorBrain.ts:105-113) so a strip reads like the
// Liftoscript it stands for. The view owns the actual colors.
export type IProgramGridTokenKind = "setPart" | "weight" | "rpe" | "timer" | "auto" | "separator";

export interface IProgramGridSchemeToken {
  text: string;
  kind: IProgramGridTokenKind;
}

export interface IProgramGridColumn {
  weekIndex: number;
  name: string;
  numberOfDays: number;
}

export interface IProgramGridRow {
  rowIndex: number;
  namePerWeek: (string | undefined)[];
  weekIndexes: number[];
}

export interface IProgramGridPlacement {
  id: string;
  key: string;
  fullName: string;
  shortName: string;
  label?: string;
  // The day this run is authored in — what every action on the placement needs to address it.
  dayData: Required<IDayData>;
  rowIndex: number;
  laneIndex: number;
  colStart: number;
  colEnd: number;
  runKind: IProgramGridRunKind;
  repeatSpan?: [number, number];
  isTemplate: boolean;
  isReuser: boolean;
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
  counts: { weeks: number; exercises: number; templates: number };
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

export function ProgramGrid_schemeToString(tokens: IProgramGridSchemeToken[]): string {
  return tokens.map((t) => t.text).join("");
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
    numberOfDays: week.days.length,
  }));
  const numberOfRows = program.weeks.reduce((max, week) => Math.max(max, week.days.length), 0);
  const rows: IProgramGridRow[] = [];
  for (let rowIndex = 0; rowIndex < numberOfRows; rowIndex += 1) {
    rows.push({
      rowIndex,
      namePerWeek: program.weeks.map((week) => week.days[rowIndex]?.name),
      weekIndexes: program.weeks.reduce<number[]>(
        (acc, week, weekIndex) => (week.days[rowIndex] != null ? [...acc, weekIndex] : acc),
        []
      ),
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
          if (!exercise.isRepeat) {
            open.placement.runKind = "identical";
          }
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
          key: exercise.key,
          fullName: exercise.fullName,
          shortName: exercise.shortName,
          label: exercise.label,
          dayData: exercise.dayData,
          rowIndex,
          laneIndex,
          colStart: weekIndex,
          colEnd: weekIndex,
          runKind: exercise.repeating.length > 1 ? "repeat" : "single",
          repeatSpan:
            exercise.repeating.length > 1
              ? [Math.min(...exercise.repeating) - 1, Math.max(...exercise.repeating) - 1]
              : undefined,
          isTemplate: !!exercise.notused,
          isReuser: exercise.reuse?.fullName != null,
          isReuseSource: reuseSources.has(exercise.fullName),
          reuseOf: exercise.reuse?.fullName,
          isOverride: false,
          scheme,
        };
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

  const exerciseKeys = new Set<string>();
  const templateKeys = new Set<string>();
  for (const placement of placements) {
    if (placement.isTemplate) {
      templateKeys.add(placement.key);
    } else {
      exerciseKeys.add(placement.key);
    }
  }

  return {
    columns,
    rows,
    placements,
    errors,
    counts: { weeks: columns.length, exercises: exerciseKeys.size, templates: templateKeys.size },
  };
}

// Density decides whether the scheme shows at all, never how much of it — the full text is handed
// to the view so it ellipsizes only when it genuinely doesn't fit the column.
export function ProgramGrid_cellScheme(
  placement: IProgramGridPlacement,
  density: IProgramGridDensity
): IProgramGridSchemeToken[] {
  return density === 0 ? [] : placement.scheme;
}

export function ProgramGrid_placementsAt(
  grid: IProgramGrid,
  rowIndex: number,
  weekIndex: number
): IProgramGridPlacement[] {
  return grid.placements.filter((p) => p.rowIndex === rowIndex && p.colStart <= weekIndex && p.colEnd >= weekIndex);
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
