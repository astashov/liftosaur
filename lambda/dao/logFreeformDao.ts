import { UidFactory } from "../../src/utils/generator";
import { Utils } from "../utils";
import { IDI } from "../utils/di";

export const logFreeformTableNames = {
  dev: {
    logsFreeform: "lftLogsFreeformDev",
  },
  prod: {
    logsFreeform: "lftLogsFreeform",
  },
} as const;

export interface ILogFreeformDao {
  id: string;
  type: string;
  request: string;
  response: string;
}

export class LogFreeformDao {
  constructor(private readonly di: IDI) {}

  public async put(type: string, request: string, response: string): Promise<void> {
    const env = Utils.getEnv();
    const item: ILogFreeformDao = {
      id: UidFactory.generateUid(8),
      type,
      request,
      response,
    };
    await this.di.dynamo.put({ tableName: logFreeformTableNames[env].logsFreeform, item });
  }
}
