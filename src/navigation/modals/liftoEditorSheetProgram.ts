import { Program_getProgram } from "../../models/program";
import type { IState } from "../../models/state";
import type { IProgram } from "../../types";

// From the program editor the source of truth is the unsaved draft in editProgramStates, not
// the last saved program — reading storage there would edit stale text and clobber the user's
// other pending edits on save. From a workout there is no draft to speak of.
export function LiftoEditorSheetProgram_resolve(
  state: IState,
  programId: string,
  isFromWorkout: boolean
): IProgram | undefined {
  const draft = !isFromWorkout ? state.editProgramStates[programId]?.current.program : undefined;
  return draft ?? Program_getProgram(state, programId);
}
