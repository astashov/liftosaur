/* eslint-disable @typescript-eslint/no-explicit-any */
// import { Utils } from "../utils";
import { CollectionUtils } from "../../src/utils/collection";
import { IProgramPayload, programTableNames } from "../dao/programDao";
import { buildDi } from "../utils/di";
import { UidFactory } from "../utils/generator";
import { LogUtil } from "../utils/log";
import fetch from "node-fetch";
import { ObjectUtils } from "../../src/utils/object";
import { Utils } from "../utils";

async function main(): Promise<void> {
  const env = Utils.getEnv();
  const di = buildDi(new LogUtil(), fetch);
  const allProgramPayloads = await di.dynamo.scan<IProgramPayload>({ tableName: programTableNames[env].programs });
  for (const programPayload of allProgramPayloads) {
    const program = programPayload.program;
    const groupByIdWeeks = CollectionUtils.groupByKey(program.weeks, "id");
    const hasDuplicatedIds = ObjectUtils.values(groupByIdWeeks).some((v) => (v?.length || 0) > 1);
    if (hasDuplicatedIds) {
      for (const week of program.weeks) {
        week.id = UidFactory.generateUid(8);
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
