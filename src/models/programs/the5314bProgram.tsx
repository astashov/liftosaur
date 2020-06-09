import { IProgram, IProgramDay } from "../program";
import { IStats } from "../stats";
import { CollectionUtils } from "../../utils/collection";
import { Weight, IWeight } from "../weight";
import { ISet, TSet } from "../set";
import { Excercise, TExcerciseType } from "../excercise";
import { ObjectUtils } from "../../utils/object";
import { h } from "preact";
import { lf } from "../../utils/lens";
import { IHistoryRecord } from "../history";
import * as t from "io-ts";

export function getInitialState(): I5314BState {
  return {
    main: {
      benchPress: { trainingMax: 170 },
      overheadPress: { trainingMax: 115 },
      deadlift: { trainingMax: 265 },
      squat: { trainingMax: 195 },
    },
    accessories: bodyweightAccessoriesPreset(),
  };
}

export function bodyweightAccessoriesPreset(): I5314BAccessoryDays {
  return [
    {
      push: { excercise: "pushups", sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5) },
      pull: { excercise: "chinups", sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5) },
      legs: { excercise: "legRaises", sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5) },
    },
    {
      push: { excercise: "dips", sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5) },
      pull: { excercise: "invertedRows", sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5) },
      legs: { excercise: "singleLegSplitSquat", sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5) },
    },
    {
      push: { excercise: "pushups", sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5) },
      pull: { excercise: "pullups", sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5) },
      legs: { excercise: "legRaises", sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5) },
    },
  ];
}

export function mirrorBroAccessoriesPreset(): I5314BAccessoryDays {
  return [
    {
      push: { excercise: "dbLateralRaise", sets: CollectionUtils.repeat({ reps: 8, weight: 25 }, 8) },
      pull: { excercise: "dbBicepCurl", sets: CollectionUtils.repeat({ reps: 8, weight: 25 }, 8) },
      legs: { excercise: "legRaises", sets: CollectionUtils.repeat({ reps: 8, weight: 0 }, 8) },
    },
    {
      push: { excercise: "inclineDbBenchPress", sets: CollectionUtils.repeat({ reps: 8, weight: 50 }, 8) },
      pull: { excercise: "dbShrug", sets: CollectionUtils.repeat({ reps: 8, weight: 50 }, 8) },
      legs: { excercise: "cableCrunch", sets: CollectionUtils.repeat({ reps: 8, weight: 50 }, 8) },
    },
    {
      push: { excercise: "tricepsPushdown", sets: CollectionUtils.repeat({ reps: 8, weight: 50 }, 8) },
      pull: { excercise: "neutralGripChinup", sets: CollectionUtils.repeat({ reps: 8, weight: 0 }, 8) },
      legs: { excercise: "plank", sets: CollectionUtils.repeat({ reps: 8, weight: 0 }, 8) },
    },
  ];
}

export const T5314BExcerciseType = t.keyof(
  {
    benchPress: null,
    deadlift: null,
    overheadPress: null,
    squat: null,
  },
  "T5314BExcerciseType"
);
export type I5314BExcerciseType = t.TypeOf<typeof T5314BExcerciseType>;

export const T5314BAccessory = t.type(
  {
    excercise: TExcerciseType,
    sets: t.array(TSet),
  },
  "T5314BAccessory"
);
export type I5314BAccessory = t.TypeOf<typeof T5314BAccessory>;

export const T5314BAccessoryDay = t.type(
  {
    push: T5314BAccessory,
    pull: T5314BAccessory,
    legs: T5314BAccessory,
  },
  "T5314BAccessoryDay"
);
export type I5314BAccessoryDay = t.TypeOf<typeof T5314BAccessoryDay>;

export const T5314BAccessoryDays = t.tuple(
  [T5314BAccessoryDay, T5314BAccessoryDay, T5314BAccessoryDay],
  "T5314BAccessoryDays"
);
export type I5314BAccessoryDays = t.TypeOf<typeof T5314BAccessoryDays>;

