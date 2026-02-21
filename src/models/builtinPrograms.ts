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
