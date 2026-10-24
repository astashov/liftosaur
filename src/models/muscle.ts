import {
  IEvaluatedProgram,
  IEvaluatedProgramDay,
  Program_getProgramDayUsedExercises,
  Program_nextHistoryEntry,
} from "./program";
import {
  Exercise_toKey,
  Exercise_targetMuscles,
  Exercise_synergistMuscles,
  Exercise_synergistMusclesGroupMultipliers,
} from "./exercise";
import {
  ObjectUtils_keys,
  ObjectUtils_findMaxValue,
  ObjectUtils_combinedKeys,
  ObjectUtils_clone,
} from "../utils/object";
import {
  ISettings,
  IMuscle,
  IDayData,
  IScreenMuscle,
  IStats,
  screenMuscles,
  IMuscleGroupsSettings,
  IExerciseType,
} from "../types";
import { StringUtils_dashcase, StringUtils_capitalize } from "../utils/string";
import {
  IMusclePoints,
  UngroupedMuscles_add,
  UngroupedMuscles_divide,
  UngroupedMuscles_pointsPerSet,
} from "./ungroupedMuscles";
import { IPlannerProgramExerciseWithType } from "../pages/planner/models/types";
import { SetUtils_areEqual } from "../utils/setUtils";
import { UidFactory_generateUid } from "../utils/generator";

export type IScreenMusclePointsColl = Partial<Record<IScreenMuscle, number>>;

export interface IScreenMusclePoints {
  strength: IScreenMusclePointsColl;
  hypertrophy: IScreenMusclePointsColl;
}

export type IExercisePointsColl = Partial<Record<string, IScreenMusclePointsColl>>;

export interface IExercisePoints {
  strength: IExercisePointsColl;
  hypertrophy: IExercisePointsColl;
}

export interface IUnifiedPoints {
  screenMusclePoints: IScreenMusclePointsColl;
  exercisePoints: IExercisePointsColl;
  ungroupedMusclePoints: IMusclePoints;
}

export interface IPoints {
  screenMusclePoints: IScreenMusclePoints;
  exercisePoints: IExercisePoints;
  ungroupedMusclePoints: { strength: IMusclePoints; hypertrophy: IMusclePoints };
}

const screenMuscleToMuscleMapping: Record<IScreenMuscle, IMuscle[]> = {
  chest: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
  lats: ["Latissimus Dorsi", "Teres Major"],
  upperBack: ["Trapezius Middle Fibers", "Trapezius Lower Fibers"],
  frontDelts: ["Deltoid Anterior"],
  sideDelts: ["Deltoid Lateral"],
  rearDelts: ["Deltoid Posterior"],
  biceps: ["Biceps Brachii", "Brachialis", "Brachioradialis"],
  triceps: ["Triceps Brachii"],
  quadriceps: ["Quadriceps"],
  hamstrings: ["Hamstrings"],
  glutes: ["Gluteus Maximus"],
  calves: ["Gastrocnemius", "Soleus"],
  abs: ["Rectus Abdominis"],
  upperTraps: ["Trapezius Upper Fibers", "Levator Scapulae"],
  lowerBack: ["Erector Spinae"],
  neck: ["Sternocleidomastoid", "Splenius"],
  rotatorCuff: ["Infraspinatus", "Teres Minor"],
  forearmFlexors: ["Wrist Flexors"],
  forearmExtensors: ["Wrist Extensors"],
  obliques: ["Obliques"],
  hipFlexors: ["Iliopsoas", "Sartorius"],
  abductors: ["Gluteus Medius", "Tensor Fasciae Latae"],
  adductors: ["Adductor Magnus", "Adductor Brevis", "Adductor Longus", "Pectineous"],
};

const builtinMuscleGroupNames: Record<IScreenMuscle, string> = {
  chest: "Chest",
  lats: "Lats",
  upperBack: "Upper Back",
  frontDelts: "Front Delts",
  sideDelts: "Side Delts",
  rearDelts: "Rear Delts",
  biceps: "Biceps",
  triceps: "Triceps",
  quadriceps: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abs: "Abs",
  upperTraps: "Upper Traps",
  lowerBack: "Lower Back",
  neck: "Neck",
  rotatorCuff: "Rotator Cuff",
  forearmFlexors: "Forearm Flexors",
  forearmExtensors: "Forearm Extensors",
  obliques: "Obliques",
  hipFlexors: "Hip Flexors",
  abductors: "Abductors",
  adductors: "Adductors",
};

