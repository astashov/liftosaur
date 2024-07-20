import { getLatestMigrationVersion } from "../../../migrations/migrations";
import { IExportedProgram } from "../../../models/program";
import { ObjectUtils } from "../../../utils/object";
import { IProgramEditorState } from "../models/types";

export namespace ProgramContentExport {
  export function generateExportedProgram(state: IProgramEditorState): IExportedProgram {
    return {
      program: state.current.program,
      customExercises: state.settings.exercises,
      version: getLatestMigrationVersion(),
      settings: ObjectUtils.pick(state.settings, ["timers", "units", "planner"]),
    };
  }
}
