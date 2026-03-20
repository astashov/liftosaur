export type ITab = "home" | "program" | "workout" | "graphs" | "me";

export type IScreenName =
  | "main"
  | "first"
  | "settings"
  | "account"
  | "timers"
  | "plates"
  | "gyms"
  | "programs"
  | "progress"
  | "graphs"
  | "finishDay"
  | "muscles"
  | "muscleGroups"
  | "stats"
  | "units"
  | "appleHealth"
  | "googleHealth"
  | "editProgram"
  | "editProgramExercise"
  | "measurements"
  | "subscription"
  | "exerciseStats"
  | "exercises"
  | "onerms"
  | "setupequipment"
  | "setupplates"
  | "programselect"
  | "programPreview"
  | "apiKeys";

export const screenToTab: Record<IScreenName, ITab> = {
  main: "home",
  first: "program",
  settings: "me",
  account: "me",
  timers: "me",
  plates: "me",
  gyms: "me",
  programs: "program",
  progress: "workout",
  graphs: "graphs",
  finishDay: "workout",
  muscles: "program",
  muscleGroups: "me",
  stats: "me",
  units: "program",
  appleHealth: "me",
  googleHealth: "me",
  editProgram: "program",
  editProgramExercise: "program",
  measurements: "me",
  subscription: "workout",
  exerciseStats: "me",
  exercises: "me",
  onerms: "program",
  setupequipment: "program",
  setupplates: "program",
  programselect: "program",
  programPreview: "program",
  apiKeys: "me",
};

export const tabInitialScreen: Record<ITab, IScreenName> = {
  home: "main",
  program: "programs",
  workout: "progress",
  graphs: "graphs",
  me: "settings",
};

const screensWithoutTabBar: Set<IScreenName> = new Set([
  "first",
  "units",
  "subscription",
  "finishDay",
  "programselect",
  "setupequipment",
  "setupplates",
  "editProgram",
  "editProgramExercise",
  "progress",
]);

export function ScreenMap_hasTabBar(screen: IScreenName): boolean {
  return !screensWithoutTabBar.has(screen);
}

export const allScreens: IScreenName[] = [
  "main",
  "first",
  "settings",
  "account",
  "timers",
  "plates",
  "gyms",
  "programs",
  "progress",
  "graphs",
  "finishDay",
  "muscles",
  "muscleGroups",
  "stats",
  "units",
  "appleHealth",
  "googleHealth",
  "editProgram",
  "editProgramExercise",
  "measurements",
  "subscription",
  "exerciseStats",
  "exercises",
  "onerms",
  "setupequipment",
  "setupplates",
  "programselect",
  "programPreview",
  "apiKeys",
];

export function ScreenMap_tabScreens(tab: ITab): IScreenName[] {
  const initial = tabInitialScreen[tab];
  return [initial, ...allScreens.filter((s) => s !== initial)];
}