export const Muscle_groupsWithDefaultRange: IScreenMuscle[] = [
  "chest",
  "lats",
  "upperBack",
  "frontDelts",
  "sideDelts",
  "rearDelts",
  "biceps",
  "triceps",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
];

export function Muscle_imageUrl(muscle: IMuscle): string {
  return `/externalimages/muscles/muscle-${StringUtils_dashcase(muscle)}.jpeg`;
}

function normalize(obj: IScreenMusclePointsColl, maxValue: number): IScreenMusclePointsColl {
  return ObjectUtils_keys(obj).reduce<IScreenMusclePointsColl>((memo, key) => {
    memo[key] = (obj[key] || 0) / maxValue;
    return memo;
  }, {});
}

export function Muscle_normalizePoints(points: IPoints): IPoints {
  const maxValues = {
    strength: Math.max(
      ObjectUtils_findMaxValue(points.screenMusclePoints.strength),
      ObjectUtils_findMaxValue(points.ungroupedMusclePoints.strength)
    ),
    hypertrophy: Math.max(
      ObjectUtils_findMaxValue(points.screenMusclePoints.hypertrophy),
      ObjectUtils_findMaxValue(points.ungroupedMusclePoints.hypertrophy)
    ),
  };
  return {
    screenMusclePoints: {
      strength: normalize(points.screenMusclePoints.strength, maxValues.strength),
      hypertrophy: normalize(points.screenMusclePoints.hypertrophy, maxValues.hypertrophy),
    },
    exercisePoints: {
      strength: ObjectUtils_keys(points.exercisePoints.strength).reduce<IExercisePointsColl>((memo, key) => {
        memo[key] = normalize(points.exercisePoints.strength[key]!, maxValues.strength);
        return memo;
      }, {}),
      hypertrophy: ObjectUtils_keys(points.exercisePoints.hypertrophy).reduce<IExercisePointsColl>((memo, key) => {
        memo[key] = normalize(points.exercisePoints.hypertrophy[key]!, maxValues.hypertrophy);
        return memo;
      }, {}),
    },
    ungroupedMusclePoints: {
      strength: UngroupedMuscles_divide(points.ungroupedMusclePoints.strength, maxValues.strength),
      hypertrophy: UngroupedMuscles_divide(points.ungroupedMusclePoints.hypertrophy, maxValues.hypertrophy),
    },
  };
}

export function Muscle_normalizeUnifiedPoints(points: IUnifiedPoints): IUnifiedPoints {
  const maxValues = Math.max(
    ObjectUtils_findMaxValue(points.screenMusclePoints),
    ObjectUtils_findMaxValue(points.ungroupedMusclePoints)
  );
  return {
    screenMusclePoints: normalize(points.screenMusclePoints, maxValues),
    exercisePoints: ObjectUtils_keys(points.exercisePoints).reduce<IExercisePointsColl>((memo, key) => {
      memo[key] = normalize(points.exercisePoints[key]!, maxValues);
      return memo;
    }, {}),
    ungroupedMusclePoints: UngroupedMuscles_divide(points.ungroupedMusclePoints, maxValues),
  };
}

export function Muscle_combinePoints(points: IPoints): IPoints {
  return {
    screenMusclePoints: {
      strength: ObjectUtils_keys(points.screenMusclePoints.strength).reduce<IScreenMusclePointsColl>((memo, key) => {
        memo[key] = (memo[key] || 0) + points.screenMusclePoints.strength[key]!;
        return memo;
      }, {}),
      hypertrophy: {},
    },
    exercisePoints: {
      strength: {},
      hypertrophy: {},
    },
    ungroupedMusclePoints: { strength: { ...points.ungroupedMusclePoints.strength }, hypertrophy: {} },
  };
}

