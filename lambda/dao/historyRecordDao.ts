import { IHistoryRecord } from "../../src/types";
import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { userTableNames } from "./userDao";

export class HistoryRecordsDao {
  constructor(private readonly di: IDI) {}

  public async get(userId: string, id: number): Promise<IHistoryRecord | undefined> {
    const env = Utils_getEnv();
    return this.di.dynamo.get({ tableName: userTableNames[env].historyRecords, key: { userId, id } });
  }
}
