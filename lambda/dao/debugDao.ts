import { Utils } from "../utils";
import { IDI } from "../utils/di";

const bucketNames = {
  dev: {
    debug: "liftosaurdebugsdev",
  },
  prod: {
    debug: "liftosaurdebugs",
  },
} as const;

export interface IDebugDao {
  id: string;
  state: string;
}

export class DebugDao {
  constructor(private readonly di: IDI) {}

  public async get(id: string): Promise<IDebugDao | undefined> {
    const env = Utils.getEnv();
    const result = await this.di.s3.getObject({
      bucket: bucketNames[env].debug,
      key: `debuginfo/${id}`,
    });
    if (result) {
      const state = result.toString();
      return { id, state };
    } else {
      return undefined;
    }
  }

  public async store(id: string, state: string): Promise<void> {
    const env = Utils.getEnv();
    await this.di.s3.putObject({
      bucket: bucketNames[env].debug,
      key: `debuginfo/${id}`,
      body: state,
      opts: { contentType: "text/plain" },
    });
  }
}