export function Muscle_getScreenMusclesFromMuscle(muscle: IMuscle, settings: ISettings): (IScreenMuscle | string)[] {
  const availableMuscleGroups = Muscle_getAvailableMuscleGroups(settings);
  const matchingMuscleGroups = availableMuscleGroups.filter((mg) => {
    const muscles = settings.muscleGroups.data[mg]?.muscles ?? screenMuscleToMuscleMapping[mg as IScreenMuscle] ?? [];
    return muscles.includes(muscle);
  });
  return matchingMuscleGroups;
}

export function Muscle_getMuscleGroupName(muscleGroup: IScreenMuscle, settings: ISettings): string {
  return (
    settings.muscleGroups.data[muscleGroup]?.name ??
    builtinMuscleGroupNames[muscleGroup] ??
    StringUtils_capitalize(muscleGroup)
  );
}

export function Muscle_isDefaultMuscles(muscleGroup: IScreenMuscle, muscles: IMuscle[]): boolean {
  const defaultMuscles = screenMuscleToMuscleMapping[muscleGroup as IScreenMuscle] ?? [];
  return SetUtils_areEqual(new Set(defaultMuscles), new Set(muscles));
}

export function Muscle_getAvailableMuscleGroups(settings: ISettings): IScreenMuscle[] {
  return [
    ...screenMuscles.filter((sm) => !settings.muscleGroups.data[sm]?.isHidden),
    ...Object.keys(settings.muscleGroups.data).filter((k) => !(screenMuscles as readonly string[]).includes(k)),
  ];
}

export function Muscle_getBuiltinMuscleGroups(): IScreenMuscle[] {
  return screenMuscles;
}

export function Muscle_getHiddenMuscleGroups(settings: ISettings): IScreenMuscle[] {
  return [...screenMuscles.filter((sm) => settings.muscleGroups.data[sm]?.isHidden)];
}

export function Muscle_getMusclesFromScreenMuscle(muscleGroup: IScreenMuscle | string, settings: ISettings): IMuscle[] {
  const availableMuscleGroups = Muscle_getAvailableMuscleGroups(settings);
  if (!availableMuscleGroups.includes(muscleGroup)) {
    return [];
  }
  return (
    settings.muscleGroups.data[muscleGroup]?.muscles ?? screenMuscleToMuscleMapping[muscleGroup as IScreenMuscle] ?? []
  );
}

export function Muscle_isBuiltInMuscleGroup(muscleGroup: IScreenMuscle | string): boolean {
  return (screenMuscles as readonly string[]).includes(muscleGroup);
}

export function Muscle_getPointsForProgram(program: IEvaluatedProgram, stats: IStats, settings: ISettings): IPoints {
  const screenMusclePoints: IScreenMusclePoints = {
    strength: {},
    hypertrophy: {},
  };
  const exercisePoints: IExercisePoints = {
    strength: {},
    hypertrophy: {},
  };

  return program.weeks[0].days.reduce(
    (memo, day) => mergePoints(memo, Muscle_getPointsForDay(program, day, stats, settings)),
    {
      screenMusclePoints,
      exercisePoints,
      ungroupedMusclePoints: { strength: {}, hypertrophy: {} },
    }
  );
}

export function Muscle_getPointsForDay(
  program: IEvaluatedProgram,
  programDay: IEvaluatedProgramDay,
  stats: IStats,
  settings: ISettings
): IPoints {
  const screenMusclePoints: IScreenMusclePoints = {
    strength: {},
    hypertrophy: {},
  };
  const exercisePoints: IExercisePoints = {
    strength: {},
    hypertrophy: {},
  };

  const dayExercises = Program_getProgramDayUsedExercises(programDay);
  return dayExercises.reduce(
    (memo, exercise) => {
      return mergePoints(memo, Muscle_getPointsForExercise(program, exercise, programDay.dayData, settings, stats));
    },
    { screenMusclePoints, exercisePoints, ungroupedMusclePoints: { strength: {}, hypertrophy: {} } }
  );
}

