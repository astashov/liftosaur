/* eslint-disable @typescript-eslint/no-explicit-any */
// import { Utils } from "../utils";
import { CollectionUtils } from "../../src/utils/collection";
import { IProgramPayload, programTableNames } from "../dao/programDao";
import { buildDi } from "../utils/di";
import { UidFactory } from "../utils/generator";
import { LogUtil } from "../utils/log";
import fetch from "node-fetch";

async function main(): Promise<void> {
  const env = "dev"; // Utils.getEnv();
  const di = buildDi(new LogUtil(), fetch);
  const allProgramPayloads = await di.dynamo.scan<IProgramPayload>({ tableName: programTableNames[env].programs });
  for (const programPayload of allProgramPayloads) {
    const program = programPayload.program as any;
    program.isMultiweek = program.isMultiweek ?? false;
    program.weeks = program.weeks ?? [];
    for (const day of program.days) {
      day.id = day.id || UidFactory.generateUid(8);
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
