import { DateUtils } from "../../src/utils/date";
import { Utils } from "../utils";
import { IDI } from "../utils/di";
import { LftS3Buckets } from "./buckets";

const bucketNames = {
  dev: {
    debug: `${LftS3Buckets.debugs}dev`,
  },
  prod: {
    debug: LftS3Buckets.debugs,
  },
} as const;

export interface IDebugDao {
  id: string;
  data: string;
}

export class DebugDao {
  constructor(private readonly di: IDI) {}

  public async list(id: string): Promise<string[] | undefined> {
    const env = Utils.getEnv();
    const result = await this.di.s3.listObjects({
      bucket: bucketNames[env].debug,
      prefix: `debuginfo/${id}`,
    });
    if (result) {
      return result.map((str) => str.replace(`debuginfo/${id}/`, ""));
    } else {
      return undefined;
    }
  }

  public async get(id: string, date: string): Promise<IDebugDao | undefined> {
    const env = Utils.getEnv();
    const result = await this.di.s3.getObject({
      bucket: bucketNames[env].debug,
      key: `debuginfo/${id}/${date}`,
    });
    if (result) {
      const data = result.toString();
      return { id, data };
    } else {
      return undefined;
    }
  }

  public async store(id: string, state: string): Promise<void> {
    const env = Utils.getEnv();
    await this.di.s3.putObject({
      bucket: bucketNames[env].debug,
      key: `debuginfo/${id}/${DateUtils.formatYYYYMMDDHHMM(Date.now())}`,
      body: state,
      opts: { contentType: "text/plain" },
    });
  }
}