export function Muscle_getUnifiedPointsForDay(
  program: IEvaluatedProgram,
  programDay: IEvaluatedProgramDay,
  stats: IStats,
  settings: ISettings
): IUnifiedPoints {
  const screenMusclePoints: IScreenMusclePointsColl = {};
  const exercisePoints: IExercisePointsColl = {};

  const dayExercises = Program_getProgramDayUsedExercises(programDay);
  return dayExercises.reduce(
    (memo, exercise) => {
      return mergeUnifiedPoints(
        memo,
        Muscle_getUnifiedPointsForExercise(program, exercise, programDay.dayData, settings, stats)
      );
    },
    { screenMusclePoints, exercisePoints, ungroupedMusclePoints: {} }
  );
}

export function Muscle_screenMusclesByRole(
  exerciseType: IExerciseType,
  settings: ISettings
): { screenTargetMuscles: IScreenMuscle[]; screenSynergistMuscles: IScreenMuscle[] } {
  const screenTargetMuscles = Array.from(
    new Set(
      Exercise_targetMuscles(exerciseType, settings).flatMap((t) => Muscle_getScreenMusclesFromMuscle(t, settings))
    )
  );
  const screenSynergistMuscles = Array.from(
    new Set(
      Exercise_synergistMuscles(exerciseType, settings).flatMap((t) => Muscle_getScreenMusclesFromMuscle(t, settings))
    )
  ).filter((muscleGroup) => !screenTargetMuscles.includes(muscleGroup));
  return { screenTargetMuscles, screenSynergistMuscles };
}

export function Muscle_getUnifiedPointsForExercise(
  program: IEvaluatedProgram,
  programExercise: IPlannerProgramExerciseWithType,
  dayData: IDayData,
  settings: ISettings,
  stats: IStats
): IUnifiedPoints {
  const screenMusclePoints: IScreenMusclePointsColl = {};
  const exercisePoints: IExercisePointsColl = {};

  const id = Exercise_toKey(programExercise.exerciseType);
  const historyEntry = Program_nextHistoryEntry(program, dayData, 0, programExercise, stats, settings);
  const { screenTargetMuscles, screenSynergistMuscles } = Muscle_screenMusclesByRole(
    programExercise.exerciseType,
    settings
  );
  const synergistMuscleGroupToMultiplier = Exercise_synergistMusclesGroupMultipliers(
    programExercise.exerciseType,
    settings
  );
  for (const _set of historyEntry.sets) {
    for (const muscle of screenTargetMuscles) {
      screenMusclePoints[muscle] = screenMusclePoints[muscle] || 0;
      screenMusclePoints[muscle]! += 100;
      exercisePoints[id] = exercisePoints[id] || {};
      exercisePoints[id]![muscle] = exercisePoints[id]![muscle] || 0;
      exercisePoints[id]![muscle]! += 100;
    }
    for (const muscle of screenSynergistMuscles) {
      screenMusclePoints[muscle] = screenMusclePoints[muscle] || 0;
      screenMusclePoints[muscle]! +=
        (synergistMuscleGroupToMultiplier[muscle] ?? settings.planner.synergistMultiplier) * 100;
      exercisePoints[id] = exercisePoints[id] || {};
      exercisePoints[id]![muscle] = exercisePoints[id]![muscle] || 0;
      exercisePoints[id]![muscle]! +=
        (synergistMuscleGroupToMultiplier[muscle] ?? settings.planner.synergistMultiplier) * 100;
    }
  }
  const ungroupedMusclePoints = UngroupedMuscles_add(
    {},
    UngroupedMuscles_pointsPerSet(programExercise.exerciseType, settings),
    historyEntry.sets.length * 100
  );
  return { screenMusclePoints, exercisePoints, ungroupedMusclePoints };
}

