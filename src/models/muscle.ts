import { IEvaluatedProgram, IEvaluatedProgramDay, Program } from "./program";
import { Exercise } from "./exercise";
import { ObjectUtils } from "../utils/object";
import { ISettings, IMuscle, IDayData, IScreenMuscle } from "../types";
import { StringUtils } from "../utils/string";
import { IPlannerProgramExerciseUsed } from "../pages/planner/models/types";

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
}

export interface IPoints {
  screenMusclePoints: IScreenMusclePoints;
  exercisePoints: IExercisePoints;
}

const screenMuscleToMuscleMapping: Record<IScreenMuscle, IMuscle[]> = {
  shoulders: [
    "Deltoid Anterior",
    "Deltoid Lateral",
    "Deltoid Posterior",
    "Infraspinatus",
    "Teres Major",
    "Teres Minor",
  ],
  triceps: ["Triceps Brachii"],
  back: [
    "Erector Spinae",
    "Latissimus Dorsi",
    "Levator Scapulae",
    "Trapezius Lower Fibers",
    "Trapezius Middle Fibers",
    "Trapezius Upper Fibers",
    "Sternocleidomastoid",
    "Splenius",
  ],
  abs: ["Obliques", "Rectus Abdominis", "Iliopsoas"],
  glutes: ["Gluteus Maximus", "Gluteus Medius", "Tensor Fasciae Latae"],
  hamstrings: ["Adductor Magnus", "Adductor Brevis", "Adductor Longus", "Hamstrings"],
  quadriceps: ["Adductor Brevis", "Adductor Longus", "Pectineous", "Quadriceps", "Sartorius"],
  chest: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head", "Serratus Anterior"],
  biceps: ["Biceps Brachii", "Brachialis"],
  calves: ["Gastrocnemius", "Soleus", "Tibialis Anterior"],
  forearms: ["Brachioradialis", "Wrist Extensors", "Wrist Flexors"],
};

const muscleToScreenMuscleMapping = ObjectUtils.keys(screenMuscleToMuscleMapping).reduce<
  Record<IMuscle, IScreenMuscle[]>
>((memo, screenMuscle) => {
  const muscles = screenMuscleToMuscleMapping[screenMuscle];
  for (const muscle of muscles) {
    memo[muscle] = memo[muscle] || [];
    memo[muscle].push(screenMuscle);
  }
  return memo;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}, {} as any);

export namespace Muscle {
  export function getEmptyScreenMusclesPoints(): IScreenMusclePointsColl {
    return {
      shoulders: 0,
      triceps: 0,
      back: 0,
      abs: 0,
      glutes: 0,
      hamstrings: 0,
      quadriceps: 0,
      chest: 0,
      biceps: 0,
      calves: 0,
      forearms: 0,
    };
  }

  export function imageUrl(muscle: IMuscle): string {
    return `/externalimages/muscles/muscle-${StringUtils.dashcase(muscle)}.jpeg`;
  }

  function normalize(obj: IScreenMusclePointsColl, maxValue: number): IScreenMusclePointsColl {
    return ObjectUtils.keys(obj).reduce<IScreenMusclePointsColl>((memo, key) => {
      memo[key] = (obj[key] || 0) / maxValue;
      return memo;
    }, {});
  }

  export function normalizePoints(points: IPoints): IPoints {
    const maxValues = {
      strength: ObjectUtils.findMaxValue(points.screenMusclePoints.strength),
      hypertrophy: ObjectUtils.findMaxValue(points.screenMusclePoints.hypertrophy),
    };
    return {
      screenMusclePoints: {
        strength: normalize(points.screenMusclePoints.strength, maxValues.strength),
        hypertrophy: normalize(points.screenMusclePoints.hypertrophy, maxValues.hypertrophy),
      },
      exercisePoints: {
        strength: ObjectUtils.keys(points.exercisePoints.strength).reduce<IExercisePointsColl>((memo, key) => {
          memo[key] = normalize(points.exercisePoints.strength[key]!, maxValues.strength);
          return memo;
        }, {}),
        hypertrophy: ObjectUtils.keys(points.exercisePoints.hypertrophy).reduce<IExercisePointsColl>((memo, key) => {
          memo[key] = normalize(points.exercisePoints.hypertrophy[key]!, maxValues.hypertrophy);
          return memo;
        }, {}),
      },
    };
  }

