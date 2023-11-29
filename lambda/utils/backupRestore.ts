import { buildDi } from "../utils/di";
import { LogUtil } from "../utils/log";
import * as csv from "csv-parse/sync";
import fs from "fs";
import { IHistoryRecord } from "../../src/types";
import { CollectionUtils } from "../../src/utils/collection";

async function main(): Promise<void> {
  const log = new LogUtil();
  const di = buildDi(log, fetch);
  console.log(di);
  const file = fs.readFileSync(process.argv[2], "utf8");
  const records = csv.parse(file, {
    columns: true,
    skip_empty_lines: true,
  });
  console.log(records[0]);
  const all = await di.dynamo.scan<IHistoryRecord & { userId: string }>({
    tableName: "lftHistoryRecords2",
  });
  const myUser = all.filter((r) => r.userId === "something");
  const result = await Promise.all(
    CollectionUtils.inGroupsOf(23, myUser).map((group) => {
      return di.dynamo.batchPut({
        tableName: "lftHistoryRecords",
        items: group,
      });
    })
  );
  console.log(result);
}

main();
