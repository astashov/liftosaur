import { excercises, IExcercise, IExcerciseType } from "../excercise";
import { IProgram } from "../program";
import { IStats } from "../stats";
import { CollectionUtils } from "../../utils/collection";
import { Weight } from "../weight";
import { IProgressEntry } from "../progress";

function getWeight4(excerciseType: IExcerciseType): (stats: IStats) => number {
  return (stats: IStats): number => {
    return stats.excercises[excerciseType]?.weights["4x4"] ?? excercises[excerciseType].startWeight;
  };
}

function getWeight8(excerciseType: IExcerciseType): (stats: IStats) => number {
  return (stats: IStats): number => {
    const weight = stats.excercises[excerciseType]?.weights["4x4"];
    return weight ? Weight.round(weight * 0.9) : excercises[excerciseType].startWeight;
  };
}

export const ivySaurProgram: IProgram = {
  id: "ivySaur",
  name: "IvySaur Program",
  author: "https://old.reddit.com/user/lvysaur",
  url: "https://old.reddit.com/r/Fitness/comments/4uijsl/a_detailed_look_at_why_stronglifts_starting",
  increment: (stats: IStats, day: number, excercise: IExcercise): number => {
    const isPreviousWeight = stats.excercises[excercise.id]?.weights["4x4"];
    if (isPreviousWeight == null) {
      return 0;
    } else {
      switch (excercise.id) {
        case "barbellRows":
          return 10;
        case "benchPress":
          return 10;
        case "chinups":
          return 0;
        case "deadlift":
          return 15;
        case "overheadPress":
          return 5;
        case "squat":
          return 15;
      }
    }
  },
  commit: (weightKey: string, progressEntry: IProgressEntry): number | undefined => {
    if (weightKey === "4x4") {
      return progressEntry.sets[progressEntry.sets.length - 1]?.weight;
    } else {
      return undefined;
    }
  },
  days: [
    {
      name: "Week A Day 1",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("benchPress") }, 4)
        },
        {
          excercise: excercises.squat,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("squat") }, 4)
        },
        {
          excercise: excercises.overheadPress,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("overheadPress") }, 4)
        },
        {
          excercise: excercises.chinups,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("chinups") }, 4)
        }
      ]
    },
    {
      name: "Week A Day 2",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("benchPress") }, 4)
        },
        {
          excercise: excercises.deadlift,
          sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("deadlift") }, 4)
        },
        {
          excercise: excercises.overheadPress,
          sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("overheadPress") }, 4)
        },
        {
          excercise: excercises.barbellRows,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("barbellRows") }, 4)
        }
      ]
    },
    {
      name: "Week A Day 3",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: [
            { reps: 4, weight: getWeight4("benchPress") },
            { reps: 4, weight: getWeight4("benchPress") },
            { reps: 4, weight: getWeight4("benchPress") },
            { reps: "amrap", weight: getWeight4("benchPress") }
          ]
        },
        {
          excercise: excercises.squat,
          sets: [
            { reps: 4, weight: getWeight4("squat") },
            { reps: 4, weight: getWeight4("squat") },
            { reps: 4, weight: getWeight4("squat") },
            { reps: "amrap", weight: getWeight4("squat") }
          ]
        },
        {
          excercise: excercises.overheadPress,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("overheadPress") }, 4)
        },
        {
          excercise: excercises.chinups,
          sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("chinups") }, 4)
        }
      ]
    },
    {
      name: "Week B Day 1",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("benchPress") }, 4)
        },
        {
          excercise: excercises.deadlift,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("deadlift") }, 4)
        },
        {
          excercise: excercises.overheadPress,
          sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("overheadPress") }, 4)
        },
        {
          excercise: excercises.barbellRows,
          sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("barbellRows") }, 4)
        }
      ]
    },
    {
      name: "Week B Day 2",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("benchPress") }, 4)
        },
        {
          excercise: excercises.squat,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("squat") }, 4)
        },
        {
          excercise: excercises.overheadPress,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("overheadPress") }, 4)
        },
        {
          excercise: excercises.chinups,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("chinups") }, 4)
        }
      ]
    },
    {
      name: "Week B Day 3",
      excercises: [
        {
          excercise: excercises.benchPress,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("benchPress") }, 4)
        },
        {
          excercise: excercises.deadlift,
          sets: [
            { reps: 4, weight: getWeight4("deadlift") },
            { reps: 4, weight: getWeight4("deadlift") },
            { reps: 4, weight: getWeight4("deadlift") },
            { reps: "amrap", weight: getWeight4("deadlift") }
          ]
        },
        {
          excercise: excercises.overheadPress,
          sets: [
            { reps: 4, weight: getWeight4("overheadPress") },
            { reps: 4, weight: getWeight4("overheadPress") },
            { reps: 4, weight: getWeight4("overheadPress") },
            { reps: "amrap", weight: getWeight4("overheadPress") }
          ]
        },
        {
          excercise: excercises.barbellRows,
          sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("barbellRows") }, 4)
        }
      ]
    }
  ]
};
