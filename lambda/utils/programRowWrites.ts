import { IProgram } from "../../src/types";

export interface IProgramRowWrites {
  idsToDelete: string[];
  programsToPut: IProgram[];
}

export function ProgramRowWrites_plan(
  storedPrograms: IProgram[],
  mergedPrograms: IProgram[],
  tombstonedClonedAts: number[]
): IProgramRowWrites {
  const programsToPut = mergedPrograms.filter(
    (p) => p.clonedAt == null || tombstonedClonedAts.indexOf(p.clonedAt) === -1
  );
  const putIds = new Set(programsToPut.map((p) => p.id));
  const idsToDelete = storedPrograms
    .filter((p) => p.clonedAt != null && tombstonedClonedAts.indexOf(p.clonedAt) !== -1)
    .map((p) => p.id)
    .filter((id) => !putIds.has(id));
  return { idsToDelete, programsToPut };
}
