import type { JSX } from "react";
import { HelpAccount } from "./helpAccount";
import { HelpChooseProgram } from "./helpChooseProgram";
import { HelpChooseProgramFirstTime } from "./helpChooseProgramFirstTime";
import { HelpEditProgramDaysList } from "./helpEditProgramDaysList";
import { HelpEditProgramV2 } from "./helpEditProgramV2";
import { HelpExercises } from "./helpExercises";
import { HelpExerciseStats } from "./helpExerciseStats";
import { HelpGraphs } from "./helpGraphs";
import { HelpMeasurements } from "./helpMeasurements";
import { HelpMuscles } from "./helpMuscles";
import { HelpMusclesDay } from "./helpMusclesDay";
import { HelpPlates } from "./helpPlates";
import { HelpSettings } from "./helpSettings";
import { HelpStats } from "./helpStats";
import { HelpTimers } from "./helpTimers";
import { HelpWorkout } from "./helpWorkout";

export type IHelpKey =
  | "account"
  | "chooseProgram"
  | "chooseProgramFirstTime"
  | "editProgramDaysList"
  | "editProgramV2"
  | "exercises"
  | "exerciseStats"
  | "graphs"
  | "measurements"
  | "muscles"
  | "musclesDay"
  | "plates"
  | "settings"
  | "stats"
  | "timers"
  | "workout";

export const HelpComponents: Record<IHelpKey, () => JSX.Element> = {
  account: HelpAccount,
  chooseProgram: HelpChooseProgram,
  chooseProgramFirstTime: HelpChooseProgramFirstTime,
  editProgramDaysList: HelpEditProgramDaysList,
  editProgramV2: HelpEditProgramV2,
  exercises: HelpExercises,
  exerciseStats: HelpExerciseStats,
  graphs: HelpGraphs,
  measurements: HelpMeasurements,
  muscles: HelpMuscles,
  musclesDay: HelpMusclesDay,
  plates: HelpPlates,
  settings: HelpSettings,
  stats: HelpStats,
  timers: HelpTimers,
  workout: HelpWorkout,
};
