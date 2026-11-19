import {
  IDaySetData,
  IExerciseType,
  IHistoryEntry,
  IHistoryRecord,
  IPercentage,
  IPlannerProgram,
  IProgram,
  ISettings,
  IWeight,
} from "../types";
import { IPlannerProgramExerciseEvaluatedSet, IPlannerProgramExerciseWithType } from "../pages/planner/models/types";
import {
  PlannerProgramExercise_currentEvaluatedSetVariation,
  PlannerProgramExercise_currentEvaluatedSetVariationIndex,
} from "../pages/planner/models/plannerProgramExercise";
import { ObjectUtils_isEqual } from "../utils/object";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_getProgramDay,
  Program_getProgramDayUsedExercises,
} from "./program";
import { IProgramRewriteResult, ProgramRewrite_instances } from "./programRewrite";
import { ProgramSet_getEvaluatedWeight } from "./programSet";
import { Equipment_getUnitOrDefaultForExerciseType } from "./equipment";
import { Weight_convertTo, Weight_eqNull, Weight_is, Weight_multiply, Weight_roundConvertTo } from "./weight";
import { IWeightDeviation, WeightDeviation_hint } from "./weightDeviation";
import { PP_iterate2 } from "./pp";

export interface IProgramWeightTarget {
  programId: string;
  planner: IPlannerProgram;
  startTime: number;
  day: number;
  programExerciseId: string;
  setId: string;
}

export interface IProgramWeightSection {
  key: string;
  dayName?: string;
  variationLabel?: string;
  rows: IProgramWeightRow[];
}

export interface IProgramWeightRow {
  id: string;
  dayInWeek: number;
  dayName: string;
  setVariation: number;
  fromSet: number;
  toSet: number;
  repsLabel: string;
  oldWeight: IWeight | IPercentage | undefined;
  newWeight: IWeight | undefined;
  isEditable: boolean;
  isTrigger: boolean;
  addresses: IDaySetData[];
}

export interface IProgramWeightTab {
  fromWeek: number;
  toWeek: number;
  rows: IProgramWeightRow[];
}

export type IProgramWeightDraft = Partial<Record<string, IWeight | undefined>>;

export type IProgramWeightApplyResult =
  | { program: IProgram; entry: IHistoryEntry; entryIndex: number }
  | { error: string };

export function ProgramWeightScale_draftKey(tabIndex: number, row: IProgramWeightRow): string {
  return `${tabIndex}:${row.id}`;
}

export function ProgramWeightScale_value(
  tabIndex: number,
  row: IProgramWeightRow,
  draft: IProgramWeightDraft
): IWeight | undefined {
  const key = ProgramWeightScale_draftKey(tabIndex, row);
  return key in draft ? draft[key] : row.newWeight;
}

export function ProgramWeightScale_tabs(
  evaluatedProgram: IEvaluatedProgram,
  progress: IHistoryRecord,
  programExercise: IPlannerProgramExerciseWithType,
  deviation: IWeightDeviation,
  settings: ISettings
): IProgramWeightTab[] {
  if (ProgramWeightScale_dayProgramExercise(evaluatedProgram, progress.day, programExercise.key) == null) {
    return [];
  }
  const triggerAddress = triggerAddressFor(evaluatedProgram, progress, programExercise.key, deviation);
  const weekRows: IProgramWeightRow[][] = evaluatedProgram.weeks.map(() => []);
  PP_iterate2(evaluatedProgram.weeks, (exercise, weekIndex, dayInWeekIndex) => {
    if (exercise.key !== programExercise.key) {
      return;
    }
    const dayName = evaluatedProgram.weeks[weekIndex].days[dayInWeekIndex].name;
    exercise.evaluatedSetVariations.forEach((variation, variationIndex) => {
      variation.sets.forEach((set, setIndex) => {
        const address: IDaySetData = {
          week: weekIndex + 1,
          dayInWeek: dayInWeekIndex + 1,
          setVariation: variationIndex + 1,
          set: setIndex + 1,
        };
        const isTrigger = triggerAddress != null && isSameAddress(address, triggerAddress);
        weekRows[weekIndex].push(buildRow(address, dayName, set, isTrigger, programExercise, deviation, settings));
      });
    });
  });
  return mergeWeeks(weekRows.map(mergeSets));
}

