import { IProgram } from "../types";

export const basicBeginnerProgram: IProgram = {
  weeks: [
    {
      name: "Week 1",
      days: [
        {
          id: "shtcrnml",
        },
        {
          id: "bxgvgryn",
        },
        {
          id: "ufzrahnx",
        },
      ],
      id: "ccntzorr",
    },
    {
      name: "Week 2",
      days: [
        {
          id: "uhefvrlp",
        },
        {
          id: "pamefbxj",
        },
        {
          id: "osdlebbn",
        },
      ],
      id: "ctkxgibh",
    },
  ],
  author: "/r/fitness",
  clonedAt: 1708563096401,
  description:
    "<div><p>This is a great starting routine for complete beginners.</p><p>It's simple, easy to follow routine, which will introduce you to weight lifting.</p><p>You should run it for ~3 months, and then switch to some other routine, like '5/3/1 for beginners'.</p></div>",
  shortDescription: "Great first starter program",
  url: "https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/",
  tags: [],
  exercises: [
    {
      quickAddSets: false,
      variationExpr: "day == 1 ? 1 : day == 3 ? 2 : day == 5 ? 3 : 1",
      exerciseType: {
        equipment: "barbell",
        id: "bentOverRow",
      },
      variations: [
        {
          sets: [
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
      ],
      name: "Bent Over Row",
      id: "oexcdvua",
      state: {
        successes: 0,
        failures: 0,
      },
      finishDayExpr:
        "// progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nif (completedReps >= reps && completedRPE <= RPE) {\n  state.successes += 1;\n  if (state.successes >= 1) {\n    weights += 2.5lb\n    state.successes = 0\n    state.failures = 0\n  }\n}\nif (!(completedReps >= reps && completedRPE <= RPE)) {\n  state.failures += 1;\n  if (state.failures >= 1) {\n    weights -= 10%\n    state.failures = 0\n    state.successes = 0\n  }\n}",
      descriptions: [""],
      descriptionExpr: "1",
      enableRpe: false,
      enableRepRanges: false,
    },
    {
      quickAddSets: false,
      variationExpr: "day == 1 ? 1 : day == 3 ? 2 : day == 5 ? 3 : 1",
      exerciseType: {
        equipment: "barbell",
        id: "benchPress",
      },
      variations: [
        {
          sets: [
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
      ],
      name: "Bench Press",
      id: "uuwwnuja",
      state: {
        successes: 0,
        failures: 0,
      },
      finishDayExpr:
        "// progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nif (completedReps >= reps && completedRPE <= RPE) {\n  state.successes += 1;\n  if (state.successes >= 1) {\n    weights += 2.5lb\n    state.successes = 0\n    state.failures = 0\n  }\n}\nif (!(completedReps >= reps && completedRPE <= RPE)) {\n  state.failures += 1;\n  if (state.failures >= 1) {\n    weights -= 10%\n    state.failures = 0\n    state.successes = 0\n  }\n}",
      descriptions: [""],
      descriptionExpr: "1",
      enableRpe: false,
      enableRepRanges: false,
    },
    {
      quickAddSets: false,
      variationExpr: "day == 1 ? 1 : day == 3 ? 2 : day == 5 ? 3 : 1",
      exerciseType: {
        equipment: "barbell",
        id: "squat",
      },
      variations: [
        {
          sets: [
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
      ],
      name: "Squat",
      id: "ehtntflq",
      state: {
        successes: 0,
        failures: 0,
      },
      finishDayExpr:
        "// progress: lp(5lb, 1, 0, 10%, 1, 0)\nif (completedReps >= reps && completedRPE <= RPE) {\n  state.successes += 1;\n  if (state.successes >= 1) {\n    weights += 5lb\n    state.successes = 0\n    state.failures = 0\n  }\n}\nif (!(completedReps >= reps && completedRPE <= RPE)) {\n  state.failures += 1;\n  if (state.failures >= 1) {\n    weights -= 10%\n    state.failures = 0\n    state.successes = 0\n  }\n}",
      descriptions: [""],
      descriptionExpr: "1",
      enableRpe: false,
      enableRepRanges: false,
    },
    {
      quickAddSets: false,
      variationExpr: "day == 2 ? 1 : day == 4 ? 2 : day == 6 ? 3 : 1",
      exerciseType: {
        equipment: "bodyweight",
        id: "chinUp",
      },
      variations: [
        {
          sets: [
            {
              weightExpr: "0lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "0lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "0lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "0lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "0lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "0lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "0lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "0lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "0lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
      ],
      name: "Chin Up",
      id: "qsytoivd",
      state: {
        successes: 0,
        failures: 0,
      },
      finishDayExpr:
        "// progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nif (completedReps >= reps && completedRPE <= RPE) {\n  state.successes += 1;\n  if (state.successes >= 1) {\n    weights += 2.5lb\n    state.successes = 0\n    state.failures = 0\n  }\n}\nif (!(completedReps >= reps && completedRPE <= RPE)) {\n  state.failures += 1;\n  if (state.failures >= 1) {\n    weights -= 10%\n    state.failures = 0\n    state.successes = 0\n  }\n}",
      descriptions: [""],
      descriptionExpr: "1",
      enableRpe: false,
      enableRepRanges: false,
    },
    {
      quickAddSets: false,
      variationExpr: "day == 2 ? 1 : day == 4 ? 2 : day == 6 ? 3 : 1",
      exerciseType: {
        equipment: "barbell",
        id: "overheadPress",
      },
      variations: [
        {
          sets: [
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "45lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
      ],
      name: "Overhead Press",
      id: "lodvsiwx",
      state: {
        successes: 0,
        failures: 0,
      },
      finishDayExpr:
        "// progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nif (completedReps >= reps && completedRPE <= RPE) {\n  state.successes += 1;\n  if (state.successes >= 1) {\n    weights += 2.5lb\n    state.successes = 0\n    state.failures = 0\n  }\n}\nif (!(completedReps >= reps && completedRPE <= RPE)) {\n  state.failures += 1;\n  if (state.failures >= 1) {\n    weights -= 10%\n    state.failures = 0\n    state.successes = 0\n  }\n}",
      descriptions: [""],
      descriptionExpr: "1",
      enableRpe: false,
      enableRepRanges: false,
    },
    {
      quickAddSets: false,
      variationExpr: "day == 2 ? 1 : day == 4 ? 2 : day == 6 ? 3 : 1",
      exerciseType: {
        equipment: "barbell",
        id: "deadlift",
      },
      variations: [
        {
          sets: [
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
        {
          sets: [
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: false,
              repsExpr: "5",
              askWeight: false,
            },
            {
              weightExpr: "95lb",
              isAmrap: true,
              repsExpr: "5",
              askWeight: false,
            },
          ],
        },
      ],
      name: "Deadlift",
      id: "lfdmdshh",
      state: {
        successes: 0,
        failures: 0,
      },
      finishDayExpr:
        "// progress: lp(5lb, 1, 0, 10%, 1, 0)\nif (completedReps >= reps && completedRPE <= RPE) {\n  state.successes += 1;\n  if (state.successes >= 1) {\n    weights += 5lb\n    state.successes = 0\n    state.failures = 0\n  }\n}\nif (!(completedReps >= reps && completedRPE <= RPE)) {\n  state.failures += 1;\n  if (state.failures >= 1) {\n    weights -= 10%\n    state.failures = 0\n    state.successes = 0\n  }\n}",
      descriptions: [""],
      descriptionExpr: "1",
      enableRpe: false,
      enableRepRanges: false,
    },
  ],
  name: "Basic Beginner Routine",
  days: [
    {
      name: "Workout A",
      exercises: [
        {
          id: "oexcdvua",
        },
        {
          id: "uuwwnuja",
        },
        {
          id: "ehtntflq",
        },
      ],
      id: "shtcrnml",
    },
    {
      name: "Workout B",
      exercises: [
        {
          id: "qsytoivd",
        },
        {
          id: "lodvsiwx",
        },
        {
          id: "lfdmdshh",
        },
      ],
      id: "bxgvgryn",
    },
    {
      name: "Workout A",
      exercises: [
        {
          id: "oexcdvua",
        },
        {
          id: "uuwwnuja",
        },
        {
          id: "ehtntflq",
        },
      ],
      id: "ufzrahnx",
    },
    {
      name: "Workout A",
      exercises: [
        {
          id: "qsytoivd",
        },
        {
          id: "lodvsiwx",
        },
        {
          id: "lfdmdshh",
        },
      ],
      id: "uhefvrlp",
    },
    {
      name: "Workout B",
      exercises: [
        {
          id: "oexcdvua",
        },
        {
          id: "uuwwnuja",
        },
        {
          id: "ehtntflq",
        },
      ],
      id: "pamefbxj",
    },
    {
      name: "Workout B",
      exercises: [
        {
          id: "qsytoivd",
        },
        {
          id: "lodvsiwx",
        },
        {
          id: "lfdmdshh",
        },
      ],
      id: "osdlebbn",
    },
  ],
  id: "basicBeginner",
  planner: {
    name: "Basic Beginner Routine",
    weeks: [
      {
        name: "Week 1",
        days: [
          {
            name: "Workout A",
            exerciseText:
              "Bent Over Row, Barbell / 2x5, 1x5+ / 95lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nBench Press, Barbell / 2x5, 1x5+ / 45lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nSquat, Barbell / 2x5, 1x5+ / 45lb / progress: lp(5lb, 1, 0, 10%, 1, 0)",
          },
          {
            name: "Workout B",
            exerciseText:
              "Chin Up / 2x5, 1x5+ / 0lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nOverhead Press, Barbell / 2x5, 1x5+ / 45lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nDeadlift, Barbell / 2x5, 1x5+ / 95lb / progress: lp(5lb, 1, 0, 10%, 1, 0)",
          },
          {
            name: "Workout A",
            exerciseText: "Bent Over Row, Barbell / 2x5, 1x5+ / 95lb\nBench Press, Barbell / 2x5, 1x5+ / 45lb\nSquat, Barbell / 2x5, 1x5+ / 45lb",
          },
        ],
      },
      {
        name: "Week 2",
        days: [
          {
            name: "Workout A",
            exerciseText: "Chin Up / 2x5, 1x5+ / 0lb\nOverhead Press, Barbell / 2x5, 1x5+ / 45lb\nDeadlift, Barbell / 2x5, 1x5+ / 95lb",
          },
          {
            name: "Workout B",
            exerciseText: "Bent Over Row, Barbell / 2x5, 1x5+ / 95lb\nBench Press, Barbell / 2x5, 1x5+ / 45lb\nSquat, Barbell / 2x5, 1x5+ / 45lb",
          },
          {
            name: "Workout B",
            exerciseText: "Chin Up / 2x5, 1x5+ / 0lb\nOverhead Press, Barbell / 2x5, 1x5+ / 45lb\nDeadlift, Barbell / 2x5, 1x5+ / 95lb",
          },
        ],
      },
    ],
  },
  nextDay: 1,
  isMultiweek: true,
};
