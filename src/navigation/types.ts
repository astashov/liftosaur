import type { NavigatorScreenParams } from "@react-navigation/native";
import type { IDayData, IProgressUi, IShortDayData, IStatsKey } from "../types";

export type IHomeStackParamList = {
  main: { historyRecordId?: number } | undefined;
  progress: { id?: number } | undefined;
};

export type IOnboardingStackParamList = {
  first: undefined;
  units: undefined;
  setupequipment: undefined;
  setupplates: undefined;
  programselect: undefined;
  programs: undefined;
  programPreview: undefined;
  onerms: undefined;
};

export type IProgramStackParamList = {
  programs: undefined;
  editProgram: { programId: string };
  editProgramExercise: { programId: string; key: string; dayData: Required<IDayData> };
  onerms: undefined;
  programselect: undefined;
  programPreview: undefined;
  exerciseStats: undefined;
};

export type IWorkoutStackParamList = {
  progress: { id?: number } | undefined;
  finishDay: undefined;
  editProgramExercise: { programId: string; key: string; dayData: Required<IDayData> };
  muscles: undefined;
  exerciseStats: undefined;
};

export type IGraphsStackParamList = {
  graphs: undefined;
  progress: { id?: number } | undefined;
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
  programs: undefined;
  progress: { id?: number } | undefined;
};

export type IRootTabParamList = {
  home: NavigatorScreenParams<IHomeStackParamList>;
  program: NavigatorScreenParams<IProgramStackParamList>;
  workout: NavigatorScreenParams<IWorkoutStackParamList>;
  graphs: NavigatorScreenParams<IGraphsStackParamList>;
  me: NavigatorScreenParams<IMeStackParamList>;
};

export type IRootStackParamList = {
  onboarding: NavigatorScreenParams<IOnboardingStackParamList>;
  mainTabs: NavigatorScreenParams<IRootTabParamList>;
  subscription: undefined;
  amrapModal: NonNullable<IProgressUi["amrapModal"]> & { progressId: number };
  exercisePickerModal: { progressId: number };
  editProgramExercisePickerModal: {
    context: "editProgram" | "editProgramExercise";
    programId: string;
    exerciseStateKey?: string;
    dayData: IShortDayData;
    change: "one" | "all" | "duplicate";
    exerciseKey?: string;
  };
  editSetTargetModal: { progressId: number };
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
