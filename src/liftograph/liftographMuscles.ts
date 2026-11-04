import { IHistoryRecord, ISettings } from "../types";
import { Muscle_getAvailableMuscleGroups, Muscle_getMuscleGroupName } from "../models/muscle";
import { MuscleRangeDisplay_status } from "../models/muscleRangeDisplay";
import { IMuscleGroupOrderRow, MuscleGroupOrder_sections } from "../models/muscleGroupOrder";
import { n } from "../utils/math";
import { IMusclePoints } from "../models/ungroupedMuscles";
import { IMuscleGroupSetSplit } from "../pages/planner/models/types";
import {
  WeekInsightsUtils_calculateSetResults,
  WeekInsightsUtils_ungroupedMuscleSets,
} from "../utils/weekInsightsUtils";
import { ObjectUtils_keys } from "../utils/object";
import { ILiftographWidget } from "./liftographCompile";
import { ILiftographSeriesEval, LiftographSeriesEval_rows } from "./liftographSeriesEval";
import { ILiftographWindow, LiftographShape_window } from "./liftographShape";

type IMusclesWidget = Extract<ILiftographWidget, { kind: "muscles" }>;

export interface ILiftographMusclesResult {
  window: ILiftographWindow;
  muscleGroup: Partial<IMuscleGroupSetSplit>;
  ungroupedSets: IMusclePoints;
}

function windowRecords(
  widget: IMusclesWidget,
  evaluation: ILiftographSeriesEval
): {
  window: ILiftographWindow;
  records: IHistoryRecord[];
} {
  const all = LiftographSeriesEval_rows(evaluation, { type: "workout" });
  const window = LiftographShape_window(evaluation.input.today, widget.range, all[0]?.ts);
  const rows = widget.source != null ? LiftographSeriesEval_rows(evaluation, widget.source) : all;
  const records = rows.flatMap((row) =>
    row.type === "workout" && row.ts >= window.from && row.ts <= window.to ? [row.record] : []
  );
  return { window, records };
}

export function LiftographMuscles_evaluate(
  widget: IMusclesWidget,
  evaluation: ILiftographSeriesEval
): ILiftographMusclesResult {
  const { settings } = evaluation.input;
  const { window, records } = windowRecords(widget, evaluation);
  const perWeek = 7 / window.days;
  const results = WeekInsightsUtils_calculateSetResults(records, settings);
  const muscleGroup: Partial<IMuscleGroupSetSplit> = {};
  for (const key of ObjectUtils_keys(results.muscleGroup)) {
    const split = results.muscleGroup[key];
    muscleGroup[key] = { ...split, strength: split.strength * perWeek, hypertrophy: split.hypertrophy * perWeek };
  }
  const ungroupedSets: IMusclePoints = {};
  const ungrouped = WeekInsightsUtils_ungroupedMuscleSets(records, settings);
  for (const muscle of ObjectUtils_keys(ungrouped)) {
    ungroupedSets[muscle] = (ungrouped[muscle] ?? 0) * perWeek;
  }
  return { window, muscleGroup, ungroupedSets };
}

export interface ILiftographMusclesLayout {
  showMap: boolean;
  showList: boolean;
  isSideBySide: boolean;
  showSummary: boolean;
}

const SIDE_BY_SIDE_MIN_WIDTH = 300;

export function LiftographMuscles_layout(widget: IMusclesWidget, width: number): ILiftographMusclesLayout {
  const showMap = widget.show.indexOf("map") !== -1;
  const showList = widget.show.indexOf("sets") !== -1;
  const isSideBySide = showMap && showList && width >= SIDE_BY_SIDE_MIN_WIDTH;
  return { showMap, showList, isSideBySide, showSummary: showMap && (!showList || isSideBySide) };
}

export function LiftographMuscles_sections(
  widget: IMusclesWidget,
  result: ILiftographMusclesResult,
  settings: ISettings
): IMuscleGroupOrderRow[][] {
  if (widget.groups == null) {
    return MuscleGroupOrder_sections(result.muscleGroup, settings);
  }
  return [
    widget.groups.map((muscleGroup) => ({
      muscleGroup,
      split: result.muscleGroup[muscleGroup] ?? { strength: 0, hypertrophy: 0, exercises: [], frequency: {} },
    })),
  ];
}

export function LiftographMuscles_summary(
  widget: IMusclesWidget,
  result: ILiftographMusclesResult,
  settings: ISettings
): { title: string; detail?: string } | undefined {
  const ranged = (widget.groups ?? Muscle_getAvailableMuscleGroups(settings)).flatMap((key) => {
    const split = result.muscleGroup[key];
    const range = settings.planner.weeklyRangeSets[key];
    if (range == null) {
      return [];
    }
    const sets = (split?.strength ?? 0) + (split?.hypertrophy ?? 0);
    return [{ key, sets, range, direction: MuscleRangeDisplay_status(sets, range).direction }];
  });
  if (ranged.length === 0) {
    return undefined;
  }
  const inRange = ranged.filter((group) => group.direction === "").length;
  const lowest = ranged
    .filter((group) => group.direction === "↑" && group.range[0] > 0)
    .sort((a, b) => a.sets / a.range[0] - b.sets / b.range[0])[0];
  return {
    title: `${inRange} of ${ranged.length} in range`,
    detail:
      lowest != null
        ? `Lowest: ${Muscle_getMuscleGroupName(lowest.key, settings)} ${n(lowest.sets, 0)} · ${lowest.range[0]}–${lowest.range[1]}`
        : undefined,
  };
}
