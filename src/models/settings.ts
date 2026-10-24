import {
  ISettings,
  IPlannerSettings,
  IAllCustomExercises,
  ITargetType,
  targetTypes,
  IProgram,
  IExerciseType,
  IWeight,
  IWebEditorSettings,
  IUnit,
  IMuscleGroupsSettings,
} from "../types";
import { EquipmentDefaults_build } from "./equipmentDefaults";
import { EquipmentUnits_follow } from "./equipmentUnits";
import { Weight_print } from "./weight";
import { IExportedProgram, Program_evaluate, Program_getAllUsedProgramExercises } from "./program";
import { ObjectUtils_filter, ObjectUtils_pick } from "../utils/object";
import { lb } from "lens-shmens";
import { updateSettings } from "./state";
import { IDispatch } from "../ducks/types";
import { IExercise, Exercise_toKey, Exercise_get, Exercise_nameWithEquipment } from "./exercise";
import { CollectionUtils_uniqByExpr, CollectionUtils_sort } from "../utils/collection";
import { ProgramExercise_doesUse1RM } from "./programExercise";
import { MuscleRangePresets_apply } from "./muscleRangePresets";
import { IExercisePickerSettings } from "../components/exercisePicker/exercisePickerSettings";

export function Settings_programContentBuild(): Pick<ISettings, "timers" | "units" | "planner"> {
  return {
    timers: {
      warmup: 90,
      workout: 180,
      reminder: 900,
      getReady: 5,
    },
    units: "lb",
    planner: Settings_buildPlannerSettings(),
  };
}

export function Settings_build(units: IUnit = "lb"): ISettings {
  return {
    ...Settings_programContentBuild(),
    units,
    graphsSettings: {
      isSameXAxis: false,
      isWithBodyweight: false,
      isWithOneRm: true,
    },
    exerciseData: {},
    graphOptions: {},
    exerciseStatsSettings: {
      ascendingSort: false,
    },
    gyms: [
      {
        vtype: "gym",
        id: "default",
        name: "Main",
        equipment: EquipmentDefaults_build(units),
      },
    ],
    // Builds before 2026-09-26 require deletedGyms in VSettings. Drop with its removal migration.
    deletedGyms: [],
    volume: 1.0,
    vibration: false,
    startWeekFromMonday: false,
    lengthUnits: "in",
    workoutSettings: {
      targetType: "target",
    },
    statsEnabled: { weight: { weight: true }, length: {}, percentage: {} },
    exercises: {},
    graphs: { graphs: [], vtype: "graphs" },
    planner: Settings_buildPlannerSettings(),
    muscleGroups: {
      vtype: "muscle_groups_settings",
      data: {},
    },
  };
}

export function Settings_buildPlannerSettings(): IPlannerSettings {
  const planner = MuscleRangePresets_apply(
    {
      strengthSetsPct: 30,
      hypertrophySetsPct: 70,
      weeklyRangeSets: {},
      weeklyFrequency: {},
      synergistMultiplier: 0.5,
    },
    "moderate"
  );
  // Builds before the muscle group split list shoulders, back and forearms, and show empty ranges without these.
  return {
    ...planner,
    weeklyRangeSets: { ...planner.weeklyRangeSets, shoulders: [10, 12], back: [10, 12], forearms: [10, 12] },
    weeklyFrequency: { ...planner.weeklyFrequency, shoulders: 2, back: 2, forearms: 2 },
  };
}

export function Settings_applyExportedProgram(settings: ISettings, exportedProgram: IExportedProgram): ISettings {
  const result = {
    ...settings,
    exercises: {
      ...settings.exercises,
      ...exportedProgram.customExercises,
    },
    timers: {
      ...settings.timers,
      workout: settings.timers.workout ?? exportedProgram.settings.timers?.workout,
      warmup: settings.timers.warmup ?? exportedProgram.settings.timers?.warmup,
    },
    exerciseData: { ...settings.exerciseData, ...exportedProgram.settings.exerciseData },
    workoutSettings: { ...settings.workoutSettings, ...exportedProgram.settings.workoutSettings },
  };
  return result;
}

function mergeWithDeletions<T>(
  stored: Record<string, T>,
  update: Record<string, T> | undefined,
  deletedKeys: string[] | undefined
): Record<string, T> {
  const result = { ...stored, ...update };
  for (const key of deletedKeys || []) {
    delete result[key];
  }
  return result;
}