export const T5314BStateEntry = t.type(
  {
    trainingMax: t.number,
  },
  "T5314BStateEntry"
);
export type I5314BStateEntry = t.TypeOf<typeof T5314BStateEntry>;

export const T5314BState = t.type(
  {
    main: t.dictionary(T5314BExcerciseType, T5314BStateEntry),
    accessories: T5314BAccessoryDays,
  },
  "T5314BState"
);
export type I5314BState = t.TypeOf<typeof T5314BState>;

function setsWeek1(trainingMax: IWeight): ISet[] {
  return [
    { reps: 5, weight: Weight.round(trainingMax * 0.65) },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: 5, weight: Weight.round(trainingMax * 0.85), isAmrap: true },
    { reps: 5, weight: Weight.round(trainingMax * 0.65) },
    { reps: 5, weight: Weight.round(trainingMax * 0.65) },
    { reps: 5, weight: Weight.round(trainingMax * 0.65) },
    { reps: 5, weight: Weight.round(trainingMax * 0.65) },
    { reps: 5, weight: Weight.round(trainingMax * 0.65) },
  ];
}

function setsWeek2(trainingMax: IWeight): ISet[] {
  return [
    { reps: 3, weight: Weight.round(trainingMax * 0.7) },
    { reps: 3, weight: Weight.round(trainingMax * 0.8) },
    { reps: 3, weight: Weight.round(trainingMax * 0.9), isAmrap: true },
    { reps: 5, weight: Weight.round(trainingMax * 0.7) },
    { reps: 5, weight: Weight.round(trainingMax * 0.7) },
    { reps: 5, weight: Weight.round(trainingMax * 0.7) },
    { reps: 5, weight: Weight.round(trainingMax * 0.7) },
    { reps: 5, weight: Weight.round(trainingMax * 0.7) },
  ];
}

function setsWeek3(trainingMax: IWeight): ISet[] {
  return [
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: 3, weight: Weight.round(trainingMax * 0.85) },
    { reps: 1, weight: Weight.round(trainingMax * 0.95), isAmrap: true },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
  ];
}

function trainingWeek(trainingMax: IWeight): ISet[] {
  return [
    { reps: 5, weight: Weight.round(trainingMax * 0.7) },
    { reps: 5, weight: Weight.round(trainingMax * 0.8) },
    { reps: 3, weight: Weight.round(trainingMax * 0.9) },
    { reps: 3, weight: Weight.round(trainingMax), isAmrap: true },
  ];
}

function adjustAfterTestingTrainingMax(
  state: I5314BState,
  progress: IHistoryRecord,
  excerciseType: I5314BExcerciseType
): I5314BState {
  const excercise = Excercise.get(excerciseType);
  const entry = progress.entries.find((e) => e.excercise === excerciseType);
  const set = entry?.sets.find((s) => s.isAmrap);
  if (set != null && set.completedReps != null && set.completedReps < set.reps) {
    const newWeight = Weight.getTrainingMax(set.weight, set.completedReps);
    if (confirm(`Set the new training max for ${excercise.name} = ${newWeight}lb?`)) {
      return lf(state).p("main").p(excerciseType).p("trainingMax").set(newWeight);
    } else {
      return state;
    }
  } else {
    return state;
  }
}

