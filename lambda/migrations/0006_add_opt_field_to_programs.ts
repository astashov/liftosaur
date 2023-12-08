/* eslint-disable @typescript-eslint/no-explicit-any */
// import { Utils } from "../utils";
import { CollectionUtils } from "../../src/utils/collection";
import { IProgramPayload, programTableNames } from "../dao/programDao";
import { buildDi } from "../utils/di";
import { LogUtil } from "../utils/log";
import fetch from "node-fetch";
import { Utils } from "../utils";

async function main(): Promise<void> {
  const env = Utils.getEnv();
  const di = buildDi(new LogUtil(), fetch);
  const allProgramPayloads = await di.dynamo.scan<IProgramPayload>({ tableName: programTableNames[env].programs });
  for (const programPayload of allProgramPayloads) {
    const program = programPayload.program as any;
    program.deletedDays = program.deletedDays || [];
    program.deletedWeeks = program.deletedExercises || [];
    program.deletedExercises = program.deletedExercises || [];

    for (const exercise of program.exercises) {
      exercise.stateMetadata = exercise.stateMetadata || {};
      exercise.reuseLogic = exercise.reuseLogic || { selected: undefined, states: {} };
    }
  }
  for (const bigGroup of CollectionUtils.inGroupsOf(230, allProgramPayloads)) {
    await Promise.all(
      CollectionUtils.inGroupsOf(23, bigGroup).map((smallGroup) => {
        return di.dynamo.batchPut({ tableName: programTableNames[env].programs, items: smallGroup });
      })
    );
  }
}

main();
