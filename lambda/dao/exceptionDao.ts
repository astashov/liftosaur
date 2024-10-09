import { gunzip, gzip, strFromU8, strToU8 } from "fflate";
import { IStorage } from "../../src/types";
import { Utils } from "../utils";
import { IDI } from "../utils/di";
import { LftS3Buckets } from "./buckets";

const bucketNames = {
  dev: {
    exceptions: `${LftS3Buckets.exceptions}dev`,
  },
  prod: {
    exceptions: LftS3Buckets.exceptions,
  },
} as const;

export interface IExceptionDao {
  id: string;
  data: string;
}

export interface IDebugStorages {
  oldStorage: IStorage;
  newStorage: IStorage;
  mergedStorage: IStorage;
  prefix: string;
  userid: string;
  time: number;
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

  public async getStorages(key: string): Promise<IDebugStorages | undefined> {
    return new Promise(async (resolve) => {
      const env = Utils.getEnv();
      const [_, userid, dateStr] = key.split("/");
      const result = (await this.di.s3.getObject({
        bucket: bucketNames[env].exceptions,
        key,
      })) as Buffer;
      if (!result) {
        resolve(undefined);
      }
      gunzip((result as unknown) as Uint8Array, (err, data) => {
        if (err) {
          resolve(undefined);
        }
        const { prefix, oldStorage, newStorage, mergedStorage } = JSON.parse(strFromU8(data));
        resolve({ prefix, oldStorage, newStorage, mergedStorage, userid, time: parseInt(dateStr, 10) });
      });
    });
  }

  public async storeStorages(
    prefix: string,
    userid: string,
    oldStorage: IStorage,
    newStorage: IStorage,
    mergedStorage: IStorage
  ): Promise<void> {
    try {
      const key = await this._storeStorages(userid, prefix, oldStorage, newStorage, mergedStorage);
      if (key) {
        this.di.log.log(`Storagedebug: ${prefix}, stored storages: '${key}'`);
      } else {
        this.di.log.log(`Storagedebug: ${prefix}, couldn't compress storages for storing`);
      }
    } catch (e) {
      this.di.log.log(`Storagedebug: ${prefix} Got exception while trying to store storages`);
    }
  }

  private async _storeStorages(
    userid: string,
    prefix: string,
    oldStorage: IStorage,
    newStorage: IStorage,
    mergedStorage: IStorage
  ): Promise<string | undefined> {
    return new Promise((resolve) => {
      const env = Utils.getEnv();
      const date = Date.now();
      gzip(strToU8(JSON.stringify({ prefix, oldStorage, newStorage, mergedStorage })), async (err, body) => {
        if (err) {
          resolve(undefined);
        }
        const key = `storages/${userid}/${date}`;
        await this.di.s3.putObject({
          bucket: bucketNames[env].exceptions,
          key,
          body,
          opts: { contentType: "application/octet-stream" },
        });
        resolve(`storages/${userid}/${date}`);
      });
    });
  }
}
