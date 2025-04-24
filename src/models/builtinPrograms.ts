import { IExerciseType } from "../types";

export const builtinProgramFrequencies: Record<3 | 4 | 5 | 6, string> = {
  3: "3 days a week",
  4: "4 days a week",
  5: "5 days a week",
  6: "6 days a week",
};
export const builtinProgramFrequenciesKeys: (keyof typeof builtinProgramFrequencies)[] = [3, 4, 5, 6] as const;

export const builtinProgramAges: Record<"less_than_3_months" | "3_to_12_months" | "more_than_year", string> = {
  less_than_3_months: "less than 3 months",
  "3_to_12_months": "3 to 12 months",
  more_than_year: "more than a year",
};
export const builtinProgramAgesKeys: (keyof typeof builtinProgramAges)[] = [
  "less_than_3_months",
  "3_to_12_months",
  "more_than_year",
] as const;

export const builtinProgramDurations: Record<"30-45" | "45-60" | "60-90" | "90+", string> = {
  "30-45": "30-45 minutes",
  "45-60": "45-60 minutes",
  "60-90": "60-90 minutes",
  "90+": "90+ minutes",
};
export const builtinProgramDurationsKeys: (keyof typeof builtinProgramDurations)[] = [
  "30-45",
  "45-60",
  "60-90",
  "90+",
] as const;

export const builtinProgramGoals: Record<"strength" | "hypertrophy" | "strength_and_hypertrophy", string> = {
  strength: "strength",
  hypertrophy: "hypertrophy",
  strength_and_hypertrophy: "strength and hypertrophy",
};

export type IBuiltinProgramAge = keyof typeof builtinProgramAges;
export type IBuiltinProgramDuration = keyof typeof builtinProgramDurations;
export type IBuiltinProgramFrequency = keyof typeof builtinProgramFrequencies;
export type IBuiltinProgramGoal = keyof typeof builtinProgramGoals;

export interface IBuiltinProgramProperties {
  id: string;
  frequency: IBuiltinProgramFrequency;
  age: IBuiltinProgramAge;
  duration: IBuiltinProgramDuration;
  goal: IBuiltinProgramGoal;
  exercises: IExerciseType[];
  exercisesRange: [number, number];
  equipment: string[];
}