export function Muscle_getPointsForExercise(
  program: IEvaluatedProgram,
  programExercise: IPlannerProgramExerciseWithType,
  dayData: IDayData,
  settings: ISettings,
  stats: IStats
): IPoints {
  const screenMusclePoints: IScreenMusclePoints = {
    strength: {},
    hypertrophy: {},
  };
  const exercisePoints: IExercisePoints = {
    strength: {},
    hypertrophy: {},
  };

  const id = Exercise_toKey(programExercise.exerciseType);
  const historyEntry = Program_nextHistoryEntry(program, dayData, 0, programExercise, stats, settings);
  const synergistMuscleGroupToMultiplier = Exercise_synergistMusclesGroupMultipliers(
    programExercise.exerciseType,
    settings
  );
  const { screenTargetMuscles, screenSynergistMuscles } = Muscle_screenMusclesByRole(
    programExercise.exerciseType,
    settings
  );
  for (const set of historyEntry.sets) {
    if ((set.reps ?? 0) >= 8) {
      for (const muscle of screenTargetMuscles) {
        screenMusclePoints.hypertrophy[muscle] = screenMusclePoints.hypertrophy[muscle] || 0;
        screenMusclePoints.hypertrophy[muscle]! += 100;
        exercisePoints.hypertrophy[id] = exercisePoints.hypertrophy[id] || {};
        exercisePoints.hypertrophy[id]![muscle] = exercisePoints.hypertrophy[id]![muscle] || 0;
        exercisePoints.hypertrophy[id]![muscle]! += 100;
      }
      for (const muscle of screenSynergistMuscles) {
        screenMusclePoints.hypertrophy[muscle] = screenMusclePoints.hypertrophy[muscle] || 0;
        screenMusclePoints.hypertrophy[muscle]! +=
          100 * (synergistMuscleGroupToMultiplier[muscle] ?? settings.planner.synergistMultiplier);
        exercisePoints.hypertrophy[id] = exercisePoints.hypertrophy[id] || {};
        exercisePoints.hypertrophy[id]![muscle] = exercisePoints.hypertrophy[id]![muscle] || 0;
        exercisePoints.hypertrophy[id]![muscle]! +=
          100 * (synergistMuscleGroupToMultiplier[muscle] ?? settings.planner.synergistMultiplier);
      }
    } else {
      for (const muscle of screenTargetMuscles) {
        screenMusclePoints.strength[muscle] = screenMusclePoints.strength[muscle] || 0;
        screenMusclePoints.strength[muscle]! += 100;
        exercisePoints.strength[id] = exercisePoints.strength[id] || {};
        exercisePoints.strength[id]![muscle] = exercisePoints.strength[id]![muscle] || 0;
        exercisePoints.strength[id]![muscle]! += 100;
      }
      for (const muscle of screenSynergistMuscles) {
        screenMusclePoints.strength[muscle] = screenMusclePoints.strength[muscle] || 0;
        screenMusclePoints.strength[muscle]! +=
          100 * (synergistMuscleGroupToMultiplier[muscle] ?? settings.planner.synergistMultiplier);
        exercisePoints.strength[id] = exercisePoints.strength[id] || {};
        exercisePoints.strength[id]![muscle] = exercisePoints.strength[id]![muscle] || 0;
        exercisePoints.strength[id]![muscle]! +=
          100 * (synergistMuscleGroupToMultiplier[muscle] ?? settings.planner.synergistMultiplier);
      }
    }
  }
  const perSet = UngroupedMuscles_pointsPerSet(programExercise.exerciseType, settings);
  const hypertrophySets = historyEntry.sets.filter((set) => (set.reps ?? 0) >= 8).length;
  const ungroupedMusclePoints = {
    strength: UngroupedMuscles_add({}, perSet, (historyEntry.sets.length - hypertrophySets) * 100),
    hypertrophy: UngroupedMuscles_add({}, perSet, hypertrophySets * 100),
  };
  return { screenMusclePoints, exercisePoints, ungroupedMusclePoints };
}

export function Muscle_mergeScreenMusclePoints(
  a: IScreenMusclePointsColl,
  b: IScreenMusclePointsColl
): IScreenMusclePointsColl {
  return ObjectUtils_combinedKeys(a, b).reduce<IScreenMusclePointsColl>((memo, screenMuscle) => {
    const oldValue = a[screenMuscle] || 0;
    const newValue = b[screenMuscle] || 0;
    memo[screenMuscle] = oldValue + newValue;
    return memo;
  }, {});
}

export function Muscle_createMuscleGroup(
  muscleGroupSettings: IMuscleGroupsSettings,
  name: string
): IMuscleGroupsSettings {
  const id = UidFactory_generateUid(8);
  return { ...muscleGroupSettings, data: { ...muscleGroupSettings.data, [id]: { name, muscles: [] } } };
}

