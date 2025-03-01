import { IProgram } from "../types";

export const basicBeginnerProgram: IProgram = {
  weeks: [],
  author: "/r/fitness",
  clonedAt: 1708563096401,
  description:
    "<div><p>This is a great starting routine for complete beginners.</p><p>It's simple, easy to follow routine, which will introduce you to weight lifting.</p><p>You should run it for ~3 months, and then switch to some other routine, like '5/3/1 for beginners'.</p></div>",
  shortDescription: "Great first starter program",
  url: "https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/",
  tags: [],
  exercises: [],
  name: "Basic Beginner Routine",
  days: [],
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
              "Bent Over Row / 2x5, 1x5+ / 95lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nBench Press / 2x5, 1x5+ / 45lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nSquat / 2x5, 1x5+ / 45lb / progress: lp(5lb, 1, 0, 10%, 1, 0)",
          },
          {
            name: "Workout B",
            exerciseText:
              "Chin Up / 2x5, 1x5+ / 0lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nOverhead Press / 2x5, 1x5+ / 45lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)\nDeadlift / 2x5, 1x5+ / 95lb / progress: lp(5lb, 1, 0, 10%, 1, 0)",
          },
          {
            name: "Workout A",
            exerciseText: "Bent Over Row / 2x5, 1x5+ / 95lb\nBench Press / 2x5, 1x5+ / 45lb\nSquat / 2x5, 1x5+ / 45lb",
          },
        ],
      },
      {
        name: "Week 2",
        days: [
          {
            name: "Workout A",
            exerciseText: "Chin Up / 2x5, 1x5+ / 0lb\nOverhead Press / 2x5, 1x5+ / 45lb\nDeadlift / 2x5, 1x5+ / 95lb",
          },
          {
            name: "Workout B",
            exerciseText: "Bent Over Row / 2x5, 1x5+ / 95lb\nBench Press / 2x5, 1x5+ / 45lb\nSquat / 2x5, 1x5+ / 45lb",
          },
          {
            name: "Workout B",
            exerciseText: "Chin Up / 2x5, 1x5+ / 0lb\nOverhead Press / 2x5, 1x5+ / 45lb\nDeadlift / 2x5, 1x5+ / 95lb",
          },
        ],
      },
    ],
  },
  nextDay: 1,
  isMultiweek: true,
};
