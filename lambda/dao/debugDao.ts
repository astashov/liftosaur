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