export interface IProgramWeightSheet {
  target: IProgramWeightTarget;
  deviation: IWeightDeviation;
  exerciseType: IExerciseType;
  tabs: IProgramWeightTab[];
  currentTabIndex: number;
}

export function ProgramWeightScale_sheet(
  program: IProgram | undefined,
  progress: IHistoryRecord | undefined,
  programExerciseId: string,
  setId: string,
  settings: ISettings
): IProgramWeightSheet | undefined {
  const entry = progress?.entries.find((e) => e.programExerciseId === programExerciseId);
  const planner = program?.planner;
  if (program == null || planner == null || progress == null || entry == null || progress.programId !== program.id) {
    return undefined;
  }
  const evaluated = Program_evaluate(program, settings);
  const programExercise = ProgramWeightScale_dayProgramExercise(evaluated, progress.day, programExerciseId);
  const deviation = WeightDeviation_hint(entry, programExercise, settings);
  if (programExercise == null || deviation == null || deviation.setId !== setId) {
    return undefined;
  }
  const tabs = ProgramWeightScale_tabs(evaluated, progress, programExercise, deviation, settings);
  if (tabs.length === 0) {
    return undefined;
  }
  return {
    target: {
      programId: program.id,
      planner,
      startTime: progress.startTime,
      day: progress.day,
      programExerciseId,
      setId,
    },
    deviation,
    exerciseType: entry.exercise,
    tabs,
    currentTabIndex: ProgramWeightScale_currentTabIndex(
      tabs,
      Program_getProgramDay(evaluated, progress.day)?.dayData.week ?? 1
    ),
  };
}

export function ProgramWeightScale_sections(tab: IProgramWeightTab): IProgramWeightSection[] {
  const daysWithVariations = new Set(tab.rows.filter((r) => r.setVariation > 1).map((r) => r.dayInWeek));
  const sections: IProgramWeightSection[] = [];
  for (const r of tab.rows) {
    const last = sections[sections.length - 1];
    const lastRow = last?.rows[last.rows.length - 1];
    if (lastRow != null && lastRow.dayInWeek === r.dayInWeek && lastRow.setVariation === r.setVariation) {
      last.rows.push(r);
      continue;
    }
    sections.push({
      key: `${r.dayInWeek}-${r.setVariation}`,
      dayName: lastRow?.dayInWeek === r.dayInWeek ? undefined : r.dayName,
      variationLabel: daysWithVariations.has(r.dayInWeek) ? `Variation ${r.setVariation}` : undefined,
      rows: [r],
    });
  }
  return sections;
}

export function ProgramWeightScale_draftValue(value: IWeight | IPercentage | undefined): IWeight | undefined {
  return Weight_is(value) ? value : undefined;
}

export function ProgramWeightScale_setLabel(row: IProgramWeightRow): string {
  return row.fromSet === row.toSet ? `Set ${row.fromSet}` : `Set ${row.fromSet}-${row.toSet}`;
}

export function ProgramWeightScale_tabLabel(tab: IProgramWeightTab): string {
  return tab.fromWeek === tab.toWeek ? `Week ${tab.fromWeek}` : `Weeks ${tab.fromWeek}–${tab.toWeek}`;
}

export function ProgramWeightScale_currentTabIndex(tabs: IProgramWeightTab[], week: number): number {
  const index = tabs.findIndex((tab) => tab.fromWeek <= week && week <= tab.toWeek);
  return index === -1 ? 0 : index;
}

export function ProgramWeightScale_canApply(tabs: IProgramWeightTab[], draft: IProgramWeightDraft): boolean {
  return tabs.every((tab, tabIndex) =>
    tab.rows.every((r) => !r.isEditable || ProgramWeightScale_value(tabIndex, r, draft) != null)
  );
}

