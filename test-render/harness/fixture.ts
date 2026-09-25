import { IState, buildState } from "../../src/models/state";
import { Storage_getDefault } from "../../src/models/storage";
import { Program_nextHistoryRecord } from "../../src/models/program";
import { Settings_build } from "../../src/models/settings";
import { Stats_getEmpty } from "../../src/models/stats";
import { basicBeginnerProgram } from "../../src/programs/basicBeginnerProgram";
import { tourConfigs } from "../../src/components/tour/tourConfigs";
import { Tour_stepHelpFlag } from "../../src/components/tour/tourTypes";
import { IHistoryRecord, IProgram } from "../../src/types";
import { EditProgram_initPlannerState } from "../../src/models/editProgram";

// A fixed clock, so a history fixture built at 23:59 does not straddle a day boundary and shift
// which week the calendar renders.
const FIXED_NOW = Date.parse("2026-09-24T12:00:00.000Z");

export interface IFixture {
  program?: IProgram;
  subscribed?: boolean;
  ongoingWorkout?: boolean;
  editingProgram?: boolean;
}

function seenEveryTour(): string[] {
  return Object.values(tourConfigs).flatMap((config) =>
    config.steps.map((step) => Tour_stepHelpFlag(config.id, step.id))
  );
}

export function Fixture_history(count: number, now: number = FIXED_NOW): IHistoryRecord[] {
  const base = Program_nextHistoryRecord(basicBeginnerProgram, Settings_build(), Stats_getEmpty(), 0);
  const day = 24 * 60 * 60 * 1000;
  return Array.from({ length: count }, (_, i) => ({
    ...base,
    id: 1000 + i,
    startTime: now - (i + 1) * day,
    endTime: now - (i + 1) * day + 3600000,
    date: new Date(now - (i + 1) * day).toISOString(),
  }));
}

export function Fixture_build(args: IFixture = {}): IState {
  const program = args.program ?? basicBeginnerProgram;
  const progress =
    args.ongoingWorkout === false ? [] : [Program_nextHistoryRecord(program, Settings_build(), Stats_getEmpty(), 0)];
  // Without the seen-tour helps and hearAboutUs.done, a first launch opens the hear-about-us modal
  // over the workout screen.
  const storage = {
    ...Storage_getDefault(),
    programs: [program],
    currentProgramId: program.id,
    progress,
    helps: seenEveryTour(),
    hearAboutUs: { done: true, requests: [] },
    subscription:
      args.subscribed === false
        ? { apple: [], google: [] }
        : { apple: [], google: [], key: "render-contract-test-key" },
  };
  const state = buildState({ storage, deviceId: "render-contract-device" });
  if (!args.editingProgram) {
    return state;
  }
  // What Program_editAction records before it navigates to the editProgram screen.
  return { ...state, editProgramStates: { [program.id]: EditProgram_initPlannerState(program.id, program) } };
}
