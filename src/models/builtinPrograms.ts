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
}

export const builtinProgramProperties: Partial<Record<string, IBuiltinProgramProperties>> = {
  basicBeginner: {
    id: "basicBeginner",
    frequency: 3,
    age: "less_than_3_months",
    duration: "30-45",
    goal: "strength",
  },
  the5314b: {
    id: "the5314b",
    frequency: 3,
    age: "3_to_12_months",
    duration: "90+",
    goal: "strength",
  },
  the531bbb: {
    id: "the531bbb",
    frequency: 4,
    age: "more_than_year",
    duration: "45-60",
    goal: "hypertrophy",
  },
  monolith531: {
    id: "monolith531",
    frequency: 3,
    age: "more_than_year",
    duration: "90+",
    goal: "strength_and_hypertrophy",
  },
  nsuns: {
    id: "nsuns",
    frequency: 4,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "strength",
  },
  gzclp: {
    id: "gzclp",
    frequency: 3,
    age: "3_to_12_months",
    duration: "45-60",
    goal: "strength",
  },
  "gzclp-blacknoir": {
    id: "gzclp",
    frequency: 3,
    age: "3_to_12_months",
    duration: "45-60",
    goal: "strength",
  },
  "gzcl-the-rippler": {
    id: "gzcl-the-rippler",
    frequency: 4,
    age: "more_than_year",
    duration: "45-60",
    goal: "strength",
  },
  "gzcl-jacked-and-tan-2": {
    id: "gzcl-jacked-and-tan-2",
    frequency: 4,
    age: "more_than_year",
    duration: "60-90",
    goal: "strength_and_hypertrophy",
  },
  "gzcl-uhf-9-weeks": {
    id: "gzcl-uhf-9-weeks",
    frequency: 5,
    age: "more_than_year",
    duration: "60-90",
    goal: "strength_and_hypertrophy",
  },
  "gzcl-uhf-5-weeks": {
    id: "gzcl-uhf-5-weeks",
    frequency: 5,
    age: "more_than_year",
    duration: "60-90",
    goal: "strength_and_hypertrophy",
  },
  "gzcl-vdip": {
    id: "gzcl-vdip",
    frequency: 5,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "strength",
  },
  "gzcl-general-gainz": {
    id: "gzcl-general-gainz",
    frequency: 4,
    age: "more_than_year",
    duration: "60-90",
    goal: "strength",
  },
  "gzcl-ggbb": {
    id: "gzcl-ggbb",
    frequency: 4,
    age: "more_than_year",
    duration: "90+",
    goal: "hypertrophy",
  },
  "gzcl-general-gainz-burrito-but-big": {
    id: "gzcl-general-gainz-burrito-but-big",
    frequency: 4,
    age: "more_than_year",
    duration: "60-90",
    goal: "hypertrophy",
  },
  madcow: {
    id: "madcow",
    frequency: 3,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "strength",
  },
  dbPpl: {
    id: "dbPpl",
    frequency: 6,
    age: "more_than_year",
    duration: "60-90",
    goal: "hypertrophy",
  },
  phul: {
    id: "phul",
    frequency: 4,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "strength_and_hypertrophy",
  },
  phrakgreyskull: {
    id: "phrakgreyskull",
    frequency: 3,
    age: "less_than_3_months",
    duration: "30-45",
    goal: "strength",
  },
  ss1: {
    id: "ss1",
    frequency: 3,
    age: "less_than_3_months",
    duration: "30-45",
    goal: "strength",
  },
  ss2: {
    id: "ss2",
    frequency: 3,
    age: "less_than_3_months",
    duration: "30-45",
    goal: "strength",
  },
  ss3: {
    id: "ss3",
    frequency: 3,
    age: "less_than_3_months",
    duration: "30-45",
    goal: "strength",
  },
  strongcurves: {
    id: "strongcurves",
    frequency: 3,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "hypertrophy",
  },
  texasmethod: {
    id: "texasmethod",
    frequency: 3,
    age: "3_to_12_months",
    duration: "45-60",
    goal: "strength",
  },
  arnoldgoldensix: {
    id: "arnoldgoldensix",
    frequency: 3,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "hypertrophy",
  },
  lylegenericbulking: {
    id: "lylegenericbulking",
    frequency: 4,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "hypertrophy",
  },
  metallicadpappl: {
    id: "metallicadpappl",
    frequency: 6,
    age: "3_to_12_months",
    duration: "60-90",
    goal: "hypertrophy",
  },
};