export function ProgramWeightScale_rewrite(
  planner: IPlannerProgram,
  key: string,
  tabs: IProgramWeightTab[],
  draft: IProgramWeightDraft,
  settings: ISettings
): IProgramRewriteResult {
  const changes: { address: IDaySetData; weight: IWeight }[] = [];
  tabs.forEach((tab, tabIndex) => {
    for (const r of tab.rows) {
      const weight = ProgramWeightScale_value(tabIndex, r, draft);
      if (r.isEditable && weight != null && !Weight_eqNull(weight, r.oldWeight)) {
        changes.push(...r.addresses.map((address) => ({ address, weight })));
      }
    }
  });
  return ProgramRewrite_instances(planner, settings, (evaluated) => {
    PP_iterate2(evaluated.weeks, (exercise, weekIndex, dayInWeekIndex) => {
      if (exercise.key !== key) {
        return;
      }
      for (const { address, weight } of changes) {
        if (address.week === weekIndex + 1 && address.dayInWeek === dayInWeekIndex + 1) {
          const set = exercise.evaluatedSetVariations[address.setVariation - 1]?.sets[address.set - 1];
          if (set != null) {
            set.weight = weight;
          }
        }
      }
    });
  });
}

export function ProgramWeightScale_retargetCompleted(
  entry: IHistoryEntry,
  programExercise: IPlannerProgramExerciseWithType,
  settings: ISettings
): IHistoryEntry {
  const programSets = PlannerProgramExercise_currentEvaluatedSetVariation(programExercise)?.sets ?? [];
  const sets = entry.sets.map((set) => {
    const index = set.programSetIndex;
    if (!set.isCompleted || set.askWeight || index == null || !isUniqueProgramSetIndex(entry, index)) {
      return set;
    }
    const programSet = programSets[index];
    if (programSet == null || programSet.askWeight || !Weight_is(programSet.weight)) {
      return set;
    }
    return {
      ...set,
      originalWeight: programSet.weight,
      weight: ProgramSet_getEvaluatedWeight(programSet, programExercise.exerciseType, settings),
    };
  });
  return { ...entry, sets };
}

export function ProgramWeightScale_apply(
  program: IProgram,
  progress: IHistoryRecord | undefined,
  target: IProgramWeightTarget,
  tabs: IProgramWeightTab[],
  draft: IProgramWeightDraft,
  settings: ISettings
): IProgramWeightApplyResult {
  if (
    progress == null ||
    progress.startTime !== target.startTime ||
    progress.programId !== target.programId ||
    progress.day !== target.day ||
    program.planner == null
  ) {
    return { error: "This workout has changed. Open the sheet again to update the program." };
  }
  if (!ObjectUtils_isEqual(program.planner, target.planner)) {
    return { error: "The program has changed. Open the sheet again to update it." };
  }
  if (!ProgramWeightScale_canApply(tabs, draft)) {
    return { error: "Fill in every weight before applying." };
  }
  const entryIndex = progress.entries.findIndex((e) => e.programExerciseId === target.programExerciseId);
  const entry = progress.entries[entryIndex];
  if (entry == null || !entry.sets.some((s) => s.id === target.setId)) {
    return { error: "This exercise has changed. Open the sheet again to update the program." };
  }
  const result = ProgramWeightScale_rewrite(program.planner, target.programExerciseId, tabs, draft, settings);
  if ("error" in result) {
    return { error: result.error.message };
  }
  const newProgram: IProgram = { ...program, planner: result.planner };
  const evaluated = Program_evaluate(newProgram, settings);
  const programExercise = ProgramWeightScale_dayProgramExercise(evaluated, target.day, target.programExerciseId);
  if (programExercise == null) {
    return { error: "This exercise is not in today's program day anymore." };
  }
  return {
    program: newProgram,
    entry: ProgramWeightScale_retargetCompleted(entry, programExercise, settings),
    entryIndex,
  };
}

export function ProgramWeightScale_dayProgramExercise(
  evaluatedProgram: IEvaluatedProgram,
  day: number,
  key: string
): IPlannerProgramExerciseWithType | undefined {
  const programDay = Program_getProgramDay(evaluatedProgram, day);
  return programDay ? Program_getProgramDayUsedExercises(programDay).find((e) => e.key === key) : undefined;
}