export function Muscle_updateMuscleGroup(
  muscleGroupSettings: IMuscleGroupsSettings,
  muscleGroup: IScreenMuscle,
  muscles: IMuscle[]
): IMuscleGroupsSettings {
  const isDefault = Muscle_isDefaultMuscles(muscleGroup, muscles);
  const newMuscleGroups = ObjectUtils_clone(muscleGroupSettings);
  if (isDefault) {
    delete newMuscleGroups.data[muscleGroup]?.muscles;
  } else {
    newMuscleGroups.data = newMuscleGroups.data || {};
    newMuscleGroups.data[muscleGroup] = newMuscleGroups.data[muscleGroup] || {};
    newMuscleGroups.data[muscleGroup].muscles = muscles;
  }
  return newMuscleGroups;
}

export function Muscle_deleteMuscleGroup(
  muscleGroupSettings: IMuscleGroupsSettings,
  muscleGroup: IScreenMuscle
): IMuscleGroupsSettings {
  const isBuiltin = Muscle_isBuiltInMuscleGroup(muscleGroup);
  if (isBuiltin) {
    return {
      ...muscleGroupSettings,
      data: {
        ...muscleGroupSettings.data,
        [muscleGroup]: { ...muscleGroupSettings.data[muscleGroup], isHidden: true },
      },
    };
  } else {
    const newMuscleGroups = ObjectUtils_clone(muscleGroupSettings);
    delete newMuscleGroups.data[muscleGroup];
    return newMuscleGroups;
  }
}

export function Muscle_restoreMuscleGroup(
  muscleGroupSettings: IMuscleGroupsSettings,
  muscleGroup: IScreenMuscle
): IMuscleGroupsSettings {
  const newMuscleGroups = ObjectUtils_clone(muscleGroupSettings);
  newMuscleGroups.data = newMuscleGroups.data || {};
  newMuscleGroups.data[muscleGroup] = newMuscleGroups.data[muscleGroup] || {};
  newMuscleGroups.data[muscleGroup].isHidden = false;
  return newMuscleGroups;
}

function mergeExercisePoints(a: IExercisePointsColl, b: IExercisePointsColl): IExercisePointsColl {
  return ObjectUtils_combinedKeys(a, b).reduce<IExercisePointsColl>((memo, exerciseId) => {
    const points1 = a[exerciseId] || {};
    const points2 = b[exerciseId] || {};
    memo[exerciseId] = Muscle_mergeScreenMusclePoints(points1, points2);
    return memo;
  }, {});
}

function mergePoints(oldPoints: IPoints, newPoints: IPoints): IPoints {
  return {
    screenMusclePoints: {
      strength: Muscle_mergeScreenMusclePoints(
        oldPoints.screenMusclePoints.strength,
        newPoints.screenMusclePoints.strength
      ),
      hypertrophy: Muscle_mergeScreenMusclePoints(
        oldPoints.screenMusclePoints.hypertrophy,
        newPoints.screenMusclePoints.hypertrophy
      ),
    },
    exercisePoints: {
      strength: mergeExercisePoints(oldPoints.exercisePoints.strength, newPoints.exercisePoints.strength),
      hypertrophy: mergeExercisePoints(oldPoints.exercisePoints.hypertrophy, newPoints.exercisePoints.hypertrophy),
    },
    ungroupedMusclePoints: {
      strength: UngroupedMuscles_add(
        oldPoints.ungroupedMusclePoints.strength,
        newPoints.ungroupedMusclePoints.strength,
        1
      ),
      hypertrophy: UngroupedMuscles_add(
        oldPoints.ungroupedMusclePoints.hypertrophy,
        newPoints.ungroupedMusclePoints.hypertrophy,
        1
      ),
    },
  };
}

function mergeUnifiedPoints(oldPoints: IUnifiedPoints, newPoints: IUnifiedPoints): IUnifiedPoints {
  return {
    screenMusclePoints: Muscle_mergeScreenMusclePoints(oldPoints.screenMusclePoints, newPoints.screenMusclePoints),
    exercisePoints: mergeExercisePoints(oldPoints.exercisePoints, newPoints.exercisePoints),
    ungroupedMusclePoints: UngroupedMuscles_add(oldPoints.ungroupedMusclePoints, newPoints.ungroupedMusclePoints, 1),
  };
}
