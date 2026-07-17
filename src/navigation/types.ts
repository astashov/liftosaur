import type { NavigatorScreenParams } from "@react-navigation/native";
import type {
  IDayData,
  IEquipment,
  IExerciseType,
  IHistoryRecord,
  IScreenMuscle,
  IShortDayData,
  IStatsKey,
} from "../types";
import type { IHelpKey } from "../components/help/helpRegistry";

export type IHomeStackParamList = {
  main: { historyRecordId?: number } | undefined;
  progress: { id?: number } | undefined;
  exerciseStats: undefined;
};

export type IOnboardingStackParamList = {
  first: undefined;
  units: undefined;
  setupequipment: undefined;
  setupplates: undefined;
  hearaboutus: undefined;
  programselect: undefined;
  programs: undefined;
  programPreview: undefined;
  onerms: undefined;
};

export type IProgramStackParamList = {
  programs: undefined;
  editProgram: { programId: string };
  editProgramExercise: { programId: string; key: string; dayData: Required<IDayData>; fromWorkout?: boolean };
  onerms: undefined;
  programselect: undefined;
  programPreview: undefined;
  exerciseStats: undefined;
};

export type IWorkoutStackParamList = {
  progress: { id?: number } | undefined;
  finishDay: { id: number } | undefined;
  editProgramExercise: { programId: string; key: string; dayData: Required<IDayData>; fromWorkout?: boolean };
  muscles: undefined;
  exerciseStats: undefined;
};

export type IGraphsStackParamList = {
  graphsList: undefined;
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
  recentImports: undefined;
  importPreview: undefined;
  programs: undefined;
  programPreview: undefined;
  progress: { id?: number } | undefined;
  onerms: undefined;
  editProgram: { programId: string };
  editProgramExercise: { programId: string; key: string; dayData: Required<IDayData>; fromWorkout?: boolean };
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
  amrapModal: NonNullable<IHistoryRecord["amrapModal"]> &
    ({ context: "workout"; progressId: number } | { context: "playground"; weekIndex: number; dayIndex: number });
  exercisePickerModal: { progressId: number };
  editProgramExercisePickerModal: {
    context: "editProgram" | "editProgramExercise";
    programId: string;
    exerciseStateKey?: string;
    dayData: IShortDayData;
    change: "one" | "all" | "duplicate" | "variationAdd" | "variationEdit";
    variationIndex?: number;
    exerciseKey?: string;
  };
  editSetTargetModal:
    | { context: "workout"; progressId: number }
    | { context: "playground"; weekIndex: number; dayIndex: number };
  setTimerModal:
    | { context: "workout"; progressId: number }
    | { context: "playground"; weekIndex: number; dayIndex: number };
  setTimerEditModal:
    | { context: "workout"; progressId: number }
    | { context: "playground"; weekIndex: number; dayIndex: number };
  roundingInfoModal:
    | { context: "workout"; progressId: number }
    | { context: "playground"; weekIndex: number; dayIndex: number };
  dateModal: { progressId: number };
  equipmentModal: { context: "workout"; progressId: number } | { context: "preview"; programId: string };
  rm1Modal: { context: "workout"; progressId: number } | { context: "preview"; programId: string };
  supersetPickerModal: { progressId: number };
  playgroundEditModal:
    | { context: "playground"; weekIndex: number; dayIndex: number }
    | { context: "preview"; programId: string };
  couponModal: undefined;
  newGymModal: undefined;
  newEquipmentModal: undefined;
  newPlateModal: { equipment: IEquipment };
  newFixedWeightModal: { equipment: IEquipment };
  createProgramModal: { adhocProgressId?: number; adhocHistoryRecordId?: number } | undefined;
  importFromLinkModal: undefined;
  affiliateModal: undefined;
  importFromOtherAppsModal: undefined;
  dayFromAdhocModal: { progressId?: number; historyRecordId?: number };
  nextWorkoutModal: undefined;
  whatsnewModal: undefined;
  signupRequestModal: undefined;
  hearAboutUsModal: undefined;
  corruptedStateModal: undefined;
  debugModal: undefined;
  workoutShareModal: { progressId: number };
  socialShareModal: { type: "igstory" | "igfeed" | "tiktok"; progressId?: number; historyRecordId?: number };
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
  subscriptionInfoModal: { type: "platesCalculator" | "graphs" | "notifications" | "weekInsights" | "watch" | "mcp" };
  weekInsightsDetailsModal: { selectedFirstDayOfWeek: number };
  setSplitModal: {
    exercises: { exerciseName: string; isSynergist: boolean; strengthSets: number; hypertrophySets: number }[];
  };
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
  muscleGroupMusclePickerModal: { muscleGroup: IScreenMuscle };
  programPreviewMusclesModal: { type: "program" } | { type: "day"; dayIndex: number };
  exerciseImageSourceModal: undefined;
  exerciseImageLibraryModal: undefined;
  exerciseCloneLibraryModal: undefined;
  exerciseTypesPickerModal: undefined;
  exerciseMusclesPickerModal: undefined;
  exercisePickerSettingsModal: undefined;
  photoPickerModal: undefined;
  helpModal: { helpKey: IHelpKey };
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