function buildRow(
  address: IDaySetData,
  dayName: string,
  set: IPlannerProgramExerciseEvaluatedSet,
  isTrigger: boolean,
  programExercise: IPlannerProgramExerciseWithType,
  deviation: IWeightDeviation,
  settings: ISettings
): IProgramWeightRow {
  const oldWeight = set.weight;
  const isEditable = Weight_is(oldWeight) && !set.askWeight;
  let newWeight: IWeight | undefined;
  if (isEditable && isTrigger) {
    newWeight = Weight_convertTo(deviation.completedWeight, oldWeight.unit);
  } else if (isEditable) {
    const unit = Equipment_getUnitOrDefaultForExerciseType(settings, programExercise.exerciseType);
    const scaled = Weight_multiply(oldWeight, deviation.ratio);
    newWeight = Weight_convertTo(
      Weight_roundConvertTo(scaled, settings, unit, programExercise.exerciseType),
      oldWeight.unit
    );
  }
  return {
    id: `${address.dayInWeek}-${address.setVariation}-${address.set}`,
    dayInWeek: address.dayInWeek,
    dayName,
    setVariation: address.setVariation,
    fromSet: address.set,
    toSet: address.set,
    repsLabel: repsLabel(set),
    oldWeight,
    newWeight,
    isEditable,
    isTrigger,
    addresses: [address],
  };
}

function repsLabel(set: IPlannerProgramExerciseEvaluatedSet): string {
  const range = set.minrep != null && set.minrep !== set.maxrep ? `${set.minrep}-` : "";
  return `${range}${set.maxrep ?? ""}${set.isAmrap ? "+" : ""}`;
}

function triggerAddressFor(
  evaluatedProgram: IEvaluatedProgram,
  progress: IHistoryRecord,
  key: string,
  deviation: IWeightDeviation
): IDaySetData | undefined {
  const programDay = Program_getProgramDay(evaluatedProgram, progress.day);
  const exercise = programDay?.exercises.find((e) => e.key === key);
  if (programDay == null || exercise == null) {
    return undefined;
  }
  return {
    week: programDay.dayData.week,
    dayInWeek: programDay.dayData.dayInWeek,
    setVariation: PlannerProgramExercise_currentEvaluatedSetVariationIndex(exercise) + 1,
    set: deviation.programSetIndex + 1,
  };
}

function isSameAddress(a: IDaySetData, b: IDaySetData): boolean {
  return a.week === b.week && a.dayInWeek === b.dayInWeek && a.setVariation === b.setVariation && a.set === b.set;
}

function isUniqueProgramSetIndex(entry: IHistoryEntry, index: number): boolean {
  return entry.sets.filter((s) => s.programSetIndex === index).length === 1;
}

function weekSignature(rows: IProgramWeightRow[]): string {
  return JSON.stringify(rows.map((r) => [r.id, r.toSet, r.dayName, r.repsLabel, r.oldWeight, r.isEditable]));
}

function mergeSets(rows: IProgramWeightRow[]): IProgramWeightRow[] {
  const merged: IProgramWeightRow[] = [];
  for (const r of rows) {
    const last = merged[merged.length - 1];
    const canMerge =
      last != null &&
      last.dayInWeek === r.dayInWeek &&
      last.setVariation === r.setVariation &&
      last.toSet + 1 === r.fromSet &&
      last.repsLabel === r.repsLabel &&
      last.isEditable === r.isEditable &&
      Weight_eqNull(last.oldWeight, r.oldWeight) &&
      Weight_eqNull(last.newWeight, r.newWeight);
    if (canMerge) {
      last.toSet = r.toSet;
      last.isTrigger = last.isTrigger || r.isTrigger;
      last.addresses.push(...r.addresses);
    } else {
      merged.push({ ...r, addresses: [...r.addresses] });
    }
  }
  return merged;
}

function mergeWeeks(weekRows: IProgramWeightRow[][]): IProgramWeightTab[] {
  const tabs: IProgramWeightTab[] = [];
  let previousSignature: string | undefined;
  weekRows.forEach((rows, weekIndex) => {
    const week = weekIndex + 1;
    const signature = weekSignature(rows);
    const last = tabs[tabs.length - 1];
    if (rows.length > 0 && last != null && last.toWeek === week - 1 && signature === previousSignature) {
      last.toWeek = week;
      last.rows.forEach((r, i) => {
        r.addresses.push(...rows[i].addresses);
        if (rows[i].isTrigger) {
          r.isTrigger = true;
          r.newWeight = rows[i].newWeight;
        }
      });
    } else if (rows.length > 0) {
      tabs.push({ fromWeek: week, toWeek: week, rows });
    }
    previousSignature = signature;
  });
  return tabs;
}
