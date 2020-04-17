import { IExcerciseType, Excercise } from "../excercise";
import { IProgram, IProgramDay } from "../program";
import { IStats, IStatsExcercises } from "../stats";
import { CollectionUtils } from "../../utils/collection";
import { Weight, IWeight } from "../weight";
import { IProgress, Progress } from "../progress";

function increment(excerciseType: IExcerciseType): number {
  switch (excerciseType) {
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

function getWeight4(excerciseType: IExcerciseType, state?: IIvysaurState): number {
  const weight = state?.[excerciseType]?.weight;
  if (weight != null) {
    return weight + increment(excerciseType);
  } else {
    return Excercise.get(excerciseType).startWeight;
  }
}

function getWeight8(excerciseType: IExcerciseType, state?: IIvysaurState): number {
  const excercise = Excercise.get(excerciseType);
  return Weight.round(Math.max(excercise.startWeight, getWeight4(excerciseType, state) * 0.9));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// function isIvysaurState(state: any): state is IIvysaurState {
//   const key = Object.keys(state)[0] as string | undefined;
//   if (key != null) {
//     return "failed" in state[key] && "weight" in state[key];
//   } else {
//     return true;
//   }
// }

type IIvysaurState = {
  [P in IExcerciseType]?: IIvysaurStateEntry;
};

type IIvysaurStateEntry = {
  failed: number;
  weight: IWeight;
};

export const ivySaurProgram: IProgram = {
  id: "ivySaur",
  name: "IvySaur Program",
  author: "https://old.reddit.com/user/lvysaur",
  url: "https://old.reddit.com/r/Fitness/comments/4uijsl/a_detailed_look_at_why_stronglifts_starting",
  finishDay: (progress: IProgress, aStats: IStats, aState?: IIvysaurState): { state: IIvysaurState; stats: IStats } => {
    const state: IIvysaurState = JSON.parse(JSON.stringify(aState));
    const stats: IStats = JSON.parse(JSON.stringify(aStats));
    progress.entries.forEach(entry => {
      const excercise = Excercise.get(entry.excercise);
      const oldStateEntry = state[excercise.id];
      if (Progress.isCompletedSet(entry)) {
        const set = entry.sets[0];
        const weight = Weight.round(set.reps === 4 ? set.weight : Weight.round(set.weight * 1.11111));
        state[excercise.id] = { failed: 0, weight: weight };
      } else if (oldStateEntry != null) {
        const failed = oldStateEntry.failed + 1;
        if (failed < 3) {
          state[excercise.id] = { ...oldStateEntry, failed: failed };
        } else {
          const weight = Math.max(
            excercise.startWeight,
            Weight.round(oldStateEntry.weight * 0.9) - increment(excercise.id)
          );
          state[excercise.id] = { weight, failed: 0 };
        }
      } else {
        state[excercise.id] = { failed: 1, weight: excercise.startWeight };
      }
    });
    progress.entries.forEach(entry => {
      const oldStatsExcerciseValue = stats.excercises[entry.excercise];
      const set = entry.sets[0];
      if (Progress.isCompletedSet(entry)) {
        stats.excercises[entry.excercise] = {
          ...oldStatsExcerciseValue,
          weights: {
            ...oldStatsExcerciseValue?.weights,
            [`${entry.sets.length}x${set.reps}`]: set.weight
          }
        };
      }
    });
    return { state, stats };
  },
  days: [
    (state?: IIvysaurState): IProgramDay => {
      return {
        name: "Week A Day 1",
        excercises: [
          {
            excercise: "benchPress",
            sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("benchPress", state) }, 4)
          },
          {
            excercise: "squat",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("squat", state) }, 4)
          },
          {
            excercise: "overheadPress",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("overheadPress", state) }, 4)
          },
          {
            excercise: "chinups",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("chinups", state) }, 4)
          }
        ]
      };
    },
    (state?: IIvysaurState): IProgramDay => {
      return {
        name: "Week A Day 2",
        excercises: [
          {
            excercise: "benchPress",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("benchPress", state) }, 4)
          },
          {
            excercise: "deadlift",
            sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("deadlift", state) }, 4)
          },
          {
            excercise: "overheadPress",
            sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("overheadPress", state) }, 4)
          },
          {
            excercise: "barbellRows",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("barbellRows", state) }, 4)
          }
        ]
      };
    },
    (state?: IIvysaurState): IProgramDay => {
      return {
        name: "Week A Day 3",
        excercises: [
          {
            excercise: "benchPress",
            sets: [
              { reps: 4, weight: getWeight4("benchPress", state) },
              { reps: 4, weight: getWeight4("benchPress", state) },
              { reps: 4, weight: getWeight4("benchPress", state) },
              { reps: "amrap", weight: getWeight4("benchPress", state) }
            ]
          },
          {
            excercise: "squat",
            sets: [
              { reps: 4, weight: getWeight4("squat", state) },
              { reps: 4, weight: getWeight4("squat", state) },
              { reps: 4, weight: getWeight4("squat", state) },
              { reps: "amrap", weight: getWeight4("squat", state) }
            ]
          },
          {
            excercise: "overheadPress",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("overheadPress", state) }, 4)
          },
          {
            excercise: "chinups",
            sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("chinups", state) }, 4)
          }
        ]
      };
    },
    (state?: IIvysaurState): IProgramDay => {
      return {
        name: "Week B Day 1",
        excercises: [
          {
            excercise: "benchPress",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("benchPress", state) }, 4)
          },
          {
            excercise: "deadlift",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("deadlift", state) }, 4)
          },
          {
            excercise: "overheadPress",
            sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("overheadPress", state) }, 4)
          },
          {
            excercise: "barbellRows",
            sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("barbellRows", state) }, 4)
          }
        ]
      };
    },
    (state?: IIvysaurState): IProgramDay => {
      return {
        name: "Week B Day 2",
        excercises: [
          {
            excercise: "benchPress",
            sets: CollectionUtils.repeat({ reps: 4, weight: getWeight4("benchPress", state) }, 4)
          },
          {
            excercise: "squat",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("squat", state) }, 4)
          },
          {
            excercise: "overheadPress",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("overheadPress", state) }, 4)
          },
          {
            excercise: "chinups",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("chinups", state) }, 4)
          }
        ]
      };
    },
    (state?: IIvysaurState): IProgramDay => {
      return {
        name: "Week B Day 3",
        excercises: [
          {
            excercise: "benchPress",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("benchPress", state) }, 4)
          },
          {
            excercise: "deadlift",
            sets: [
              { reps: 4, weight: getWeight4("deadlift", state) },
              { reps: 4, weight: getWeight4("deadlift", state) },
              { reps: 4, weight: getWeight4("deadlift", state) },
              { reps: "amrap", weight: getWeight4("deadlift", state) }
            ]
          },
          {
            excercise: "overheadPress",
            sets: [
              { reps: 4, weight: getWeight4("overheadPress", state) },
              { reps: 4, weight: getWeight4("overheadPress", state) },
              { reps: 4, weight: getWeight4("overheadPress", state) },
              { reps: "amrap", weight: getWeight4("overheadPress", state) }
            ]
          },
          {
            excercise: "barbellRows",
            sets: CollectionUtils.repeat({ reps: 8, weight: getWeight8("barbellRows", state) }, 4)
          }
        ]
      };
    }
  ]
};
