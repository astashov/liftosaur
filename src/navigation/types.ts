import type { NavigatorScreenParams } from "@react-navigation/native";
import type { IDayData, IExerciseType, IProgressUi, IShortDayData, IStatsKey } from "../types";

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
  amrapModal: NonNullable<IProgressUi["amrapModal"]> &
    ({ context: "workout"; progressId: number } | { context: "playground"; weekIndex: number; dayIndex: number });
  exercisePickerModal: { progressId: number };
  editProgramExercisePickerModal: {
    context: "editProgram" | "editProgramExercise";
    programId: string;
    exerciseStateKey?: string;
    dayData: IShortDayData;
    change: "one" | "all" | "duplicate";
    exerciseKey?: string;
  };
  editSetTargetModal:
    | { context: "workout"; progressId: number }
    | { context: "playground"; weekIndex: number; dayIndex: number };
  dateModal: { progressId: number };
  equipmentModal: { progressId: number };
  rm1Modal: { progressId: number };
  supersetPickerModal: { progressId: number };
  playgroundEditModal: { weekIndex: number; dayIndex: number };
  exerciseInfoModal: { exerciseType: IExerciseType };
  couponModal: undefined;
  newGymModal: undefined;
  createProgramModal: undefined;
  importFromLinkModal: undefined;
  affiliateModal: undefined;
  importFromOtherAppsModal: undefined;
  dayFromAdhocModal: { progressId: number };
  nextWorkoutModal: undefined;
  whatsnewModal: undefined;
  signupRequestModal: undefined;
  thanks25Modal: undefined;
  corruptedStateModal: undefined;
  debugModal: undefined;
  workoutShareModal: { progressId: number };
  socialShareModal: { type: "igstory" | "igfeed" | "tiktok" };
  customExerciseModal: { exerciseId?: string };
  musclesOverrideModal: { exerciseType: IExerciseType };
  tourModal: undefined;
  editProgramMenuModal: { programId: string };
  programNextDayModal: { programId: string };
  editProgramExerciseSetModal: { exerciseStateKey: string; programId: string };
  editProgramExerciseSupersetModal: { exerciseStateKey: string; programId: string; exerciseKey: string };
  createStateVariableModal: { exerciseStateKey: string; programId: string };
  programImageExportModal: { programId: string };
  programRevisionsModal: { programId: string };
  editProgressScriptModal: { exerciseStateKey: string; programId: string };
  editUpdateScriptModal: { exerciseStateKey: string; programId: string };
  monthCalendarModal: undefined;
  accountModal: undefined;
  subscriptionInfoModal: { type: "platesCalculator" | "graphs" | "notifications" | "weekInsights" };
  weekInsightsDetailsModal: { selectedFirstDayOfWeek: number };
  plannerSettingsModal: { context: "programHistory" } | { context: "editProgram"; programId: string };
  editMuscleGroupsModal: { context: "programHistory" } | { context: "editProgram"; programId: string };
  weekStatsModal: { programId: string };
  dayStatsModal: { programId: string };
  exerciseStatsModal: { programId: string };
  editExerciseChangeModal: { programId: string };
  graphsModal: undefined;
  statsSettingsModal: undefined;
  programInfoModal: { programId: string; hasCustomPrograms: boolean };
  changeNextDayModal: undefined;
  inputSelectModal: undefined;
  textInputModal: undefined;
  repMaxCalculatorModal: undefined;
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
