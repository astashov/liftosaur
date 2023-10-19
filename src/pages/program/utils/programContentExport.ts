import { getLatestMigrationVersion } from "../../../migrations/migrations";
import { IExportedProgram } from "../../../models/program";
import { equipments } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { IProgramEditorState } from "../models/types";

export namespace ProgramContentExport {
  export function generateExportedProgram(state: IProgramEditorState): IExportedProgram {
    const customEquipment = ObjectUtils.omit(state.settings.equipment, equipments);
    return {
      program: state.current.program,
      customExercises: state.settings.exercises,
      customEquipment: customEquipment,
      version: getLatestMigrationVersion(),
      settings: ObjectUtils.pick(state.settings, ["timers", "units"]),
    };
  }
}