function applyPlannerUpdate(planner: IPlannerSettings, update: IWebEditorSettings): IPlannerSettings {
  const changes = update.plannerUpdate ?? update.planner;
  if (changes == null) {
    return planner;
  }
  return {
    ...planner,
    ...changes,
    weeklyRangeSets: { ...planner.weeklyRangeSets, ...changes.weeklyRangeSets },
    weeklyFrequency: { ...planner.weeklyFrequency, ...changes.weeklyFrequency },
  };
}

function applyMuscleGroupsUpdate(
  muscleGroups: IMuscleGroupsSettings,
  update: IWebEditorSettings,
  deletedKeys: string[] | undefined
): IMuscleGroupsSettings {
  if (update.muscleGroupsUpdate != null || deletedKeys?.length) {
    return { ...muscleGroups, data: mergeWithDeletions(muscleGroups.data, update.muscleGroupsUpdate, deletedKeys) };
  }
  return update.muscleGroups ?? muscleGroups;
}

export function Settings_applyWebEditorSettings(
  settings: ISettings,
  update: IWebEditorSettings,
  deleted?: { exerciseDataKeys?: string[]; starredExerciseKeys?: string[]; muscleGroupKeys?: string[] }
): ISettings {
  // A dictionary merge cannot express a removal, so clearing an exercise override or unstarring
  // needs its keys named explicitly - otherwise the stored entry is merged straight back in
  const exerciseData = mergeWithDeletions(settings.exerciseData, update.exerciseData, deleted?.exerciseDataKeys);
  const starredExercises =
    update.starredExercises != null || deleted?.starredExerciseKeys?.length
      ? mergeWithDeletions(settings.starredExercises || {}, update.starredExercises, deleted?.starredExerciseKeys)
      : settings.starredExercises;

  const units = update.units ?? settings.units;
  return {
    ...settings,
    units,
    gyms: units !== settings.units ? EquipmentUnits_follow(settings.gyms, units) : settings.gyms,
    // `workout: null` means the user turned the rest timer off, so presence of the key decides, not truthiness
    timers: update.timers != null ? { ...settings.timers, ...update.timers } : settings.timers,
    planner: applyPlannerUpdate(settings.planner, update),
    muscleGroups: applyMuscleGroupsUpdate(settings.muscleGroups, update, deleted?.muscleGroupKeys),
    exerciseData,
    workoutSettings:
      update.workoutSettings != null
        ? { ...settings.workoutSettings, ...update.workoutSettings }
        : settings.workoutSettings,
    exercises: update.exercises != null ? { ...settings.exercises, ...update.exercises } : settings.exercises,
    starredExercises,
  };
}

export function Settings_webEditorInitial(
  stored: ISettings | undefined,
  programCustomExercises: IAllCustomExercises | undefined
): ISettings {
  const settings = Settings_build(stored?.units);
  return {
    ...settings,
    exercises: { ...settings.exercises, ...stored?.exercises, ...programCustomExercises },
    timers: { ...settings.timers, workout: stored?.timers.workout ?? settings.timers.workout },
    planner: stored?.planner || settings.planner,
    muscleGroups: stored?.muscleGroups || settings.muscleGroups,
    exerciseData: { ...settings.exerciseData, ...stored?.exerciseData },
    workoutSettings: { ...settings.workoutSettings, ...stored?.workoutSettings },
    starredExercises: stored?.starredExercises,
  };
}

export interface IWebEditorSettingsRequest {
  settings: IWebEditorSettings;
  deletedExerciseDataKeys: string[];
  deletedStarredExerciseKeys: string[];
  deletedMuscleGroupKeys: string[];
}

const pickerSettingsKeys: (keyof IExercisePickerSettings)[] = [
  "shouldKeepProgramExerciseId",
  "pickerSort",
  "shouldShowInvisibleEquipment",
];