export const builtinProgramProperties: Partial<Record<string, IBuiltinProgramProperties>> = {
  basicBeginner: {
    id: "basicBeginner",
    frequency: 3,
    age: "less_than_3_months",
    duration: "30-45",
    goal: "strength",
    exercises: [
      {
        id: "bentOverRow",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "chinUp",
        equipment: "bodyweight",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
    ],
    equipment: ["barbell"],
    exercisesRange: [3, 3],
  },
  the5314b: {
    id: "the5314b",
    frequency: 3,
    age: "3_to_12_months",
    duration: "90+",
    goal: "strength",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "hangingLegRaise",
        equipment: "bodyweight",
      },
      {
        id: "chinUp",
        equipment: "bodyweight",
      },
      {
        id: "pushUp",
        equipment: "bodyweight",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "tricepsDip",
        equipment: "bodyweight",
      },
      {
        id: "invertedRow",
        equipment: "bodyweight",
      },
      {
        id: "bulgarianSplitSquat",
        equipment: "dumbbell",
      },
      {
        id: "pullUp",
        equipment: "bodyweight",
      },
    ],
    equipment: ["barbell", "dumbbell"],
    exercisesRange: [5, 5],
  },
  the531bbb: {
    id: "the531bbb",
    frequency: 4,
    age: "more_than_year",
    duration: "45-60",
    goal: "hypertrophy",
    exercises: [
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "abWheel",
        equipment: "bodyweight",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "chinUp",
        equipment: "bodyweight",
      },
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "hangingLegRaise",
        equipment: "bodyweight",
      },
    ],
    equipment: ["barbell", "cable"],
    exercisesRange: [2, 2],
  },
  monolith531: {
    id: "monolith531",
    frequency: 3,
    age: "more_than_year",
    duration: "90+",
    goal: "strength_and_hypertrophy",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "chinUp",
        equipment: "bodyweight",
      },
      {
        id: "facePull",
        equipment: "cable",
      },
      {
        id: "chestDip",
        equipment: "bodyweight",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "bentOverOneArmRow",
        equipment: "dumbbell",
      },
      {
        id: "bicepCurl",
        equipment: "dumbbell",
      },
      {
        id: "shrug",
        equipment: "dumbbell",
      },
    ],
    equipment: ["barbell", "cable", "dumbbell"],
    exercisesRange: [4, 5],
  },
  nsuns: {
    id: "nsuns",
    frequency: 4,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "strength",
    exercises: [
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "bicepCurl",
        equipment: "dumbbell",
      },
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "sumoDeadlift",
        equipment: "barbell",
      },
      {
        id: "hangingLegRaise",
        equipment: "bodyweight",
      },
      {
        id: "benchPressCloseGrip",
        equipment: "barbell",
      },
      {
        id: "hammerCurl",
        equipment: "dumbbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "frontSquat",
        equipment: "barbell",
      },
      {
        id: "abWheel",
        equipment: "bodyweight",
      },
    ],
    equipment: ["barbell", "dumbbell"],
    exercisesRange: [3, 3],
  },
  gzclp: {
    id: "gzclp",
    frequency: 3,
    age: "3_to_12_months",
    duration: "45-60",
    goal: "strength",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "bentOverRow",
        equipment: "barbell",
      },
    ],
    equipment: ["barbell", "cable"],
    exercisesRange: [3, 3],
  },
  "gzclp-blacknoir": {
    id: "gzclp",
    frequency: 3,
    age: "3_to_12_months",
    duration: "45-60",
    goal: "strength",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "bentOverRow",
        equipment: "barbell",
      },
    ],
    equipment: ["barbell", "cable"],
    exercisesRange: [3, 3],
  },
  "gzcl-the-rippler": {
    id: "gzcl-the-rippler",
    frequency: 4,
    age: "more_than_year",
    duration: "45-60",
    goal: "strength",
    exercises: [
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "barbell",
      },
      {
        id: "behindTheNeckPress",
        equipment: "barbell",
      },
      {
        id: "lateralRaise",
        equipment: "dumbbell",
      },
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "stiffLegDeadlift",
        equipment: "barbell",
      },
      {
        id: "pullUp",
        equipment: "bodyweight",
      },
      {
        id: "bicepCurl",
        equipment: "dumbbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "benchPressCloseGrip",
        equipment: "barbell",
      },
      {
        id: "pullover",
        equipment: "dumbbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "frontSquat",
        equipment: "barbell",
      },
      {
        id: "bentOverRow",
        equipment: "barbell",
      },
      {
        id: "reverseFly",
        equipment: "dumbbell",
      },
    ],
    equipment: ["barbell", "dumbbell"],
    exercisesRange: [1, 4],
  },
  "gzcl-jacked-and-tan-2": {
    id: "gzcl-jacked-and-tan-2",
    frequency: 4,
    age: "more_than_year",
    duration: "60-90",
    goal: "strength_and_hypertrophy",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "deficitDeadlift",
        equipment: "barbell",
      },
      {
        id: "inclineRow",
        equipment: "dumbbell",
      },
      {
        id: "tricepsPushdown",
        equipment: "cable",
      },
      {
        id: "bentOverRow",
        equipment: "cable",
      },
      {
        id: "hammerCurl",
        equipment: "dumbbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "benchPressCloseGrip",
        equipment: "barbell",
      },
      {
        id: "shoulderPress",
        equipment: "dumbbell",
      },
      {
        id: "shrug",
        equipment: "dumbbell",
      },
      {
        id: "pecDeck",
        equipment: "leverageMachine",
      },
      {
        id: "facePull",
        equipment: "cable",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "frontSquat",
        equipment: "barbell",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
      {
        id: "legExtension",
        equipment: "leverageMachine",
      },
      {
        id: "bentOverOneArmRow",
        equipment: "dumbbell",
      },
      {
        id: "bicepCurl",
        equipment: "ezbar",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "barbell",
      },
      {
        id: "pushPress",
        equipment: "kettlebell",
      },
      {
        id: "inclineCurl",
        equipment: "dumbbell",
      },
    ],
    equipment: ["barbell", "dumbbell", "cable", "leverageMachine", "ezbar", "kettlebell"],
    exercisesRange: [1, 6],
  },
  "gzcl-uhf-9-weeks": {
    id: "gzcl-uhf-9-weeks",
    frequency: 5,
    age: "more_than_year",
    duration: "60-90",
    goal: "strength_and_hypertrophy",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "barbell",
      },
      {
        id: "seatedRow",
        equipment: "cable",
      },
      {
        id: "bicepCurl",
        equipment: "dumbbell",
      },
      {
        id: "seatedLegCurl",
        equipment: "leverageMachine",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "shoulderPress",
        equipment: "dumbbell",
      },
      {
        id: "lateralRaise",
        equipment: "dumbbell",
      },
      {
        id: "pecDeck",
        equipment: "leverageMachine",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "legsUpBenchPress",
        equipment: "barbell",
      },
      {
        id: "pullUp",
        equipment: "bodyweight",
      },
      {
        id: "reverseHyperextension",
        equipment: "band",
      },
      {
        id: "reverseFly",
        equipment: "dumbbell",
      },
      {
        id: "slingShotBenchPress",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPressWideGrip",
        equipment: "barbell",
      },
      {
        id: "chestDip",
        equipment: "bodyweight",
      },
      {
        id: "tricepsExtension",
        equipment: "dumbbell",
      },
      {
        id: "safetySquatBarSquat",
        equipment: "barbell",
      },
      {
        id: "benchPressCloseGrip",
        equipment: "barbell",
      },
      {
        id: "stiffLegDeadlift",
        equipment: "barbell",
      },
      {
        id: "lunge",
        equipment: "barbell",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
    ],
    equipment: ["barbell", "cable", "dumbbell", "leverageMachine", "band"],
    exercisesRange: [3, 5],
  },
  "gzcl-uhf-5-weeks": {
    id: "gzcl-uhf-5-weeks",
    frequency: 5,
    age: "more_than_year",
    duration: "60-90",
    goal: "strength_and_hypertrophy",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "barbell",
      },
      {
        id: "seatedRow",
        equipment: "cable",
      },
      {
        id: "bicepCurl",
        equipment: "dumbbell",
      },
      {
        id: "seatedLegCurl",
        equipment: "leverageMachine",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "shoulderPress",
        equipment: "dumbbell",
      },
      {
        id: "lateralRaise",
        equipment: "dumbbell",
      },
      {
        id: "pecDeck",
        equipment: "leverageMachine",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "legsUpBenchPress",
        equipment: "barbell",
      },
      {
        id: "pullUp",
        equipment: "bodyweight",
      },
      {
        id: "reverseHyperextension",
        equipment: "band",
      },
      {
        id: "reverseFly",
        equipment: "dumbbell",
      },
      {
        id: "slingShotBenchPress",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPressWideGrip",
        equipment: "barbell",
      },
      {
        id: "chestDip",
        equipment: "bodyweight",
      },
      {
        id: "frontSquat",
        equipment: "barbell",
      },
      {
        id: "benchPressCloseGrip",
        equipment: "barbell",
      },
      {
        id: "stiffLegDeadlift",
        equipment: "barbell",
      },
      {
        id: "lunge",
        equipment: "barbell",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
    ],
    equipment: ["barbell", "cable", "dumbbell", "leverageMachine", "band"],
    exercisesRange: [4, 5],
  },
  "gzcl-vdip": {
    id: "gzcl-vdip",
    frequency: 5,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "strength",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "stiffLegDeadlift",
        equipment: "barbell",
      },
      {
        id: "lunge",
        equipment: "barbell",
      },
      {
        id: "pullUp",
        equipment: "bodyweight",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "bentOverRow",
        equipment: "barbell",
      },
      {
        id: "benchPressCloseGrip",
        equipment: "barbell",
      },
      {
        id: "shoulderPress",
        equipment: "dumbbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "frontSquat",
        equipment: "barbell",
      },
      {
        id: "bentOverOneArmRow",
        equipment: "dumbbell",
      },
      {
        id: "seatedRow",
        equipment: "cable",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "pushPress",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "barbell",
      },
      {
        id: "chestDip",
        equipment: "bodyweight",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
      {
        id: "bicepCurl",
        equipment: "ezbar",
      },
    ],
    equipment: ["barbell", "dumbbell", "cable", "ezbar"],
    exercisesRange: [4, 4],
  },
  "gzcl-general-gainz": {
    id: "gzcl-general-gainz",
    frequency: 4,
    age: "more_than_year",
    duration: "60-90",
    goal: "strength",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "romanianDeadlift",
        equipment: "barbell",
      },
      {
        id: "seatedLegCurl",
        equipment: "leverageMachine",
      },
      {
        id: "legExtension",
        equipment: "leverageMachine",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "barbell",
      },
      {
        id: "seatedRow",
        equipment: "cable",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "frontSquat",
        equipment: "barbell",
      },
      {
        id: "crunch",
        equipment: "cable",
      },
      {
        id: "goodMorning",
        equipment: "barbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "chinUp",
        equipment: "bodyweight",
      },
      {
        id: "bicepCurl",
        equipment: "dumbbell",
      },
      {
        id: "skullcrusher",
        equipment: "ezbar",
      },
    ],
    equipment: ["barbell", "leverageMachine", "cable", "dumbbell", "ezbar"],
    exercisesRange: [4, 4],
  },
  "gzcl-ggbb": {
    id: "gzcl-ggbb",
    frequency: 4,
    age: "more_than_year",
    duration: "90+",
    goal: "hypertrophy",
    exercises: [
      {
        id: "safetySquatBarSquat",
        equipment: "barbell",
      },
      {
        id: "abWheel",
        equipment: "bodyweight",
      },
      {
        id: "romanianDeadlift",
        equipment: "barbell",
      },
      {
        id: "cableCrunch",
        equipment: "cable",
      },
      {
        id: "legPress",
        equipment: "leverageMachine",
      },
      {
        id: "seatedLegCurl",
        equipment: "leverageMachine",
      },
      {
        id: "standingCalfRaise",
        equipment: "barbell",
      },
      {
        id: "cableTwist",
        equipment: "cable",
      },
      {
        id: "behindTheNeckPress",
        equipment: "barbell",
      },
      {
        id: "reverseFly",
        equipment: "dumbbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "barbell",
      },
      {
        id: "lateralRaise",
        equipment: "cable",
      },
      {
        id: "chestDip",
        equipment: "bodyweight",
      },
      {
        id: "frontRaise",
        equipment: "cable",
      },
      {
        id: "pushUp",
        equipment: "bodyweight",
      },
      {
        id: "lateralRaise",
        equipment: "dumbbell",
      },
      {
        id: "clean",
        equipment: "barbell",
      },
      {
        id: "pullUp",
        equipment: "bodyweight",
      },
      {
        id: "bentOverRow",
        equipment: "barbell",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
      {
        id: "seatedRow",
        equipment: "cable",
      },
      {
        id: "shoulderPress",
        equipment: "dumbbell",
      },
      {
        id: "bentOverOneArmRow",
        equipment: "dumbbell",
      },
      {
        id: "shrug",
        equipment: "dumbbell",
      },
      {
        id: "bicepCurl",
        equipment: "ezbar",
      },
      {
        id: "tricepsPushdown",
        equipment: "cable",
      },
      {
        id: "tricepsExtension",
        equipment: "dumbbell",
      },
      {
        id: "bicepCurl",
        equipment: "cable",
      },
      {
        id: "bicepCurl",
        equipment: "band",
      },
      {
        id: "tricepsExtension",
        equipment: "band",
      },
      {
        id: "hammerCurl",
        equipment: "dumbbell",
      },
      {
        id: "skullcrusher",
        equipment: "ezbar",
      },
    ],
    equipment: ["barbell", "cable", "leverageMachine", "dumbbell", "ezbar", "band"],
    exercisesRange: [8, 8],
  },
  "gzcl-general-gainz-burrito-but-big": {
    id: "gzcl-general-gainz-burrito-but-big",
    frequency: 4,
    age: "more_than_year",
    duration: "60-90",
    goal: "hypertrophy",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "romanianDeadlift",
        equipment: "barbell",
      },
      {
        id: "bicepCurl",
        equipment: "ezbar",
      },
      {
        id: "reverseFly",
        equipment: "dumbbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "pendlayRow",
        equipment: "barbell",
      },
      {
        id: "lateralRaise",
        equipment: "dumbbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "frontSquat",
        equipment: "barbell",
      },
      {
        id: "hangingLegRaise",
        equipment: "bodyweight",
      },
      {
        id: "skullcrusher",
        equipment: "ezbar",
      },
      {
        id: "benchPressCloseGrip",
        equipment: "barbell",
      },
      {
        id: "pullover",
        equipment: "ezbar",
      },
    ],
    equipment: ["barbell", "ezbar", "dumbbell"],
    exercisesRange: [4, 4],
  },
  madcow: {
    id: "madcow",
    frequency: 3,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "strength",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "bentOverRow",
        equipment: "barbell",
      },
      {
        id: "bicepCurl",
        equipment: "dumbbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "barbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "skullcrusher",
        equipment: "ezbar",
      },
      {
        id: "hammerCurl",
        equipment: "dumbbell",
      },
    ],
    equipment: ["barbell", "dumbbell", "ezbar"],
    exercisesRange: [4, 4],
  },
  dbPpl: {
    id: "dbPpl",
    frequency: 6,
    age: "more_than_year",
    duration: "60-90",
    goal: "hypertrophy",
    exercises: [
      {
        id: "benchPress",
        equipment: "dumbbell",
      },
      {
        id: "inclineChestFly",
        equipment: "dumbbell",
      },
      {
        id: "arnoldPress",
        equipment: "dumbbell",
      },
      {
        id: "tricepsExtension",
        equipment: "dumbbell",
      },
      {
        id: "hangingLegRaise",
        equipment: "bodyweight",
      },
      {
        id: "pullUp",
        equipment: "bodyweight",
      },
      {
        id: "bentOverRow",
        equipment: "dumbbell",
      },
      {
        id: "lateralRaise",
        equipment: "dumbbell",
      },
      {
        id: "shrug",
        equipment: "dumbbell",
      },
      {
        id: "bicepCurl",
        equipment: "dumbbell",
      },
      {
        id: "gobletSquat",
        equipment: "dumbbell",
      },
      {
        id: "lunge",
        equipment: "dumbbell",
      },
      {
        id: "singleLegDeadlift",
        equipment: "bodyweight",
      },
      {
        id: "standingCalfRaise",
        equipment: "dumbbell",
      },
    ],
    equipment: ["dumbbell"],
    exercisesRange: [5, 5],
  },
  phul: {
    id: "phul",
    frequency: 4,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "strength_and_hypertrophy",
    exercises: [
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "dumbbell",
      },
      {
        id: "bentOverRow",
        equipment: "barbell",
      },
      {
        id: "pullUp",
        equipment: "bodyweight",
      },
      {
        id: "shrug",
        equipment: "barbell",
      },
      {
        id: "bicepCurl",
        equipment: "barbell",
      },
      {
        id: "skullcrusher",
        equipment: "ezbar",
      },
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "legPress",
        equipment: "leverageMachine",
      },
      {
        id: "seatedLegCurl",
        equipment: "leverageMachine",
      },
      {
        id: "standingCalfRaise",
        equipment: "dumbbell",
      },
      {
        id: "seatedCalfRaise",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "barbell",
      },
      {
        id: "chestFly",
        equipment: "dumbbell",
      },
      {
        id: "seatedRow",
        equipment: "cable",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
      {
        id: "lateralRaise",
        equipment: "dumbbell",
      },
      {
        id: "hammerCurl",
        equipment: "dumbbell",
      },
      {
        id: "tricepsExtension",
        equipment: "cable",
      },
      {
        id: "lunge",
        equipment: "barbell",
      },
      {
        id: "legExtension",
        equipment: "leverageMachine",
      },
      {
        id: "romanianDeadlift",
        equipment: "dumbbell",
      },
    ],
    equipment: ["barbell", "dumbbell", "ezbar", "leverageMachine", "cable"],
    exercisesRange: [6, 7],
  },
  phrakgreyskull: {
    id: "phrakgreyskull",
    frequency: 3,
    age: "less_than_3_months",
    duration: "30-45",
    goal: "strength",
    exercises: [
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "chinUp",
        equipment: "bodyweight",
      },
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "bentOverRow",
        equipment: "barbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
    ],
    equipment: ["barbell"],
    exercisesRange: [3, 3],
  },
  ss1: {
    id: "ss1",
    frequency: 3,
    age: "less_than_3_months",
    duration: "30-45",
    goal: "strength",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
    ],
    equipment: ["barbell"],
    exercisesRange: [3, 3],
  },
  ss2: {
    id: "ss2",
    frequency: 3,
    age: "less_than_3_months",
    duration: "30-45",
    goal: "strength",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "powerClean",
        equipment: "barbell",
      },
    ],
    equipment: ["barbell"],
    exercisesRange: [3, 3],
  },
  ss3: {
    id: "ss3",
    frequency: 3,
    age: "less_than_3_months",
    duration: "30-45",
    goal: "strength",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "chinUp",
        equipment: "bodyweight",
      },
      {
        id: "powerClean",
        equipment: "barbell",
      },
    ],
    equipment: ["barbell"],
    exercisesRange: [3, 3],
  },
  strongcurves: {
    id: "strongcurves",
    frequency: 3,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "hypertrophy",
    exercises: [
      {
        id: "gluteBridge",
        equipment: "bodyweight",
      },
      {
        id: "bentOverOneArmRow",
        equipment: "dumbbell",
      },
      {
        id: "boxSquat",
        equipment: "dumbbell",
      },
      {
        id: "benchPress",
        equipment: "dumbbell",
      },
      {
        id: "romanianDeadlift",
        equipment: "dumbbell",
      },
      {
        id: "sideHipAbductor",
        equipment: "bodyweight",
      },
      {
        id: "plank",
        equipment: "bodyweight",
      },
      {
        id: "sidePlank",
        equipment: "bodyweight",
      },
      {
        id: "singleLegGluteBridgeStraight",
        equipment: "bodyweight",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
      {
        id: "stepUp",
        equipment: "dumbbell",
      },
      {
        id: "overheadPress",
        equipment: "dumbbell",
      },
      {
        id: "backExtension",
        equipment: "bodyweight",
      },
      {
        id: "sideLyingClam",
        equipment: "bodyweight",
      },
      {
        id: "gluteBridge",
        equipment: "dumbbell",
      },
      {
        id: "seatedRow",
        equipment: "cable",
      },
      {
        id: "squat",
        equipment: "dumbbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "dumbbell",
      },
      {
        id: "singleLegDeadlift",
        equipment: "dumbbell",
      },
      {
        id: "sideHipAbductor",
        equipment: "cable",
      },
      {
        id: "cableTwist",
        equipment: "cable",
      },
      {
        id: "hipThrust",
        equipment: "barbell",
      },
      {
        id: "gobletSquat",
        equipment: "dumbbell",
      },
      {
        id: "chinUp",
        equipment: "bodyweight",
      },
      {
        id: "lunge",
        equipment: "dumbbell",
      },
      {
        id: "reverseHyperextension",
        equipment: "band",
      },
      {
        id: "sideCrunch",
        equipment: "bodyweight",
      },
      {
        id: "invertedRow",
        equipment: "bodyweight",
      },
      {
        id: "benchPressCloseGrip",
        equipment: "barbell",
      },
      {
        id: "kettlebellSwing",
        equipment: "dumbbell",
      },
      {
        id: "hipAbductor",
        equipment: "cable",
      },
      {
        id: "bentOverRow",
        equipment: "dumbbell",
      },
      {
        id: "boxSquat",
        equipment: "barbell",
      },
      {
        id: "pushUp",
        equipment: "bodyweight",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "crunch",
        equipment: "bodyweight",
      },
      {
        id: "crossBodyCrunch",
        equipment: "bodyweight",
      },
      {
        id: "singleLegHipThrust",
        equipment: "bodyweight",
      },
      {
        id: "bulgarianSplitSquat",
        equipment: "dumbbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "goodMorning",
        equipment: "barbell",
      },
      {
        id: "inclineRow",
        equipment: "dumbbell",
      },
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "barbell",
      },
      {
        id: "hangingLegRaise",
        equipment: "bodyweight",
      },
    ],
    equipment: ["dumbbell", "cable", "barbell", "band"],
    exercisesRange: [8, 8],
  },
  texasmethod: {
    id: "texasmethod",
    frequency: 3,
    age: "3_to_12_months",
    duration: "45-60",
    goal: "strength",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "bicepCurl",
        equipment: "dumbbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "chinUp",
        equipment: "bodyweight",
      },
      {
        id: "backExtension",
        equipment: "bodyweight",
      },
      {
        id: "powerClean",
        equipment: "barbell",
      },
    ],
    equipment: ["barbell", "dumbbell"],
    exercisesRange: [3, 4],
  },
  arnoldgoldensix: {
    id: "arnoldgoldensix",
    frequency: 3,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "hypertrophy",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "benchPressWideGrip",
        equipment: "barbell",
      },
      {
        id: "chinUp",
        equipment: "bodyweight",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "bicepCurl",
        equipment: "dumbbell",
      },
      {
        id: "crunch",
        equipment: "bodyweight",
      },
    ],
    equipment: ["barbell", "dumbbell"],
    exercisesRange: [6, 6],
  },
  lylegenericbulking: {
    id: "lylegenericbulking",
    frequency: 4,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "hypertrophy",
    exercises: [
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "stiffLegDeadlift",
        equipment: "barbell",
      },
      {
        id: "legPress",
        equipment: "leverageMachine",
      },
      {
        id: "seatedLegCurl",
        equipment: "leverageMachine",
      },
      {
        id: "standingCalfRaise",
        equipment: "dumbbell",
      },
      {
        id: "seatedCalfRaise",
        equipment: "barbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "bentOverRow",
        equipment: "barbell",
      },
      {
        id: "shoulderPress",
        equipment: "dumbbell",
      },
      {
        id: "chinUp",
        equipment: "bodyweight",
      },
      {
        id: "skullcrusher",
        equipment: "ezbar",
      },
      {
        id: "hammerCurl",
        equipment: "dumbbell",
      },
    ],
    equipment: ["barbell", "leverageMachine", "dumbbell", "ezbar"],
    exercisesRange: [6, 6],
  },
  metallicadpappl: {
    id: "metallicadpappl",
    frequency: 6,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "hypertrophy",
    exercises: [
      {
        id: "deadlift",
        equipment: "barbell",
      },
      {
        id: "latPulldown",
        equipment: "cable",
      },
      {
        id: "seatedRow",
        equipment: "cable",
      },
      {
        id: "facePull",
        equipment: "cable",
      },
      {
        id: "hammerCurl",
        equipment: "dumbbell",
      },
      {
        id: "bicepCurl",
        equipment: "dumbbell",
      },
      {
        id: "benchPress",
        equipment: "barbell",
      },
      {
        id: "overheadPress",
        equipment: "barbell",
      },
      {
        id: "inclineBenchPress",
        equipment: "dumbbell",
      },
      {
        id: "tricepsPushdown",
        equipment: "cable",
      },
      {
        id: "tricepsExtension",
        equipment: "dumbbell",
      },
      {
        id: "lateralRaise",
        equipment: "dumbbell",
      },
      {
        id: "squat",
        equipment: "barbell",
      },
      {
        id: "romanianDeadlift",
        equipment: "barbell",
      },
      {
        id: "legPress",
        equipment: "leverageMachine",
      },
      {
        id: "seatedLegCurl",
        equipment: "leverageMachine",
      },
      {
        id: "standingCalfRaise",
        equipment: "dumbbell",
      },
      {
        id: "bentOverRow",
        equipment: "barbell",
      },
    ],
    equipment: ["barbell", "cable", "dumbbell", "leverageMachine"],
    exercisesRange: [5, 6],
  },
};