  export function normalizeUnifiedPoints(points: IUnifiedPoints): IUnifiedPoints {
    const maxValues = ObjectUtils.findMaxValue(points.screenMusclePoints);
    return {
      screenMusclePoints: normalize(points.screenMusclePoints, maxValues),
      exercisePoints: ObjectUtils.keys(points.exercisePoints).reduce<IExercisePointsColl>((memo, key) => {
        memo[key] = normalize(points.exercisePoints[key]!, maxValues);
        return memo;
      }, {}),
    };
  }

  export function combinePoints(points: IPoints): IPoints {
    return {
      screenMusclePoints: {
        strength: ObjectUtils.keys(points.screenMusclePoints.strength).reduce<IScreenMusclePointsColl>((memo, key) => {
          memo[key] = (memo[key] || 0) + points.screenMusclePoints.strength[key]!;
          return memo;
        }, {}),
        hypertrophy: {},
      },
      exercisePoints: {
        strength: {},
        hypertrophy: {},
      },
    };
  }

  export function getScreenMusclesFromMuscle(muscle: IMuscle): IScreenMuscle[] {
    return muscleToScreenMuscleMapping[muscle];
  }

  export function getMusclesFromScreenMuscle(muscle: IScreenMuscle): IMuscle[] {
    return screenMuscleToMuscleMapping[muscle];
  }

  export function getPointsForProgram(program: IEvaluatedProgram, settings: ISettings): IPoints {
    const screenMusclePoints: IScreenMusclePoints = {
      strength: {},
      hypertrophy: {},
    };
    const exercisePoints: IExercisePoints = {
      strength: {},
      hypertrophy: {},
    };

    return program.weeks[0].days.reduce((memo, day) => mergePoints(memo, getPointsForDay(program, day, settings)), {
      screenMusclePoints,
      exercisePoints,
    });
  }

  export function getPointsForDay(
    program: IEvaluatedProgram,
    programDay: IEvaluatedProgramDay,
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

    const dayExercises = Program.getProgramDayExercises(programDay);
    return dayExercises.reduce(
      (memo, exercise) => {
        return mergePoints(memo, getPointsForExercise(program, exercise, programDay.dayData, settings));
      },
      { screenMusclePoints, exercisePoints }
    );
  }

  export function getUnifiedPointsForDay(
    program: IEvaluatedProgram,
    programDay: IEvaluatedProgramDay,
    settings: ISettings
  ): IUnifiedPoints {
    const screenMusclePoints: IScreenMusclePointsColl = {};
    const exercisePoints: IExercisePointsColl = {};

    const dayExercises = Program.getProgramDayExercises(programDay);
    return dayExercises.reduce(
      (memo, exercise) => {
        return mergeUnifiedPoints(memo, getUnifiedPointsForExercise(program, exercise, programDay.dayData, settings));
      },
      { screenMusclePoints, exercisePoints }
    );
  }

