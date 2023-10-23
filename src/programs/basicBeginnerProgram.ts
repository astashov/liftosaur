import { IProgram } from "../types";

export const basicBeginnerProgram: IProgram = {
  weeks: [],
  exercises: [
    {
      variationExpr: "1",
      exerciseType: {
        equipment: "barbell",
        id: "bentOverRow",
      },
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "state.weight",
            },
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "state.weight",
            },
            {
              repsExpr: "5",
              isAmrap: true,
              weightExpr: "state.weight",
            },
          ],
        },
      ],
      name: "Bent Over Row",
      id: "hsoqxnes",
      finishDayExpr:
        "if (sum(completedReps) >= 15) {\n  state.weight = weights[numberOfSets] +\n    state.increase * (completedReps[numberOfSets] > 10 ? 2 : 1)\n} else {\n  state.weight = state.weight * 0.9\n}",
      state: {
        weight: {
          value: 95,
          unit: "lb",
        },
        increase: {
          value: 2.5,
          unit: "lb",
        },
      },
      descriptions: [""],
      warmupSets: [
        {
          reps: 5,
          threshold: {
            value: 150,
            unit: "lb",
          },
          value: 0.3,
        },
        {
          reps: 5,
          threshold: {
            value: 125,
            unit: "lb",
          },
          value: 0.5,
        },
        {
          reps: 5,
          threshold: {
            value: 95,
            unit: "lb",
          },
          value: 0.8,
        },
      ],
      stateMetadata: {},
    },
    {
      variationExpr: "1",
      exerciseType: {
        equipment: "barbell",
        id: "benchPress",
      },
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "state.weight",
            },
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "state.weight",
            },
            {
              repsExpr: "5",
              isAmrap: true,
              weightExpr: "state.weight",
            },
          ],
        },
      ],
      name: "Bench Press",
      id: "dfrqoklv",
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 5lb : 2.5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
      state: {
        weight: {
          value: 45,
          unit: "lb",
        },
      },
      descriptions: [""],
      warmupSets: [
        {
          reps: 5,
          threshold: {
            value: 120,
            unit: "lb",
          },
          value: 0.3,
        },
        {
          reps: 5,
          threshold: {
            value: 90,
            unit: "lb",
          },
          value: 0.5,
        },
        {
          reps: 5,
          threshold: {
            value: 45,
            unit: "lb",
          },
          value: 0.8,
        },
      ],
      reuseLogic: {
        selected: "hsoqxnes",
        states: {
          cbehuuki: {
            weight: {
              value: 45,
              unit: "lb",
            },
          },
          hsoqxnes: {
            weight: {
              value: 45,
              unit: "lb",
            },
            increase: {
              value: 2.5,
              unit: "lb",
            },
          },
        },
      },
    },
    {
      variationExpr: "1",
      exerciseType: {
        equipment: "barbell",
        id: "squat",
      },
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "state.weight",
            },
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "state.weight",
            },
            {
              repsExpr: "5",
              isAmrap: true,
              weightExpr: "state.weight",
            },
          ],
        },
      ],
      name: "Squat",
      id: "cbehuuki",
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 10lb : 5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
      state: {
        weight: {
          value: 45,
          unit: "lb",
        },
      },
      descriptions: [""],
      warmupSets: [
        {
          reps: 5,
          threshold: {
            value: 120,
            unit: "lb",
          },
          value: 0.3,
        },
        {
          reps: 5,
          threshold: {
            value: 90,
            unit: "lb",
          },
          value: 0.5,
        },
        {
          reps: 5,
          threshold: {
            value: 45,
            unit: "lb",
          },
          value: 0.8,
        },
      ],
      reuseLogic: {
        selected: "hsoqxnes",
        states: {
          hsoqxnes: {
            weight: {
              value: 45,
              unit: "lb",
            },
            increase: {
              value: 5,
              unit: "lb",
            },
          },
        },
      },
    },
    {
      variationExpr: "1",
      exerciseType: {
        equipment: "bodyweight",
        id: "chinUp",
      },
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "0lb",
            },
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "0lb",
            },
            {
              repsExpr: "5",
              isAmrap: true,
              weightExpr: "0lb",
            },
          ],
        },
      ],
      name: "Chin Up",
      id: "xjvluydi",
      finishDayExpr: "",
      state: {},
      descriptions: [""],
      warmupSets: [
        {
          reps: 5,
          threshold: {
            value: 60,
            unit: "lb",
          },
          value: 0.3,
        },
        {
          reps: 5,
          threshold: {
            value: 30,
            unit: "lb",
          },
          value: 0.5,
        },
        {
          reps: 5,
          threshold: {
            value: 10,
            unit: "lb",
          },
          value: 0.8,
        },
      ],
      reuseLogic: {
        selected: "hsoqxnes",
        states: {
          hsoqxnes: {
            weight: {
              value: 0,
              unit: "lb",
            },
            increase: {
              value: 2.5,
              unit: "lb",
            },
          },
        },
      },
    },
    {
      variationExpr: "1",
      exerciseType: {
        equipment: "barbell",
        id: "overheadPress",
      },
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "state.weight",
            },
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "state.weight",
            },
            {
              repsExpr: "5",
              isAmrap: true,
              weightExpr: "state.weight",
            },
          ],
        },
      ],
      name: "Overhead Press",
      id: "wtygaluo",
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 5lb : 2.5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
      state: {
        weight: {
          value: 45,
          unit: "lb",
        },
      },
      descriptions: [""],
      warmupSets: [
        {
          reps: 5,
          threshold: {
            value: 120,
            unit: "lb",
          },
          value: 0.3,
        },
        {
          reps: 5,
          threshold: {
            value: 90,
            unit: "lb",
          },
          value: 0.5,
        },
        {
          reps: 5,
          threshold: {
            value: 45,
            unit: "lb",
          },
          value: 0.8,
        },
      ],
      reuseLogic: {
        selected: "hsoqxnes",
        states: {
          hsoqxnes: {
            weight: {
              value: 45,
              unit: "lb",
            },
            increase: {
              value: 2.5,
              unit: "lb",
            },
          },
        },
      },
    },
    {
      variationExpr: "1",
      exerciseType: {
        equipment: "barbell",
        id: "deadlift",
      },
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "state.weight",
            },
            {
              repsExpr: "5",
              isAmrap: false,
              weightExpr: "state.weight",
            },
            {
              repsExpr: "5",
              isAmrap: true,
              weightExpr: "state.weight",
            },
          ],
        },
      ],
      name: "Deadlift",
      id: "aclndsos",
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 10lb : 5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
      state: {
        weight: {
          value: 95,
          unit: "lb",
        },
      },
      descriptions: [""],
      warmupSets: [
        {
          reps: 5,
          threshold: {
            value: 150,
            unit: "lb",
          },
          value: 0.3,
        },
        {
          reps: 5,
          threshold: {
            value: 125,
            unit: "lb",
          },
          value: 0.5,
        },
        {
          reps: 5,
          threshold: {
            value: 95,
            unit: "lb",
          },
          value: 0.8,
        },
      ],
      reuseLogic: {
        selected: "hsoqxnes",
        states: {
          hsoqxnes: {
            weight: {
              value: 95,
              unit: "lb",
            },
            increase: {
              value: 5,
              unit: "lb",
            },
          },
        },
      },
    },
  ],
  author: "/r/fitness",
  name: "Basic Beginner Routine",
  days: [
    {
      exercises: [
        {
          id: "hsoqxnes",
        },
        {
          id: "dfrqoklv",
        },
        {
          id: "cbehuuki",
        },
      ],
      name: "Workout A",
      id: "ehhdnjey",
    },
    {
      exercises: [
        {
          id: "xjvluydi",
        },
        {
          id: "wtygaluo",
        },
        {
          id: "aclndsos",
        },
      ],
      name: "Workout B",
      id: "cnftviov",
    },
  ],
  description:
    "<div><p>This is a great starting routine for complete beginners.</p><p>It's simple, easy to follow routine, which will introduce you to weight lifting.</p><p>You should run it for ~3 months, and then switch to some other routine, like '5/3/1 for beginners'.</p></div>",
  id: "basicBeginner",
  shortDescription: "Great first starter program",
  nextDay: 1,
  url: "https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/",
  tags: ["first-starter", "barbell"],
  isMultiweek: false,
};
