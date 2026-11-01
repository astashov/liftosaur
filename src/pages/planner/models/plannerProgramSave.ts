import { IFieldVersion } from "../../../models/versionTracker/types";
import { IPartialStorage, IProgram } from "../../../types";
import { FieldRevision_programPlanner } from "../../../utils/fieldRevision";

export function PlannerProgramSave_initialBase(
  storage: Pick<IPartialStorage, "_versions"> | undefined,
  program: Pick<IProgram, "clonedAt"> | undefined
): IFieldVersion | undefined {
  return FieldRevision_programPlanner(storage?._versions, program?.clonedAt);
}

export function PlannerProgramSave_baseAfterSave(
  base: IFieldVersion | undefined,
  saved: { plannerVersion?: IFieldVersion }
): IFieldVersion | undefined {
  return saved.plannerVersion ?? base;
}
