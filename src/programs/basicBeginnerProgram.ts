import { IProgram } from "../types";

export const basicBeginnerProgram: IProgram = {
  exercises: [
    {
      variationExpr: "1",
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: true,
            },
          ],
        },
      ],
      exerciseType: {
        equipment: "barbell",
        id: "bentOverRow",
      },
      name: "Bent Over Row",
      id: "hsoqxnes",
      state: {
        weight: {
          value: 65,
          unit: "lb",
        },
        bump: {
          value: 2.5,
          unit: "lb",
        },
      },
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? (state.bump * 2) : state.bump)\n} else {\n  state.weight = state.weight * 0.9\n}",
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
    },
    {
      variationExpr: "1",
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: true,
            },
          ],
        },
      ],
      exerciseType: {
        equipment: "barbell",
        id: "benchPress",
      },
      name: "Bench Press",
      id: "dfrqoklv",
      state: {
        weight: {
          value: 45,
          unit: "lb",
        },
      },
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 5lb : 2.5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
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
            bump: {
              value: 2.5,
              unit: "lb",
            },
          },
        },
      },
    },
    {
      variationExpr: "1",
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: true,
            },
          ],
        },
      ],
      exerciseType: {
        equipment: "barbell",
        id: "squat",
      },
      name: "Squat",
      id: "cbehuuki",
      state: {
        weight: {
          value: 45,
          unit: "lb",
        },
      },
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 10lb : 5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
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
            bump: {
              value: 5,
              unit: "lb",
            },
          },
        },
      },
    },
    {
      variationExpr: "1",
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              weightExpr: "0lb",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "0lb",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "0lb",
              isAmrap: true,
            },
          ],
        },
      ],
      exerciseType: {
        id: "chinUp",
      },
      name: "Chin Up",
      id: "xjvluydi",
      state: {},
      finishDayExpr: "",
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
        selected: undefined,
        states: {
          hsoqxnes: {
            weight: {
              value: 0,
              unit: "lb",
            },
            bump: {
              value: 2.5,
              unit: "lb",
            },
          },
        },
      },
    },
    {
      variationExpr: "1",
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: true,
            },
          ],
        },
      ],
      exerciseType: {
        equipment: "barbell",
        id: "overheadPress",
      },
      name: "Overhead Press",
      id: "wtygaluo",
      state: {
        weight: {
          value: 45,
          unit: "lb",
        },
      },
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 5lb : 2.5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
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
            bump: {
              value: 2.5,
              unit: "lb",
            },
          },
        },
      },
    },
    {
      variationExpr: "1",
      variations: [
        {
          sets: [
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: false,
            },
            {
              repsExpr: "5",
              weightExpr: "state.weight",
              isAmrap: true,
            },
          ],
        },
      ],
      exerciseType: {
        equipment: "barbell",
        id: "deadlift",
      },
      name: "Deadlift",
      id: "aclndsos",
      state: {
        weight: {
          value: 95,
          unit: "lb",
        },
      },
      finishDayExpr:
        "if (cr[1] + cr[2] + cr[3] >= 15) {\n  state.weight = w[3] +\n    (cr[3] > 10 ? 10lb : 5lb)\n} else {\n  state.weight = state.weight * 0.9\n}",
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
            bump: {
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
  description:
    "<div><p>This is a great starting routine for complete beginners.</p><p>It's simple, easy to follow routine, which will introduce you to weight lifting.</p><p>You should run it for ~3 months, and then switch to some other routine, like '5/3/1 for beginners'.</p></div>",
  days: [
    {
      name: "Workout A",
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
    },
    {
      name: "Workout B",
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
    },
  ],
  id: "basicBeginner",
  url: "https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/",
  nextDay: 1,
  tags: ["first-starter", "barbell"],
};
