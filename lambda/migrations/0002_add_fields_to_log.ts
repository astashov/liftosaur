// import { Utils } from "../utils";
import { CollectionUtils } from "../../src/utils/collection";
import { ILogDao, logTableNames } from "../dao/logDao";
import { buildDi } from "../utils/di";
import { LogUtil } from "../utils/log";
import fetch from "node-fetch";

async function main(): Promise<void> {
  const env = "dev"; // Utils.getEnv();
  const di = buildDi(new LogUtil(), fetch);
  const allLogs = await di.dynamo.scan<ILogDao>({ tableName: logTableNames[env].logs });
  for (const log of allLogs) {
    log.affiliates = log.affiliates || {};
    log.platforms = log.platforms || [];
    log.subscriptions = log.subscriptions || [];
    log.month = new Date(log.ts).getUTCMonth();
    log.year = new Date(log.ts).getUTCFullYear();
    log.day = new Date(log.ts).getUTCDate();
  }
  for (const bigGroup of CollectionUtils.inGroupsOf(230, allLogs)) {
    await Promise.all(
      CollectionUtils.inGroupsOf(23, bigGroup).map((smallGroup) => {
        return di.dynamo.batchPut({ tableName: logTableNames[env].logs, items: smallGroup });
      })
    );
  }
}

main();
