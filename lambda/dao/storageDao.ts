import { IPartialStorage } from "../../src/types";
import { Utils } from "../utils";
import { IDI } from "../utils/di";
import { UidFactory } from "../utils/generator";
import { LftS3Buckets } from "./buckets";

const bucketNames = {
  dev: {
    storages: `${LftS3Buckets.storages}dev`,
  },
  prod: {
    storages: LftS3Buckets.storages,
  },
} as const;

export interface IStorageDao {
  id: string;
  userid: string;
  data: IPartialStorage;
}

export class StorageDao {
  constructor(private readonly di: IDI) {}

  public async get(userid: string, id: string): Promise<IStorageDao | undefined> {
    const env = Utils.getEnv();
    const result = await this.di.s3.getObject({
      bucket: bucketNames[env].storages,
      key: `storages/${userid}/${id}.json`,
    });
    if (result) {
      const data = result.toString();
      return { id, userid, data: JSON.parse(data) };
    } else {
      return undefined;
    }
  }

  public async store(userid: string, storage?: IPartialStorage): Promise<string | undefined> {
    if (!storage) {
      return undefined;
    }
    const env = Utils.getEnv();
    const id = UidFactory.generateUid(10);
    await this.di.s3.putObject({
      bucket: bucketNames[env].storages,
      key: `storages/${userid}/${id}.json`,
      body: JSON.stringify(storage),
      opts: { contentType: "application/json" },
    });
    return id;
  }
}
