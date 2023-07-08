import { Utils } from "../utils";
import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    debug: "lftDebugDev",
  },
  prod: {
    debug: "lftDebug",
  },
} as const;

export interface IDebugDao {
  id: string;
  state: string;
}

export class DebugDao {
  constructor(private readonly di: IDI) {}

  public async store(id: string, state: string): Promise<void> {
    const env = Utils.getEnv();
    const item: IDebugDao = { id, state };
    await this.di.dynamo.put({ tableName: tableNames[env].debug, item });
  }
}
