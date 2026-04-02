import type { NavigatorScreenParams } from "@react-navigation/native";
import type { IDayData, IStatsKey } from "../types";

export type IHomeStackParamList = {
  main: { historyRecordId?: number } | undefined;
};

export type IOnboardingStackParamList = {
  first: undefined;
  units: undefined;
  setupequipment: undefined;
  setupplates: undefined;
  "onboarding/programselect": undefined;
  "onboarding/programs": undefined;
  "onboarding/programPreview": undefined;
};

export type IProgramStackParamList = {
  programs: undefined;
  editProgram: { programId: string };
  editProgramExercise: { programId: string; key: string; dayData: Required<IDayData> };
  onerms: undefined;
  programselect: undefined;
  programPreview: undefined;
};

export type IWorkoutStackParamList = {
  progress: { id?: number } | undefined;
  finishDay: undefined;
  "workout/editProgramExercise": { programId: string; key: string; dayData: Required<IDayData> };
  muscles: undefined;
};

export type IGraphsStackParamList = {
  graphs: undefined;
};

export type IMeStackParamList = {
  settings: undefined;
  account: undefined;
  timers: undefined;
  plates: undefined;
  gyms: undefined;
  exercises: undefined;
  appleHealth: undefined;
  googleHealth: undefined;
  muscleGroups: undefined;
  stats: undefined;
  measurements: { key: IStatsKey } | undefined;
  exerciseStats: undefined;
  apiKeys: undefined;
  "me/programs": undefined;
};

export type IRootTabParamList = {
  homeTab: NavigatorScreenParams<IHomeStackParamList>;
  programTab: NavigatorScreenParams<IProgramStackParamList>;
  workoutTab: NavigatorScreenParams<IWorkoutStackParamList>;
  graphsTab: NavigatorScreenParams<IGraphsStackParamList>;
  meTab: NavigatorScreenParams<IMeStackParamList>;
};

export type IRootStackParamList = {
  onboarding: NavigatorScreenParams<IOnboardingStackParamList>;
  mainTabs: NavigatorScreenParams<IRootTabParamList>;
  subscription: undefined;
};

export type IRootLevelScreenParamList = {
  subscription: undefined;
};

export type IAllScreenParamList = IOnboardingStackParamList &
  IHomeStackParamList &
  IProgramStackParamList &
  IWorkoutStackParamList &
  IGraphsStackParamList &
  IMeStackParamList &
  IRootLevelScreenParamList;
