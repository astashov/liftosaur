import { IProgram } from "../types";

export const basicBeginnerProgram: IProgram = {
  deletedDays: [],
  weeks: [],
  author: "/r/fitness",
  description:
    "<div><p>This is a great starting routine for complete beginners.</p><p>It's simple, easy to follow routine, which will introduce you to weight lifting.</p><p>You should run it for ~3 months, and then switch to some other routine, like '5/3/1 for beginners'.</p></div>",
  shortDescription: "Great first starter program",
  url: "https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/",
  tags: ["first-starter", "barbell"],
  deletedWeeks: [],
  exercises: [
    {
      variationExpr: "1",
      stateMetadata: {},
      exerciseType: { equipment: "barbell", id: "bentOverRow" },
      variations: [
        {
          sets: [
            { repsExpr: "5", isAmrap: false, weightExpr: "state.weight" },
            { repsExpr: "5", isAmrap: false, weightExpr: "state.weight" },
            { repsExpr: "5", isAmrap: true, weightExpr: "state.weight" },
          ],
        },
      ],
      warmupSets: [
        { value: 0.3, threshold: { value: 150, unit: "lb" }, reps: 5 },
        { value: 0.5, threshold: { value: 125, unit: "lb" }, reps: 5 },
        { value: 0.8, threshold: { value: 95, unit: "lb" }, reps: 5 },
      ],
      name: "Bent Over Row",
      id: "hsoqxnes",
      finishDayExpr:
        "if (sum(completedReps) >= 15) {\n  state.weight = weights[numberOfSets] +\n    state.increase * (completedReps[numberOfSets] > 10 ? 2 : 1)\n} else {\n  state.weight = state.weight * 0.9\n}",
      state: { increase: { value: 2.5, unit: "lb" }, weight: { value: 95, unit: "lb" } },
      reuseLogic: { states: {}, selected: undefined },
      descriptions: [""],
      diffPaths: [],
    },
    {
      variationExpr: "1",
      stateMetadata: {},
      exerciseType: { equipment: "barbell", id: "benchPress" },
      variations: [
        {
          sets: [
            { repsExpr: "5", isAmrap: false, weightExpr: "state.weight" },
            { repsExpr: "5", isAmrap: false, weightExpr: "state.weight" },
            { repsExpr: "5", isAmrap: true, weightExpr: "state.weight" },
          ],
        },
      ],
      warmupSets: [
        { value: 0.3, threshold: { value: 120, unit: "lb" }, reps: 5 },
        { value: 0.5, threshold: { value: 90, unit: "lb" }, reps: 5 },
        { value: 0.8, threshold: { value: 45, unit: "lb" }, reps: 5 },
      ],
      name: "Bench Press",
      id: "dfrqoklv",
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 5lb : 2.5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
      state: { weight: { value: 45, unit: "lb" } },
      reuseLogic: {
        selected: "hsoqxnes",
        states: {
          hsoqxnes: { increase: { value: 2.5, unit: "lb" }, weight: { value: 45, unit: "lb" } },
          cbehuuki: { weight: { value: 45, unit: "lb" } },
        },
      },
      descriptions: [""],
      diffPaths: [],
    },
    {
      variationExpr: "1",
      stateMetadata: {},
      exerciseType: { equipment: "barbell", id: "squat" },
      variations: [
        {
          sets: [
            { repsExpr: "5", isAmrap: false, weightExpr: "state.weight" },
            { repsExpr: "5", isAmrap: false, weightExpr: "state.weight" },
            { repsExpr: "5", isAmrap: true, weightExpr: "state.weight" },
          ],
        },
      ],
      warmupSets: [
        { value: 0.3, threshold: { value: 120, unit: "lb" }, reps: 5 },
        { value: 0.5, threshold: { value: 90, unit: "lb" }, reps: 5 },
        { value: 0.8, threshold: { value: 45, unit: "lb" }, reps: 5 },
      ],
      name: "Squat",
      id: "cbehuuki",
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 10lb : 5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
      state: { weight: { value: 45, unit: "lb" } },
      reuseLogic: {
        selected: "hsoqxnes",
        states: { hsoqxnes: { increase: { value: 5, unit: "lb" }, weight: { value: 45, unit: "lb" } } },
      },
      descriptions: [""],
      diffPaths: [],
    },
    {
      variationExpr: "1",
      stateMetadata: {},
      exerciseType: { equipment: "bodyweight", id: "chinUp" },
      variations: [
        {
          sets: [
            { repsExpr: "5", isAmrap: false, weightExpr: "0lb" },
            { repsExpr: "5", isAmrap: false, weightExpr: "0lb" },
            { repsExpr: "5", isAmrap: true, weightExpr: "0lb" },
          ],
        },
      ],
      warmupSets: [
        { value: 0.3, threshold: { value: 60, unit: "lb" }, reps: 5 },
        { value: 0.5, threshold: { value: 30, unit: "lb" }, reps: 5 },
        { value: 0.8, threshold: { value: 10, unit: "lb" }, reps: 5 },
      ],
      name: "Chin Up",
      id: "xjvluydi",
      finishDayExpr: "",
      state: {},
      reuseLogic: {
        selected: "hsoqxnes",
        states: { hsoqxnes: { increase: { value: 2.5, unit: "lb" }, weight: { value: 0, unit: "lb" } } },
      },
      descriptions: [""],
      diffPaths: [],
    },
    {
      variationExpr: "1",
      stateMetadata: {},
      exerciseType: { equipment: "barbell", id: "overheadPress" },
      variations: [
        {
          sets: [
            { repsExpr: "5", isAmrap: false, weightExpr: "state.weight" },
            { repsExpr: "5", isAmrap: false, weightExpr: "state.weight" },
            { repsExpr: "5", isAmrap: true, weightExpr: "state.weight" },
          ],
        },
      ],
      warmupSets: [
        { value: 0.3, threshold: { value: 120, unit: "lb" }, reps: 5 },
        { value: 0.5, threshold: { value: 90, unit: "lb" }, reps: 5 },
        { value: 0.8, threshold: { value: 45, unit: "lb" }, reps: 5 },
      ],
      name: "Overhead Press",
      id: "wtygaluo",
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 5lb : 2.5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
      state: { weight: { value: 45, unit: "lb" } },
      reuseLogic: {
        selected: "hsoqxnes",
        states: { hsoqxnes: { increase: { value: 2.5, unit: "lb" }, weight: { value: 45, unit: "lb" } } },
      },
      descriptions: [""],
      diffPaths: [],
    },
    {
      variationExpr: "1",
      stateMetadata: {},
      exerciseType: { equipment: "barbell", id: "deadlift" },
      variations: [
        {
          sets: [
            { repsExpr: "5", isAmrap: false, weightExpr: "state.weight" },
            { repsExpr: "5", isAmrap: false, weightExpr: "state.weight" },
            { repsExpr: "5", isAmrap: true, weightExpr: "state.weight" },
          ],
        },
      ],
      warmupSets: [
        { value: 0.3, threshold: { value: 150, unit: "lb" }, reps: 5 },
        { value: 0.5, threshold: { value: 125, unit: "lb" }, reps: 5 },
        { value: 0.8, threshold: { value: 95, unit: "lb" }, reps: 5 },
      ],
      name: "Deadlift",
      id: "aclndsos",
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 10lb : 5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
      state: { weight: { value: 95, unit: "lb" } },
      reuseLogic: {
        selected: "hsoqxnes",
        states: { hsoqxnes: { increase: { value: 5, unit: "lb" }, weight: { value: 95, unit: "lb" } } },
      },
      descriptions: [""],
      diffPaths: [],
    },
  ],
  name: "Basic Beginner Routine",
  days: [
    { exercises: [{ id: "hsoqxnes" }, { id: "dfrqoklv" }, { id: "cbehuuki" }], name: "Workout A", id: "ehhdnjey" },
    { exercises: [{ id: "xjvluydi" }, { id: "wtygaluo" }, { id: "aclndsos" }], name: "Workout B", id: "cnftviov" },
  ],
  id: "basicBeginner",
  deletedExercises: [],
  nextDay: 1,
  isMultiweek: false,
};
