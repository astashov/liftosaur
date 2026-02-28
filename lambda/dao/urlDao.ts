import { UidFactory_generateUid } from "../../src/utils/generator";
import { StringUtils_hashString } from "../../src/utils/string";
import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";

const tableNames = {
  dev: {
    urls: "lftUrlsDev",
  },
  prod: {
    urls: "lftUrls",
  },
} as const;

export interface IUrlDao {
  id: string;
  url: string;
  userId?: string;
}

export class UrlDao {
  constructor(private readonly di: IDI) {}

  public async get(id: string): Promise<string | undefined> {
    const env = Utils_getEnv();
    const result = await this.di.dynamo.get<IUrlDao>({ tableName: tableNames[env].urls, key: { id } });
    return result?.url;
  }

  public async put(url: string, userId?: string): Promise<string> {
    const env = Utils_getEnv();
    let id = StringUtils_hashString(url);
    let item = await this.di.dynamo.get<IUrlDao>({ tableName: tableNames[env].urls, key: { id } });
    if (item?.url === url) {
      return id;
    } else if (item != null) {
      do {
        id = UidFactory_generateUid(8);
        item = await this.di.dynamo.get<IUrlDao>({ tableName: tableNames[env].urls, key: { id } });
      } while (item != null);
    }
    await this.di.dynamo.put({ tableName: tableNames[env].urls, item: { id, url, userId } });
    return id;
  }
}
