import { deflateSync, inflateSync } from "zlib";
import type { IPlannerProgram, IProgram } from "../../src/types";

// Dynamo rejects items over 400 KB; programs with long repeated comments compress 4-30x
// Never roll the lambda back past this commit: older builds read a packed row as a program with no planner
export const ProgramRow_PACK_THRESHOLD_BYTES = 200 * 1024;

export type IProgramRowItem = Omit<IProgram, "planner"> & {
  planner?: IPlannerProgram;
  pz?: Uint8Array;
};

export function ProgramRow_pack(program: IProgram): IProgramRowItem {
  if (program.planner == null || Buffer.byteLength(JSON.stringify(program)) <= ProgramRow_PACK_THRESHOLD_BYTES) {
    return program;
  }
  const { planner, ...rest } = program;
  return { ...rest, pz: deflateSync(Buffer.from(JSON.stringify(planner))) };
}

export function ProgramRow_unpack(item: IProgramRowItem): IProgram {
  const { pz, ...rest } = item;
  if (pz == null) {
    return rest;
  }
  const planner: IPlannerProgram = JSON.parse(inflateSync(Buffer.from(pz)).toString());
  return { ...rest, planner };
}
