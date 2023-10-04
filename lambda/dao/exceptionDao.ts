import { Utils } from "../utils";
import { IDI } from "../utils/di";

const bucketNames = {
  dev: {
    exceptions: "liftosaurexceptionsdev",
  },
  prod: {
    exceptions: "liftosaurexceptions",
  },
} as const;

export interface IExceptionDao {
  id: string;
  data: string;
}

export class ExceptionDao {
  constructor(private readonly di: IDI) {}

  public async get(id: string): Promise<IExceptionDao | undefined> {
    const env = Utils.getEnv();
    const result = await this.di.s3.getObject({
      bucket: bucketNames[env].exceptions,
      key: `exceptions/${id}`,
    });
    if (result) {
      const data = result.toString();
      return { id, data };
    } else {
      return undefined;
    }
  }

  public async store(id: string, state: string): Promise<string> {
    const env = Utils.getEnv();
    await this.di.s3.putObject({
      bucket: bucketNames[env].exceptions,
      key: `exceptions/${id}`,
      body: state,
      opts: { contentType: "text/plain" },
    });
    return id;
  }
}
