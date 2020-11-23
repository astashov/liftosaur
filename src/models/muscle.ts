import { IProgramExercise, Program, IProgramDay, IProgram } from "./program";
import { Exercise, IMuscle } from "./exercise";
import { ObjectUtils } from "../utils/object";
import { ISettings } from "./settings";

export type IScreenMuscle =
  | "shoulders"
  | "triceps"
  | "back"
  | "abs"
  | "glutes"
  | "hamstrings"
  | "quadriceps"
  | "chest"
  | "biceps"
  | "calves"
  | "forearms";

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
    "Trapezius Lower Fibers",
    "Trapezius Middle Fibers",
    "Trapezius Upper Fibers",
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

  export function getScreenMusclesFromMuscle(muscle: IMuscle): IScreenMuscle[] {
    return muscleToScreenMuscleMapping[muscle];
  }

  export function getPointsForProgram(program: IProgram, settings: ISettings): IPoints {
    const screenMusclePoints: IScreenMusclePoints = {
      strength: {},
      hypertrophy: {},
    };
    const exercisePoints: IExercisePoints = {
      strength: {},
      hypertrophy: {},
    };

    const firstDay = program.days[0];
    const nextIndex = program.days
      .slice(1)
      .findIndex(
        (d) =>
          d.exercises === firstDay.exercises &&
          firstDay.exercises.every((e) => d.exercises.map((ex) => ex.id).indexOf(e.id) !== -1)
      );
    const cycle = nextIndex === -1 ? program.days : program.days.slice(nextIndex - 1);

    return cycle.reduce((memo, day) => mergePoints(memo, getPointsForDay(program, day, settings)), {
      screenMusclePoints,
      exercisePoints,
    });
  }

  export function getPointsForDay(program: IProgram, programDay: IProgramDay, settings: ISettings): IPoints {
    const screenMusclePoints: IScreenMusclePoints = {
      strength: {},
      hypertrophy: {},
    };
    const exercisePoints: IExercisePoints = {
      strength: {},
      hypertrophy: {},
    };

    return programDay.exercises.reduce(
      (memo, exerciseId) => {
        const programExercise = program.exercises.find((e) => e.id === exerciseId.id)!;
        return mergePoints(memo, getPointsForExercise(programExercise, program.nextDay, settings));
      },
      { screenMusclePoints, exercisePoints }
    );
  }

  export function getPointsForExercise(programExercise: IProgramExercise, day: number, settings: ISettings): IPoints {
    const screenMusclePoints: IScreenMusclePoints = {
      strength: {},
      hypertrophy: {},
    };
    const exercisePoints: IExercisePoints = {
      strength: {},
      hypertrophy: {},
    };

    const id = Exercise.toKey(programExercise.exerciseType);
    const historyEntry = Program.programExerciseToHistoryEntry(programExercise, day, settings);
    const targetMuscles = Exercise.targetMuscles(programExercise.exerciseType);
    const synergistMuscles = Exercise.synergistMuscles(programExercise.exerciseType);
    for (const set of historyEntry.sets) {
      if (set.reps >= 8) {
        for (const targetMuscle of targetMuscles) {
          const muscles = muscleToScreenMuscleMapping[targetMuscle];
          for (const muscle of muscles) {
            screenMusclePoints.hypertrophy[muscle] = screenMusclePoints.hypertrophy[muscle] || 0;
            screenMusclePoints.hypertrophy[muscle]! += 100;
            exercisePoints.hypertrophy[id] = exercisePoints.hypertrophy[id] || {};
            exercisePoints.hypertrophy[id]![muscle] = exercisePoints.hypertrophy[id]![muscle] || 0;
            exercisePoints.hypertrophy[id]![muscle]! += 100;
          }
        }
        for (const synergistMuscle of synergistMuscles) {
          const muscles = muscleToScreenMuscleMapping[synergistMuscle];
          for (const muscle of muscles) {
            screenMusclePoints.hypertrophy[muscle] = screenMusclePoints.hypertrophy[muscle] || 0;
            screenMusclePoints.hypertrophy[muscle]! += 30;
            exercisePoints.hypertrophy[id] = exercisePoints.hypertrophy[id] || {};
            exercisePoints.hypertrophy[id]![muscle] = exercisePoints.hypertrophy[id]![muscle] || 0;
            exercisePoints.hypertrophy[id]![muscle]! += 30;
          }
        }
      } else {
        for (const targetMuscle of targetMuscles) {
          const muscles = muscleToScreenMuscleMapping[targetMuscle];
          for (const muscle of muscles) {
            screenMusclePoints.strength[muscle] = screenMusclePoints.strength[muscle] || 0;
            screenMusclePoints.strength[muscle]! += 100;
            exercisePoints.strength[id] = exercisePoints.strength[id] || {};
            exercisePoints.strength[id]![muscle] = exercisePoints.strength[id]![muscle] || 0;
            exercisePoints.strength[id]![muscle]! += 100;
          }
        }
        for (const synergistMuscle of synergistMuscles) {
          const muscles = muscleToScreenMuscleMapping[synergistMuscle];
          for (const muscle of muscles) {
            screenMusclePoints.strength[muscle] = screenMusclePoints.strength[muscle] || 0;
            screenMusclePoints.strength[muscle]! += 30;
            exercisePoints.strength[id] = exercisePoints.strength[id] || {};
            exercisePoints.strength[id]![muscle] = exercisePoints.strength[id]![muscle] || 0;
            exercisePoints.strength[id]![muscle]! += 30;
          }
        }
      }
    }
    return { screenMusclePoints, exercisePoints };
  }

  function mergeScreenMusclePoints(a: IScreenMusclePointsColl, b: IScreenMusclePointsColl): IScreenMusclePointsColl {
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
}
