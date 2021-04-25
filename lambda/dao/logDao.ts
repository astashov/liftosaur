import { Utils } from "../utils";
import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    logs: "lftLogsDev",
  },
  prod: {
    logs: "lftLogs",
  },
} as const;

export interface ILogDao {
  userId: string;
  action: string;
  cnt: number;
  ts: number;
}

export class LogDao {
  constructor(private readonly di: IDI) {}

  public async getAll(): Promise<ILogDao[]> {
    const env = Utils.getEnv();
    return this.di.dynamo.scan({ tableName: tableNames[env].logs });
  }

  public async increment(userId: string, action: string): Promise<void> {
    const env = Utils.getEnv();
    const item = await this.di.dynamo.get<ILogDao>({ tableName: tableNames[env].logs, key: { userId, action } });
    const count: number = item?.cnt || 0;
    await this.di.dynamo.update({
      tableName: tableNames[env].logs,
      key: { userId, action },
      expression: "SET ts = :timestamp, cnt = :cnt",
      values: { ":timestamp": Date.now(), ":cnt": count + 1 },
    });
  }
}