  export function getUnifiedPointsForExercise(
    program: IEvaluatedProgram,
    programExercise: IPlannerProgramExerciseUsed,
    dayData: IDayData,
    settings: ISettings
  ): IUnifiedPoints {
    const screenMusclePoints: IScreenMusclePointsColl = {};
    const exercisePoints: IExercisePointsColl = {};

    const id = Exercise.toKey(programExercise.exerciseType);
    const historyEntry = Program.nextHistoryEntry(program, dayData, programExercise, settings);
    const targetMuscles = Exercise.targetMuscles(programExercise.exerciseType, settings.exercises);
    const synergistMuscles = Exercise.synergistMuscles(programExercise.exerciseType, settings.exercises);
    const screenTargetMuscles = Array.from(new Set(targetMuscles.flatMap((t) => muscleToScreenMuscleMapping[t] || [])));
    const screenSynergistMuscles = Array.from(
      new Set(synergistMuscles.flatMap((t) => muscleToScreenMuscleMapping[t] || []))
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
        screenMusclePoints[muscle]! += 30;
        exercisePoints[id] = exercisePoints[id] || {};
        exercisePoints[id]![muscle] = exercisePoints[id]![muscle] || 0;
        exercisePoints[id]![muscle]! += 30;
      }
    }
    return { screenMusclePoints, exercisePoints };
  }

  export function getPointsForExercise(
    program: IEvaluatedProgram,
    programExercise: IPlannerProgramExerciseUsed,
    dayData: IDayData,
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

    const id = Exercise.toKey(programExercise.exerciseType);
    const historyEntry = Program.nextHistoryEntry(program, dayData, programExercise, settings);
    const targetMuscles = Exercise.targetMuscles(programExercise.exerciseType, settings.exercises);
    const synergistMuscles = Exercise.synergistMuscles(programExercise.exerciseType, settings.exercises);
    const screenTargetMuscles = Array.from(new Set(targetMuscles.flatMap((t) => muscleToScreenMuscleMapping[t] || [])));
    const screenSynergistMuscles = Array.from(
      new Set(synergistMuscles.flatMap((t) => muscleToScreenMuscleMapping[t] || []))
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
          screenMusclePoints.hypertrophy[muscle]! += 30;
          exercisePoints.hypertrophy[id] = exercisePoints.hypertrophy[id] || {};
          exercisePoints.hypertrophy[id]![muscle] = exercisePoints.hypertrophy[id]![muscle] || 0;
          exercisePoints.hypertrophy[id]![muscle]! += 30;
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
          screenMusclePoints.strength[muscle]! += 30;
          exercisePoints.strength[id] = exercisePoints.strength[id] || {};
          exercisePoints.strength[id]![muscle] = exercisePoints.strength[id]![muscle] || 0;
          exercisePoints.strength[id]![muscle]! += 30;
        }
      }
    }
    return { screenMusclePoints, exercisePoints };
  }

  export function mergeScreenMusclePoints(
    a: IScreenMusclePointsColl,
    b: IScreenMusclePointsColl
  ): IScreenMusclePointsColl {
    return ObjectUtils.combinedKeys(a, b).reduce<IScreenMusclePointsColl>((memo, screenMuscle) => {
      const oldValue = a[screenMuscle] || 0;
      const newValue = b[screenMuscle] || 0;
      memo[screenMuscle] = oldValue + newValue;
      return memo;
    }, {});
  }

  function mergeExercisePoints(a: IExercisePointsColl, b: IExercisePointsColl): IExercisePointsColl {
    return ObjectUtils.combinedKeys(a, b).reduce<IExercisePointsColl>((memo, exerciseId) => {
      const points1 = a[exerciseId] || {};
      const points2 = b[exerciseId] || {};
      memo[exerciseId] = mergeScreenMusclePoints(points1, points2);
      return memo;
    }, {});
  }

  function mergePoints(oldPoints: IPoints, newPoints: IPoints): IPoints {
    return {
      screenMusclePoints: {
        strength: mergeScreenMusclePoints(oldPoints.screenMusclePoints.strength, newPoints.screenMusclePoints.strength),
        hypertrophy: mergeScreenMusclePoints(
          oldPoints.screenMusclePoints.hypertrophy,
          newPoints.screenMusclePoints.hypertrophy
        ),
      },
      exercisePoints: {
        strength: mergeExercisePoints(oldPoints.exercisePoints.strength, newPoints.exercisePoints.strength),
        hypertrophy: mergeExercisePoints(oldPoints.exercisePoints.hypertrophy, newPoints.exercisePoints.hypertrophy),
      },
    };
  }

  function mergeUnifiedPoints(oldPoints: IUnifiedPoints, newPoints: IUnifiedPoints): IUnifiedPoints {
    return {
      screenMusclePoints: mergeScreenMusclePoints(oldPoints.screenMusclePoints, newPoints.screenMusclePoints),
      exercisePoints: mergeExercisePoints(oldPoints.exercisePoints, newPoints.exercisePoints),
    };
  }
}
