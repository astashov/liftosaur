// import { Utils } from "../utils";
import { CollectionUtils } from "../../src/utils/collection";
import { IProgramPayload, programTableNames } from "../dao/programDao";
import { buildDi } from "../utils/di";
import { LogUtil } from "../utils/log";

async function main(): Promise<void> {
  const env = "dev"; // Utils.getEnv();
  const di = buildDi(new LogUtil());
  const allProgramPayloads = await di.dynamo.scan<IProgramPayload>({ tableName: programTableNames[env].programs });
  for (const programPayload of allProgramPayloads) {
    for (const exercise of programPayload.program.exercises) {
      if (exercise.description != null) {
        exercise.descriptions = exercise.descriptions || [exercise.description];
      } else {
        exercise.descriptions = exercise.descriptions || [""];
      }
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
