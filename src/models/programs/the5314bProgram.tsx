import { IProgram, IProgramDay } from "../program";
import { IStats } from "../stats";
import { CollectionUtils } from "../../utils/collection";
import { Weight, IWeight } from "../weight";
import { ISet } from "../set";
import { IProgress } from "../progress";
import { IExcerciseType } from "../excercise";
import { ObjectUtils } from "../../utils/object";
import { h } from "preact";

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

export type I5314BExcerciseType = "benchPress" | "deadlift" | "overheadPress" | "squat";
export type I5314BAccessoryDays = [I5314BAccessoryDay, I5314BAccessoryDay, I5314BAccessoryDay];

export type I5314BState = {
  main: { [P in I5314BExcerciseType]: I5314BStateEntry };
  accessories: I5314BAccessoryDays;
};

export type I5314BAccessoryDay = {
  push: I5314BAccessory;
  pull: I5314BAccessory;
  legs: I5314BAccessory;
};

export type I5314BAccessory = {
  excercise: IExcerciseType;
  sets: ISet[];
};

type I5314BStateEntry = {
  trainingMax: IWeight;
};

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
  finishDay: (progress: IProgress, aStats: IStats, aState?: I5314BState): { state: I5314BState; stats: IStats } => {
    const state: I5314BState = aState ? JSON.parse(JSON.stringify(aState)) : getInitialState();
    const stats: IStats = JSON.parse(JSON.stringify(aStats));

    if (progress.day === the5314bProgram.days.length - 1) {
      state.main.benchPress.trainingMax += 5;
      state.main.overheadPress.trainingMax += 5;
      state.main.squat.trainingMax += 10;
      state.main.deadlift.trainingMax += 10;
    }
    return { state, stats };
  },
  days: [
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
};
