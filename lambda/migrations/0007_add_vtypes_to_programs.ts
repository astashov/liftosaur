/* eslint-disable @typescript-eslint/no-explicit-any */
// import { Utils } from "../utils";
import { IProgramPayload, programTableNames } from "../dao/programDao";
import { buildDi } from "../utils/di";
import { LogUtil } from "../utils/log";
import fetch from "node-fetch";
import { Utils } from "../utils";
import { IProgram } from "../../src/types";

async function main(): Promise<void> {
  const env = Utils.getEnv();
  const di = buildDi(new LogUtil(), fetch);
  const allProgramPayloads = await di.dynamo.scan<IProgramPayload>({ tableName: programTableNames[env].programs });
  for (const programPayload of allProgramPayloads) {
    const program = programPayload.program as IProgram;
    program.vtype = program.vtype || "program";
    if (program.planner) {
      program.planner.vtype = program.planner.vtype || "planner";
    }
  }
  await di.dynamo.batchPut({ tableName: programTableNames[env].programs, items: allProgramPayloads });
}

main();