function isSameValue(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (a == null || b == null || typeof a !== "object" || typeof b !== "object") {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function changedEntries<T>(
  initial: Partial<Record<string, T>>,
  current: Partial<Record<string, T>>
): { changed: Record<string, T>; deletedKeys: string[] } {
  const changed: Record<string, T> = {};
  for (const key of Object.keys(current)) {
    const value = current[key];
    if (value != null && !isSameValue(value, initial[key])) {
      changed[key] = value;
    }
  }
  const deletedKeys = Object.keys(initial).filter((key) => initial[key] != null && current[key] == null);
  return { changed, deletedKeys };
}

const plannerScalarKeys: ("synergistMultiplier" | "strengthSetsPct" | "hypertrophySetsPct")[] = [
  "synergistMultiplier",
  "strengthSetsPct",
  "hypertrophySetsPct",
];

function plannerUpdate(initial: IPlannerSettings, current: IPlannerSettings): Partial<IPlannerSettings> {
  const result: Partial<IPlannerSettings> = ObjectUtils_pick(
    current,
    plannerScalarKeys.filter((key) => current[key] !== initial[key])
  );
  const weeklyRangeSets = changedEntries(initial.weeklyRangeSets, current.weeklyRangeSets).changed;
  if (Object.keys(weeklyRangeSets).length > 0) {
    result.weeklyRangeSets = weeklyRangeSets;
  }
  const weeklyFrequency = changedEntries(initial.weeklyFrequency, current.weeklyFrequency).changed;
  if (Object.keys(weeklyFrequency).length > 0) {
    result.weeklyFrequency = weeklyFrequency;
  }
  return result;
}

// Stars, picker settings, custom exercises, planner ranges and muscle groups are sent as a diff against page
// load, so a stale tab cannot overwrite what the app changed since.
export function Settings_webEditorSettingsRequest(initial: ISettings, current: ISettings): IWebEditorSettingsRequest {
  const exercises = changedEntries(initial.exercises, current.exercises).changed;
  const starred = changedEntries(initial.starredExercises || {}, current.starredExercises || {});
  const muscleGroups = changedEntries(initial.muscleGroups.data, current.muscleGroups.data);
  const planner = plannerUpdate(initial.planner, current.planner);
  const pickerSettings = ObjectUtils_pick(
    current.workoutSettings,
    pickerSettingsKeys.filter((key) => current.workoutSettings[key] !== initial.workoutSettings[key])
  );
  return {
    settings: {
      units: current.units,
      timers: { workout: current.timers.workout },
      exerciseData: current.exerciseData,
      ...(Object.keys(planner).length > 0 ? { plannerUpdate: planner } : {}),
      ...(Object.keys(muscleGroups.changed).length > 0 ? { muscleGroupsUpdate: muscleGroups.changed } : {}),
      ...(Object.keys(exercises).length > 0 ? { exercises } : {}),
      ...(Object.keys(starred.changed).length > 0 ? { starredExercises: starred.changed } : {}),
      ...(Object.keys(pickerSettings).length > 0 ? { workoutSettings: pickerSettings } : {}),
    },
    deletedExerciseDataKeys: changedEntries(initial.exerciseData, current.exerciseData).deletedKeys,
    deletedStarredExerciseKeys: starred.deletedKeys,
    deletedMuscleGroupKeys: muscleGroups.deletedKeys,
  };
}

export function Settings_webEditorHasChanges(saved: ISettings, current: ISettings): boolean {
  const request = Settings_webEditorSettingsRequest(saved, current);
  const { units, timers, exerciseData, ...diffs } = request.settings;
  return (
    Object.keys(diffs).length > 0 ||
    request.deletedExerciseDataKeys.length > 0 ||
    request.deletedStarredExerciseKeys.length > 0 ||
    request.deletedMuscleGroupKeys.length > 0 ||
    units !== saved.units ||
    timers?.workout !== saved.timers.workout ||
    !isSameValue(exerciseData, saved.exerciseData)
  );
}

export function Settings_activeCustomExercises(settings: ISettings): IAllCustomExercises {
  return ObjectUtils_filter(settings.exercises, (k, v) => !v?.isDeleted);
}

export function Settings_getNextTargetType(type: ITargetType, skipPlatesCalculator: boolean): ITargetType {
  const index = targetTypes.indexOf(type);
  let nextTargetType: ITargetType;
  if (index === -1) {
    nextTargetType = targetTypes[0];
  } else if (index === targetTypes.length - 1) {
    nextTargetType = targetTypes[0];
  } else {
    nextTargetType = targetTypes[index + 1];
  }
  if (nextTargetType === "platescalculator" && skipPlatesCalculator) {
    nextTargetType = Settings_getNextTargetType("platescalculator", skipPlatesCalculator);
  }
  return nextTargetType;
}

export function Settings_toggleStarred(
  starred: ISettings["starredExercises"],
  key: string
): ISettings["starredExercises"] {
  if (starred?.[key]) {
    const next = { ...starred };
    delete next[key];
    return next;
  }
  return { ...starred, [key]: true };
}

export function Settings_toggleStarredExercise(dispatch: IDispatch, key: string): void {
  updateSettings(
    dispatch,
    lb<ISettings>()
      .p("starredExercises")
      .recordModify((starred) => Settings_toggleStarred(starred, key)),
    `Toggle starred exercise ${key}`
  );
}

export const settingsRecentExercisesLimit = 5;

// Keys are never deleted from this map, only overwritten. VersionTracker's nested-object path bumps
// versions per key present in the new object (versionTrackerUpdateVersions.ts:427), so a removed key
// never gets its version bumped and the next merge resurrects it. Writing `[]` would sync; deleting
// would not.
export function Settings_withRecentSwap(
  recentExercises: ISettings["recentExercises"],
  from: IExerciseType,
  to: IExerciseType
): Partial<Record<string, string[]>> {
  const fromKey = Exercise_toKey(from);
  const toKey = Exercise_toKey(to);
  const previous = recentExercises?.[fromKey] ?? [];
  return {
    ...recentExercises,
    [fromKey]: [toKey, ...previous.filter((key) => key !== toKey)].slice(0, settingsRecentExercisesLimit),
  };
}

export function Settings_addRecentSwap(dispatch: IDispatch, from: IExerciseType, to: IExerciseType): void {
  updateSettings(
    dispatch,
    lb<ISettings>()
      .p("recentExercises")
      .recordModify((recentExercises) => Settings_withRecentSwap(recentExercises, from, to)),
    `Record recent swap from ${Exercise_toKey(from)} to ${Exercise_toKey(to)}`
  );
}

export function Settings_changePickerSettings(dispatch: IDispatch, settings: IExercisePickerSettings): void {
  updateSettings(
    dispatch,
    lb<ISettings>()
      .p("workoutSettings")
      .recordModify((workoutSettings) => {
        return { ...workoutSettings, ...settings };
      }),
    `Change picker settings`
  );
}

export function Settings_doesProgramHaveUnset1RMs(program: IProgram, settings: ISettings): boolean {
  return Settings_getExercisesWithUnset1RMs(program, settings).length > 0;
}

export function Settings_getExercisesWithUnset1RMs(program: IProgram, settings: ISettings): IExercise[] {
  const evalutedProgram = Program_evaluate(program, settings);
  const plannerExercises = Program_getAllUsedProgramExercises(evalutedProgram).filter((exercise) => {
    return ProgramExercise_doesUse1RM(exercise);
  });
  const exerciseTypes = CollectionUtils_uniqByExpr(
    plannerExercises
      .filter((exercise) => {
        return settings.exerciseData[Exercise_toKey(exercise.exerciseType)]?.rm1 == null;
      })
      .map((exercise) => exercise.exerciseType),
    (e) => Exercise_toKey(e)
  );
  const exercises = exerciseTypes.map((e) => Exercise_get(e, settings.exercises));
  return CollectionUtils_sort(exercises, (a, b) => {
    return Exercise_nameWithEquipment(a, settings).localeCompare(Exercise_nameWithEquipment(b, settings));
  });
}

export function Settings_setOneRM(
  dispatch: IDispatch,
  exerciseType: IExerciseType,
  value: IWeight,
  settings: ISettings
): void {
  updateSettings(
    dispatch,
    lb<ISettings>()
      .p("exerciseData")
      .recordModify((data) => {
        const key = Exercise_toKey(exerciseType);
        return { ...data, [key]: { ...data[key], rm1: value } };
      }),
    `Set 1RM for ${Exercise_nameWithEquipment(Exercise_get(exerciseType, settings.exercises), settings)} to ${Weight_print(value)}`
  );
}

export const TEXT_SIZE_MIN = 12;
export const TEXT_SIZE_MAX = 24;
export const TEXT_SIZE_STEP = 2;
const TEXT_SIZE_BASE = 16;

// An unset textSize follows the OS font scale, the same way an unset theme follows dark mode.
// The OS scale is deliberately not applied on top of an explicit value - it is folded into the
// rem here so that spacing and icons move with the type instead of the text alone growing.
export function Settings_getTextSize(settings: ISettings, osFontScale: number): number {
  if (settings.textSize != null) {
    return clampTextSize(settings.textSize);
  }
  const scaled = TEXT_SIZE_BASE * osFontScale;
  return clampTextSize(Math.round(scaled / TEXT_SIZE_STEP) * TEXT_SIZE_STEP);
}

function clampTextSize(size: number): number {
  return Math.max(TEXT_SIZE_MIN, Math.min(TEXT_SIZE_MAX, size));
}
