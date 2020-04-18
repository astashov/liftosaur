import { IProgram, IProgramDay } from "../program";
import { IStats } from "../stats";
import { CollectionUtils } from "../../utils/collection";
import { Weight, IWeight } from "../weight";
import { ISet } from "../set";
import { IProgress } from "../progress";
import { IHistoryEntry } from "../history";

function initialState(): I5314BState {
  return {
    main: {
      benchPress: { trainingMax: 170 },
      overheadPress: { trainingMax: 115 },
      deadlift: { trainingMax: 265 },
      squat: { trainingMax: 195 }
    }
  };
}

type I5314BExcerciseType = "benchPress" | "deadlift" | "overheadPress" | "squat";

type I5314BState = {
  main: { [P in I5314BExcerciseType]: I5314BStateEntry };
};

type I5314BStateEntry = {
  trainingMax: IWeight;
};

function setsWeek1(trainingMax: IWeight): ISet[] {
  return [
    { reps: 5, weight: Weight.round(trainingMax * 0.65) },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: "amrap", weight: Weight.round(trainingMax * 0.85) },
    { reps: 5, weight: Weight.round(trainingMax * 0.65) },
    { reps: 5, weight: Weight.round(trainingMax * 0.65) },
    { reps: 5, weight: Weight.round(trainingMax * 0.65) },
    { reps: 5, weight: Weight.round(trainingMax * 0.65) },
    { reps: 5, weight: Weight.round(trainingMax * 0.65) }
  ];
}

function setsWeek2(trainingMax: IWeight): ISet[] {
  return [
    { reps: 3, weight: Weight.round(trainingMax * 0.7) },
    { reps: 3, weight: Weight.round(trainingMax * 0.8) },
    { reps: "amrap", weight: Weight.round(trainingMax * 0.9) },
    { reps: 5, weight: Weight.round(trainingMax * 0.7) },
    { reps: 5, weight: Weight.round(trainingMax * 0.7) },
    { reps: 5, weight: Weight.round(trainingMax * 0.7) },
    { reps: 5, weight: Weight.round(trainingMax * 0.7) },
    { reps: 5, weight: Weight.round(trainingMax * 0.7) }
  ];
}

function setsWeek3(trainingMax: IWeight): ISet[] {
  return [
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: 3, weight: Weight.round(trainingMax * 0.85) },
    { reps: "amrap", weight: Weight.round(trainingMax * 0.95) },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) },
    { reps: 5, weight: Weight.round(trainingMax * 0.75) }
  ];
}

function assistance1(): IHistoryEntry[] {
  return [
    {
      excercise: "pushups",
      sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5)
    },
    {
      excercise: "chinups",
      sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5)
    },
    {
      excercise: "legRaises",
      sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5)
    }
  ];
}

function assistance2(): IHistoryEntry[] {
  return [
    {
      excercise: "dips",
      sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5)
    },
    {
      excercise: "invertedRows",
      sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5)
    },
    {
      excercise: "singleLegSplitSquat",
      sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5)
    }
  ];
}

function assistance3(): IHistoryEntry[] {
  return [
    {
      excercise: "pushups",
      sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5)
    },
    {
      excercise: "pullups",
      sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5)
    },
    {
      excercise: "legRaises",
      sets: CollectionUtils.repeat({ reps: 10, weight: 0 }, 5)
    }
  ];
}

export const the5314bProgram: IProgram = {
  id: "the5314b",
  name: "5/3/1 for beginners",
  author: "Jim Wendler",
  url: "https://thefitness.wiki/routines/5-3-1-for-beginners",
  finishDay: (progress: IProgress, aStats: IStats, aState?: I5314BState): { state: I5314BState; stats: IStats } => {
    const state: I5314BState = aState ? JSON.parse(JSON.stringify(aState)) : initialState();
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
      state = state ?? initialState();
      return {
        name: "Week 1 Day 1",
        excercises: [
          {
            excercise: "squat",
            sets: setsWeek1(state.main.squat.trainingMax)
          },
          {
            excercise: "benchPress",
            sets: setsWeek1(state.main.benchPress.trainingMax)
          },
          ...assistance1()
        ]
      };
    },
    (state?: I5314BState): IProgramDay => {
      state = state ?? initialState();
      return {
        name: "Week 1 Day 2",
        excercises: [
          {
            excercise: "deadlift",
            sets: setsWeek1(state.main.deadlift.trainingMax)
          },
          {
            excercise: "overheadPress",
            sets: setsWeek1(state.main.overheadPress.trainingMax)
          },
          ...assistance2()
        ]
      };
    },
    (state?: I5314BState): IProgramDay => {
      state = state ?? initialState();
      return {
        name: "Week 1 Day 3",
        excercises: [
          {
            excercise: "benchPress",
            sets: setsWeek1(state.main.benchPress.trainingMax)
          },
          {
            excercise: "squat",
            sets: setsWeek1(state.main.squat.trainingMax)
          },
          ...assistance3()
        ]
      };
    },
    (state?: I5314BState): IProgramDay => {
      state = state ?? initialState();
      return {
        name: "Week 2 Day 1",
        excercises: [
          {
            excercise: "squat",
            sets: setsWeek2(state.main.squat.trainingMax)
          },
          {
            excercise: "benchPress",
            sets: setsWeek2(state.main.benchPress.trainingMax)
          },
          ...assistance1()
        ]
      };
    },
    (state?: I5314BState): IProgramDay => {
      state = state ?? initialState();
      return {
        name: "Week 2 Day 2",
        excercises: [
          {
            excercise: "deadlift",
            sets: setsWeek2(state.main.deadlift.trainingMax)
          },
          {
            excercise: "overheadPress",
            sets: setsWeek2(state.main.overheadPress.trainingMax)
          },
          ...assistance2()
        ]
      };
    },
    (state?: I5314BState): IProgramDay => {
      state = state ?? initialState();
      return {
        name: "Week 2 Day 3",
        excercises: [
          {
            excercise: "benchPress",
            sets: setsWeek2(state.main.benchPress.trainingMax)
          },
          {
            excercise: "squat",
            sets: setsWeek2(state.main.squat.trainingMax)
          },
          ...assistance3()
        ]
      };
    },
    (state?: I5314BState): IProgramDay => {
      state = state ?? initialState();
      return {
        name: "Week 3 Day 1",
        excercises: [
          {
            excercise: "squat",
            sets: setsWeek3(state.main.squat.trainingMax)
          },
          {
            excercise: "benchPress",
            sets: setsWeek3(state.main.benchPress.trainingMax)
          },
          ...assistance1()
        ]
      };
    },
    (state?: I5314BState): IProgramDay => {
      state = state ?? initialState();
      return {
        name: "Week 3 Day 2",
        excercises: [
          {
            excercise: "deadlift",
            sets: setsWeek3(state.main.deadlift.trainingMax)
          },
          {
            excercise: "overheadPress",
            sets: setsWeek3(state.main.overheadPress.trainingMax)
          },
          ...assistance2()
        ]
      };
    },
    (state?: I5314BState): IProgramDay => {
      state = state ?? initialState();
      return {
        name: "Week 3 Day 3",
        excercises: [
          {
            excercise: "benchPress",
            sets: setsWeek3(state.main.benchPress.trainingMax)
          },
          {
            excercise: "squat",
            sets: setsWeek3(state.main.squat.trainingMax)
          },
          ...assistance3()
        ]
      };
    }
  ]
};
