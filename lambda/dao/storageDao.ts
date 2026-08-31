import { IPartialStorage, IStorage } from "../../src/types";
import { CollectionUtils_inGroupsOf } from "../../src/utils/collection";
import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { UidFactory_generateUid } from "../utils/generator";
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
    const env = Utils_getEnv();
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

  public async store(
    userid: string,
    storage: IPartialStorage | undefined,
    storageUpdateStorage: Partial<IStorage> | undefined
  ): Promise<string | undefined> {
    if (!storage) {
      return undefined;
    }
    if (
      storageUpdateStorage &&
      Object.keys(storageUpdateStorage).length === 1 &&
      storageUpdateStorage.progress != null
    ) {
      return undefined;
    }
    const env = Utils_getEnv();
    const id = UidFactory_generateUid(10);
    await this.di.s3.putObject({
      bucket: bucketNames[env].storages,
      key: `storages/${userid}/${id}.json`,
      body: JSON.stringify(storage),
      opts: { contentType: "application/json" },
    });
    return id;
  }

  public async removeAll(userid: string): Promise<void> {
    const env = Utils_getEnv();
    const bucket = bucketNames[env].storages;
    const keys = await this.di.s3.listObjects({ bucket, prefix: `storages/${userid}/` });
    for (const group of CollectionUtils_inGroupsOf(30, keys)) {
      await Promise.all(group.map((key) => this.di.s3.deleteObject({ bucket, key })));
    }
  }
}
