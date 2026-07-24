import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { UidFactory_generateUid } from "../utils/generator";

export const freeUsersTableNames = {
  dev: {
    freeUsers: "lftFreeUsersDev",
  },
  prod: {
    freeUsers: "lftFreeUsers",
  },
} as const;

export interface IFreeUserDao {
  id: string;
  key: string;
  isClaimed: boolean;
  expires: number;
  coupon?: string;
}

export class FreeUserDao {
  constructor(private readonly di: IDI) {}

  public async get(id: string): Promise<IFreeUserDao | undefined> {
    const env = Utils_getEnv();
    return this.di.dynamo.get<IFreeUserDao>({
      tableName: freeUsersTableNames[env].freeUsers,
      key: { id },
    });
  }

  public async getAll(ids: string[]): Promise<IFreeUserDao[]> {
    const env = Utils_getEnv();
    return this.di.dynamo.batchGet<IFreeUserDao>({
      tableName: freeUsersTableNames[env].freeUsers,
      keys: ids.map((id) => ({ id })),
    });
  }

  public async claim(id: string): Promise<{ key: string; expires: number } | undefined> {
    const env = Utils_getEnv();
    const freeUser = await this.get(id);
    if (freeUser) {
      freeUser.isClaimed = true;
      await this.di.dynamo.put({
        tableName: freeUsersTableNames[env].freeUsers,
        item: freeUser,
      });
      return { key: freeUser.key, expires: freeUser.expires };
    }
    return undefined;
  }

  public async getKey(id: string): Promise<{ key: string; isClaimed: boolean } | undefined> {
    const freeUser = await this.get(id);
    if (freeUser?.key && freeUser?.expires > Date.now()) {
      return { key: freeUser.key, isClaimed: freeUser.isClaimed };
    }
    return undefined;
  }

  public async verifyKey(id: string): Promise<string | undefined> {
    const freeUser = await this.get(id);
    if (freeUser?.key && freeUser?.expires > Date.now() && freeUser?.isClaimed) {
      return freeUser.key;
    }
    return undefined;
  }

  public async create(id: string, expires: number, isClaimed: boolean, coupon?: string): Promise<IFreeUserDao> {
    const env = Utils_getEnv();
    const freeUser: IFreeUserDao = {
      id,
      expires,
      isClaimed,
      key: `key-${UidFactory_generateUid(6)}`,
      coupon,
    };
    await this.di.dynamo.put({
      tableName: freeUsersTableNames[env].freeUsers,
      item: freeUser,
    });
    return freeUser;
  }
}