export const the5314bProgram: IProgram = {
  id: "the5314b",
  name: "5/3/1 for beginners",
  author: "Jim Wendler",
  url: "https://thefitness.wiki/routines/5-3-1-for-beginners",
  description: (
    <div>
      <p>A very popular weight lifting routine - 5/3/1 by Jim Wendler, adapted for beginners.</p>
      <p>
        Good both for strength and size, it's well tested by time and helped thousands of lifters to achieve their goals
      </p>
    </div>
  ),
  finishDay: (
    progress: IHistoryRecord,
    aStats: IStats,
    aState?: I5314BState
  ): { state: I5314BState; stats: IStats } => {
    let state: I5314BState = aState || getInitialState();
    let stats: IStats = aStats;

    const programDay = the5314bProgram.days[progress.day](state);
    if (programDay.name === "Week 3 Day 3") {
      state = lf(state)
        .p("main")
        .p("benchPress")
        .p("trainingMax")
        .modify((v) => v + 5);
      state = lf(state)
        .p("main")
        .p("overheadPress")
        .p("trainingMax")
        .modify((v) => v + 5);
      state = lf(state)
        .p("main")
        .p("squat")
        .p("trainingMax")
        .modify((v) => v + 10);
      state = lf(state)
        .p("main")
        .p("deadlift")
        .p("trainingMax")
        .modify((v) => v + 10);
    } else if (programDay.name === "Squat Testing Day") {
      state = adjustAfterTestingTrainingMax(state, progress, "squat");
    } else if (programDay.name === "Overhead Press Testing Day") {
      state = adjustAfterTestingTrainingMax(state, progress, "overheadPress");
    } else if (programDay.name === "Deadlift Testing Day") {
      state = adjustAfterTestingTrainingMax(state, progress, "deadlift");
    } else if (programDay.name === "Bench Press Testing Day") {
      state = adjustAfterTestingTrainingMax(state, progress, "benchPress");
    }
    progress.entries.forEach((entry) => {
      const maxSet = CollectionUtils.sort(entry.sets, (a, b) => {
        return b.weight !== a.weight ? b.weight - a.weight : (b.completedReps || 0) - (a.completedReps || 0);
      })[0];
      const reps = maxSet.completedReps || 0;
      if (reps !== 0) {
        stats = lf(stats)
          .p("excercises")
          .p(entry.excercise)
          .modify((v) => {
            v = v || { maxWeight: [] };
            v.maxWeight = v.maxWeight || [];
            v = lf(v)
              .p("maxWeight")
              .modify((va) => [
                ...va,
                {
                  timestamp: Date.now(),
                  programId: "the5314b",
                  day: progress.day,
                  reps,
                  weight: maxSet.weight,
                },
              ]);
            return v;
          });
      }
    });

    return { state, stats };
  },
  days: [
    ...CollectionUtils.flat(
      CollectionUtils.repeat(
        [
          (state?: I5314BState): IProgramDay => {
            state = state ?? getInitialState();
            return {
              name: "Week 1 Day 1",
              excercises: [
                {
                  excercise: "squat",
                  sets: setsWeek1(state.main.squat.trainingMax),
                },
                {
                  excercise: "benchPress",
                  sets: setsWeek1(state.main.benchPress.trainingMax),
                },
                ...ObjectUtils.values(state.accessories[0]),
              ],
            };
          },
          (state?: I5314BState): IProgramDay => {
            state = state ?? getInitialState();
            return {
              name: "Week 1 Day 2",
              excercises: [
                {
                  excercise: "deadlift",
                  sets: setsWeek1(state.main.deadlift.trainingMax),
                },
                {
                  excercise: "overheadPress",
                  sets: setsWeek1(state.main.overheadPress.trainingMax),
                },
                ...ObjectUtils.values(state.accessories[1]),
              ],
            };
          },
          (state?: I5314BState): IProgramDay => {
            state = state ?? getInitialState();
            return {
              name: "Week 1 Day 3",
              excercises: [
                {
                  excercise: "benchPress",
                  sets: setsWeek1(state.main.benchPress.trainingMax),
                },
                {
                  excercise: "squat",
                  sets: setsWeek1(state.main.squat.trainingMax),
                },
                ...ObjectUtils.values(state.accessories[2]),
              ],
            };
          },
          (state?: I5314BState): IProgramDay => {
            state = state ?? getInitialState();
            return {
              name: "Week 2 Day 1",
              excercises: [
                {
                  excercise: "squat",
                  sets: setsWeek2(state.main.squat.trainingMax),
                },
                {
                  excercise: "benchPress",
                  sets: setsWeek2(state.main.benchPress.trainingMax),
                },
                ...ObjectUtils.values(state.accessories[0]),
              ],
            };
          },
          (state?: I5314BState): IProgramDay => {
            state = state ?? getInitialState();
            return {
              name: "Week 2 Day 2",
              excercises: [
                {
                  excercise: "deadlift",
                  sets: setsWeek2(state.main.deadlift.trainingMax),
                },
                {
                  excercise: "overheadPress",
                  sets: setsWeek2(state.main.overheadPress.trainingMax),
                },
                ...ObjectUtils.values(state.accessories[1]),
              ],
            };
          },
          (state?: I5314BState): IProgramDay => {
            state = state ?? getInitialState();
            return {
              name: "Week 2 Day 3",
              excercises: [
                {
                  excercise: "benchPress",
                  sets: setsWeek2(state.main.benchPress.trainingMax),
                },
                {
                  excercise: "squat",
                  sets: setsWeek2(state.main.squat.trainingMax),
                },
                ...ObjectUtils.values(state.accessories[2]),
              ],
            };
          },
          (state?: I5314BState): IProgramDay => {
            state = state ?? getInitialState();
            return {
              name: "Week 3 Day 1",
              excercises: [
                {
                  excercise: "squat",
                  sets: setsWeek3(state.main.squat.trainingMax),
                },
                {
                  excercise: "benchPress",
                  sets: setsWeek3(state.main.benchPress.trainingMax),
                },
                ...ObjectUtils.values(state.accessories[0]),
              ],
            };
          },
          (state?: I5314BState): IProgramDay => {
            state = state ?? getInitialState();
            return {
              name: "Week 3 Day 2",
              excercises: [
                {
                  excercise: "deadlift",
                  sets: setsWeek3(state.main.deadlift.trainingMax),
                },
                {
                  excercise: "overheadPress",
                  sets: setsWeek3(state.main.overheadPress.trainingMax),
                },
                ...ObjectUtils.values(state.accessories[1]),
              ],
            };
          },
          (state?: I5314BState): IProgramDay => {
            state = state ?? getInitialState();
            return {
              name: "Week 3 Day 3",
              excercises: [
                {
                  excercise: "benchPress",
                  sets: setsWeek3(state.main.benchPress.trainingMax),
                },
                {
                  excercise: "squat",
                  sets: setsWeek3(state.main.squat.trainingMax),
                },
                ...ObjectUtils.values(state.accessories[2]),
              ],
            };
          },
        ],
        3
      )
    ),
    ...[
      (state?: I5314BState): IProgramDay => {
        state = state ?? getInitialState();
        return {
          name: "Squat Testing Day",
          excercises: [
            {
              excercise: "squat",
              sets: trainingWeek(state.main.squat.trainingMax),
            },
            {
              excercise: "benchPress",
              sets: setsWeek1(state.main.benchPress.trainingMax),
            },
            ...ObjectUtils.values(state.accessories[0]),
          ],
        };
      },
      (state?: I5314BState): IProgramDay => {
        state = state ?? getInitialState();
        return {
          name: "Overhead Press Testing Day",
          excercises: [
            {
              excercise: "overheadPress",
              sets: trainingWeek(state.main.overheadPress.trainingMax),
            },
            {
              excercise: "deadlift",
              sets: setsWeek1(state.main.deadlift.trainingMax),
            },
            ...ObjectUtils.values(state.accessories[1]),
          ],
        };
      },
      (state?: I5314BState): IProgramDay => {
        state = state ?? getInitialState();
        return {
          name: "Deadlift Testing Day",
          excercises: [
            {
              excercise: "deadlift",
              sets: trainingWeek(state.main.deadlift.trainingMax),
            },
            {
              excercise: "overheadPress",
              sets: setsWeek1(state.main.overheadPress.trainingMax),
            },
            ...ObjectUtils.values(state.accessories[2]),
          ],
        };
      },
      (state?: I5314BState): IProgramDay => {
        state = state ?? getInitialState();
        return {
          name: "Bench Press Testing Day",
          excercises: [
            {
              excercise: "benchPress",
              sets: trainingWeek(state.main.benchPress.trainingMax),
            },
            {
              excercise: "squat",
              sets: setsWeek1(state.main.squat.trainingMax),
            },
            ...ObjectUtils.values(state.accessories[0]),
          ],
        };
      },
    ],
  ],
};
