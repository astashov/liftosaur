import { IProgram } from "../../src/types";
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
  program?: IProgram;
  error?: string[];
}

export class LogFreeformDao {
  constructor(private readonly di: IDI) {}

  public async put(
    id: string,
    type: string,
    request: string,
    response: string,
    opts: { program?: IProgram; error?: string[] }
  ): Promise<void> {
    const env = Utils.getEnv();
    const item: ILogFreeformDao = {
      id,
      type,
      request,
      response,
      program: opts.program,
      error: opts.error,
    };
    await this.di.dynamo.put({ tableName: logFreeformTableNames[env].logsFreeform, item });
  }

  public async get(id: string): Promise<ILogFreeformDao | undefined> {
    const env = Utils.getEnv();
    return this.di.dynamo.get<ILogFreeformDao>({ tableName: logFreeformTableNames[env].logsFreeform, key: { id } });
  }
}
