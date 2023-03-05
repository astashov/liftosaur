import { IHistoryRecord } from "../../src/types";
import { Utils } from "../utils";
import { IDI } from "../utils/di";
import { userTableNames } from "./userDao";

export class HistoryRecordsDao {
  constructor(private readonly di: IDI) {}

  public async get(userId: string, id: number): Promise<IHistoryRecord | undefined> {
    const env = Utils.getEnv();
    return this.di.dynamo.get({ tableName: userTableNames[env].historyRecords, key: { userId, id } });
  }

  public async getAllAfter(timestamp: number): Promise<IHistoryRecord[]> {
    const env = Utils.getEnv();
    const result = await this.di.dynamo.query<IHistoryRecord>({
      tableName: userTableNames[env].historyRecords,
      expression: "#date > :date",
      attrs: { "#date": "date" },
      values: { ":date": timestamp },
    });
    return result;
  }
}
